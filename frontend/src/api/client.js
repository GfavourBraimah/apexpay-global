/**
 * ApexPay Global - API client
 *
 * Thin fetch wrapper around auth-service and ledger-service.
 * Base URLs are read from Vite environment variables so the same
 * build can target different environments; both fall back to the
 * default local-development ports (8001 / 8002).
 *
 * Session handling:
 * localStorage is the single source of truth for the auth token. Every
 * authenticated request reads the token fresh from localStorage at call
 * time (see `request()` below) instead of being handed a token that was
 * captured earlier in a render or closure. This guarantees that logging
 * out, logging in as a different user, or reloading the page can never
 * leave an in-flight or subsequent request using a stale/previous
 * session's token.
 */

const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "http://localhost:8001";
const LEDGER_API_URL = import.meta.env.VITE_LEDGER_API_URL || "http://localhost:8002";

export const TOKEN_STORAGE_KEY = "apexpay_token";

// --- Token storage helpers -----------------------------------------------

export function getAuthToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token) {
  // Strictly overwrite: clear whatever was there first, then write the new
  // token, so a previous session's token can never linger alongside (or
  // instead of) the one that was just issued.
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

// --- Core request helper ---------------------------------------------------

async function request(url, options = {}, { authenticated = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (authenticated) {
    // Re-read on every call — this is the "interceptor" behavior: the
    // token is never cached in a module-level variable or closed over
    // from an earlier render.
    const token = getAuthToken();
    if (!token) {
      throw new Error("Not authenticated. Please log in again.");
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Response had no JSON body (e.g. 204) — leave data as null.
  }

  if (!response.ok) {
    const detail = data && (data.detail || data.message);
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
      : detail || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

// --- Auth Service -------------------------------------------------------

export function registerUser(email, password) {
  return request(`${AUTH_API_URL}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser(email, password) {
  return request(`${AUTH_API_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function verifyToken() {
  return request(`${AUTH_API_URL}/api/auth/verify`, {}, { authenticated: true });
}

// --- Ledger Service -------------------------------------------------------

export function getBalance() {
  return request(`${LEDGER_API_URL}/api/ledger/balance`, {}, { authenticated: true });
}

export function transferFunds(recipientEmail, amount, description) {
  return request(
    `${LEDGER_API_URL}/api/ledger/transfer`,
    {
      method: "POST",
      body: JSON.stringify({
        recipient_email: recipientEmail,
        amount,
        description,
      }),
    },
    { authenticated: true }
  );
}

export function getHistory() {
  return request(`${LEDGER_API_URL}/api/ledger/history`, {}, { authenticated: true });
}
