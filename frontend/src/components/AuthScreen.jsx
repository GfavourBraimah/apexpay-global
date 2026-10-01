import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, UserRound, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Local-development convenience only: these demo accounts are seeded by
// scripts/seed.sql with a known password so reviewers can explore the
// dashboard without registering a new user first. Never ship hardcoded
// credentials like this in a production build.
const DEMO_PASSWORD = "ApexDemo123!";
const DEMO_ACCOUNTS = [
  { label: "Quick Login as Alice", email: "alice@apexpay.com" },
  { label: "Quick Login as Bob", email: "bob@apexpay.com" },
];

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(null);
  const [error, setError] = useState("");

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(demoEmail) {
    setError("");
    setLoadingDemo(demoEmail);
    try {
      await login(demoEmail, DEMO_PASSWORD);
    } catch (err) {
      setError(err.message || "Could not log in with the demo account.");
    } finally {
      setLoadingDemo(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B1F3A] via-[#122A4D] to-[#1B3A66] px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-semibold tracking-tight">ApexPay Global</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-slate-100">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                mode === "login"
                  ? "text-[#0B1F3A] border-b-2 border-[#0B1F3A]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "text-[#0B1F3A] border-b-2 border-[#0B1F3A]"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@apexpay.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]/20 focus:border-[#0B1F3A] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={mode === "register" ? 8 : undefined}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A]/20 focus:border-[#0B1F3A] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "register" && (
                <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B1F3A] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#132d52] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>

          <div className="px-8 pb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-400">Demo accounts</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email)}
                  disabled={loadingDemo !== null}
                  className="flex items-center justify-center gap-1.5 border border-slate-200 rounded-lg py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-60"
                >
                  {loadingDemo === account.email ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserRound className="w-3.5 h-3.5" />
                  )}
                  {account.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[11px] text-slate-400">
              Seeded local-development accounts. Not for production use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
