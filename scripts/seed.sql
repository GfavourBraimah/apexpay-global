-- ApexPay Global — Local Database Seed
-- Mounted into the Postgres container via docker-entrypoint-initdb.d
-- Runs ONLY on first container initialization (empty pgdata volume).

-- =========================================================
-- Schema
-- =========================================================

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    balance        NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_transactions (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type  VARCHAR(50) NOT NULL,
    amount            NUMERIC(15, 2) NOT NULL,
    balance_after     NUMERIC(15, 2) NOT NULL,
    description       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_transactions_user_id ON audit_transactions(user_id);

-- =========================================================
-- Test Users
-- NOTE: password_hash values below are real bcrypt hashes for the
-- shared local-development password "ApexDemo123!". This is
-- intentional so the frontend's "Quick Login as Alice/Bob" buttons
-- work out of the box. Never reuse this password or these hashes
-- outside a local dev environment.
-- =========================================================

INSERT INTO users (email, password_hash, balance) VALUES
    ('alice@apexpay.com', '$2b$10$z5fX9yGLe7gR83fVZY1QaOwDgR1CAlmp.CZEjatdl7PiMBdxesQdC', 5000.00),
    ('bob@apexpay.com',   '$2b$10$F58VVfpX5PjtSNME9B9GDedUFhGkYd2AAo2tYRuOn9vHh5gEk/RCW', 1500.00)
ON CONFLICT (email) DO NOTHING;

-- =========================================================
-- Audit trail for the initial seed balances
-- =========================================================

INSERT INTO audit_transactions (user_id, transaction_type, amount, balance_after, description)
SELECT id, 'INITIAL_DEPOSIT', balance, balance, 'Seed data initial balance'
FROM users
WHERE email IN ('alice@apexpay.com', 'bob@apexpay.com');
