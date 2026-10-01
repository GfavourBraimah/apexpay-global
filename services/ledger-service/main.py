"""
ApexPay Global - Ledger Service

The core financial transfer engine. Responsibilities:
  - Balance lookups for the authenticated user
  - Atomic peer-to-peer transfers between users
  - Transaction history

Shares the `users` and `audit_transactions` tables (schema defined in
scripts/seed.sql) with auth-service. Trusts JWTs issued by auth-service
(same JWT_SECRET / algorithm) rather than re-implementing login.

DevSecOps hardening:
  - slowapi rate limiting on the transfer endpoint (10 requests/min/IP)
  - Strict security response headers (CSP, X-Frame-Options, etc.)
"""
import logging
import os
import traceback
from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional

import jwt
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

logger = logging.getLogger("ledger-service")
logging.basicConfig(level=logging.INFO)

# =========================================================
# Configuration
# =========================================================

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL environment variable is not set. "
        "Set it in your .env file (see .env.example) or in the "
        "environment of whatever is running this service."
    )

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "JWT_SECRET environment variable is not set. "
        "Set it in your .env file (see .env.example) or in the "
        "environment of whatever is running this service. There is no "
        "hardcoded fallback secret — this must match auth-service's "
        "JWT_SECRET exactly, since this service only verifies tokens "
        "that auth-service issued."
    )

# Use `or` rather than os.getenv's built-in default: Docker Compose passes
# unset variables through as an empty string (with a warning) rather than
# omitting them entirely, and os.getenv("X", default) only falls back to
# `default` when the key is truly absent — not when it's set to "". The
# `or` form treats both "absent" and "blank" as "use the default".
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM") or "HS256"

ALLOWED_ORIGINS = [
    "http://localhost:3000",
]

HISTORY_LIMIT = 10

# =========================================================
# Database setup
# =========================================================

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    """Mirrors the `users` table created in scripts/seed.sql."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    balance = Column(Numeric(15, 2), nullable=False, default=0.00)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AuditTransaction(Base):
    """Mirrors the `audit_transactions` table created in scripts/seed.sql."""

    __tablename__ = "audit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    balance_after = Column(Numeric(15, 2), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================================================
# Security helpers (trusts tokens issued by auth-service)
# =========================================================

bearer_scheme = HTTPBearer(auto_error=False)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def get_current_token_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> dict:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(credentials.credentials)
    if "user_id" not in payload or "email" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token payload",
        )
    return payload


def get_current_user(
    token_payload: dict = Depends(get_current_token_payload),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.id == token_payload["user_id"]).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists",
        )
    return user


# =========================================================
# Schemas
# =========================================================

class BalanceResponse(BaseModel):
    user_id: int
    email: EmailStr
    balance: float


class TransferRequest(BaseModel):
    recipient_email: EmailStr
    amount: float = Field(gt=0, description="Must be a positive amount")
    description: Optional[str] = Field(default=None, max_length=500)


class TransferResponse(BaseModel):
    status: str
    sender_email: EmailStr
    recipient_email: EmailStr
    amount: float
    sender_balance: float
    description: Optional[str] = None


class TransactionResponse(BaseModel):
    id: int
    transaction_type: str
    amount: float
    balance_after: float
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    user_id: int
    transactions: List[TransactionResponse]


# =========================================================
# App setup
# =========================================================

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="ApexPay Ledger Service")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """
    Attaches a strict baseline of security headers to every response.
    This is an API-only service (no HTML is rendered here), so the CSP
    is locked down to "default-src 'none'" rather than tuned for
    scripts/styles/images.
    """
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


@app.on_event("startup")
def on_startup():
    # Safe to call even if scripts/seed.sql already created the tables;
    # create_all only creates tables that don't exist yet.
    Base.metadata.create_all(bind=engine, checkfirst=True)


# =========================================================
# Internal helpers
# =========================================================

def _lock_two_users_by_id(db: Session, id_a: int, id_b: int) -> dict:
    """
    Row-locks both user records (SELECT ... FOR UPDATE) in a deterministic
    ascending-id order. Locking in a consistent order regardless of who is
    sender/recipient prevents deadlocks between two concurrent, opposite
    -direction transfers (A->B and B->A).

    Returns a dict keyed by user id -> locked User row.
    """
    locked: dict = {}
    for uid in sorted({id_a, id_b}):
        user = db.query(User).filter(User.id == uid).with_for_update().one_or_none()
        if user is not None:
            locked[uid] = user
    return locked


# =========================================================
# Routes
# =========================================================

@app.get("/healthz")
def healthz():
    return {"status": "healthy", "service": "ledger-service"}


@app.get("/api/ledger/balance", response_model=BalanceResponse)
def get_balance(current_user: User = Depends(get_current_user)):
    return BalanceResponse(
        user_id=current_user.id,
        email=current_user.email,
        balance=float(current_user.balance),
    )


@app.post("/api/ledger/transfer", response_model=TransferResponse)
@limiter.limit("10/minute")
def transfer(
    request: Request,
    payload: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.recipient_email.lower() == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer funds to yourself",
        )

    # Look up the recipient's id first (unlocked) so we know which rows to lock.
    recipient_stub = (
        db.query(User.id).filter(User.email == payload.recipient_email).first()
    )
    if recipient_stub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found",
        )
    recipient_id = recipient_stub[0]

    # payload.amount is a plain Python float (Pydantic), but balance columns
    # are Numeric -> Decimal on the ORM side. Mixing Decimal and float in
    # arithmetic raises TypeError, so normalize to Decimal up front via the
    # string representation (avoids binary float rounding artifacts).
    amount = Decimal(str(payload.amount))

    try:
        locked_users = _lock_two_users_by_id(db, current_user.id, recipient_id)
        sender = locked_users[current_user.id]
        recipient = locked_users[recipient_id]

        if sender.balance < amount:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient Funds",
            )

        # Deduct from sender, credit recipient.
        sender.balance = sender.balance - amount
        recipient.balance = recipient.balance + amount

        db.add_all(
            [
                AuditTransaction(
                    user_id=sender.id,
                    transaction_type="TRANSFER_OUT",
                    amount=amount,
                    balance_after=sender.balance,
                    description=payload.description
                    or f"Transfer to {recipient.email}",
                ),
                AuditTransaction(
                    user_id=recipient.id,
                    transaction_type="TRANSFER_IN",
                    amount=amount,
                    balance_after=recipient.balance,
                    description=payload.description
                    or f"Transfer from {sender.email}",
                ),
            ]
        )

        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        # Log the full exception server-side so it never gets silently
        # swallowed, then surface the stringified error to the caller as a
        # 400 so the frontend can display what actually went wrong.
        logger.error("Transfer failed: %s", e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    db.refresh(sender)

    return TransferResponse(
        status="success",
        sender_email=sender.email,
        recipient_email=recipient.email,
        amount=payload.amount,
        sender_balance=float(sender.balance),
        description=payload.description,
    )


@app.get("/api/ledger/history", response_model=HistoryResponse)
def get_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transactions = (
        db.query(AuditTransaction)
        .filter(AuditTransaction.user_id == current_user.id)
        .order_by(AuditTransaction.created_at.desc())
        .limit(HISTORY_LIMIT)
        .all()
    )
    return HistoryResponse(
        user_id=current_user.id,
        transactions=[
            TransactionResponse(
                id=t.id,
                transaction_type=t.transaction_type,
                amount=float(t.amount),
                balance_after=float(t.balance_after),
                description=t.description,
                created_at=t.created_at,
            )
            for t in transactions
        ],
    )


@app.get("/")
def root():
    return {"message": "ApexPay Ledger Service is running"}
