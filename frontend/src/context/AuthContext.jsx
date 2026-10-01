import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  clearAuthToken,
  getAuthToken,
  loginUser,
  registerUser,
  setAuthToken,
  verifyToken,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // On first load, re-validate any previously stored token against
  // auth-service rather than trusting it blindly.
  useEffect(() => {
    const stored = getAuthToken();
    if (!stored) {
      setInitializing(false);
      return;
    }
    verifyToken()
      .then((data) => {
        setToken(stored);
        setEmail(data.email);
      })
      .catch(() => {
        clearAuthToken();
        setToken(null);
        setEmail(null);
      })
      .finally(() => setInitializing(false));
  }, []);

  const login = useCallback(async (emailInput, password) => {
    const data = await loginUser(emailInput, password);

    // Strict overwrite: write the freshly issued token as the only token
    // in storage, then replace React state from scratch. useState setters
    // always replace (never merge) the previous value, so there is no way
    // for a stale token/email pair from a prior session to survive this.
    setAuthToken(data.access_token);
    setToken(data.access_token);
    setEmail(emailInput);
    return data;
  }, []);

  const register = useCallback(
    async (emailInput, password) => {
      await registerUser(emailInput, password);
      return login(emailInput, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    // Hard logout: clear storage, clear React state, then force a full
    // page reload back to the root route. The reload guarantees that any
    // component state left over from the previous session (dashboard
    // data, open modals, in-flight requests, etc.) is thrown away rather
    // than relying solely on conditional rendering to hide it.
    clearAuthToken();
    setToken(null);
    setEmail(null);
    window.location.assign("/");
  }, []);

  return (
    <AuthContext.Provider value={{ token, email, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
