import { LogOut, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { email, logout } = useAuth();

  function handleLogout() {
    // logout() clears localStorage, resets AuthContext state to null, and
    // forces a hard redirect back to the Auth/Login screen.
    logout();
  }

  return (
    <header className="bg-[#0B1F3A] text-white">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-semibold tracking-tight">ApexPay Global</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">{email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
