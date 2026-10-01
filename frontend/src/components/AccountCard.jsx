import { Send } from "lucide-react";

function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function AccountCard({ email, balance, loading, onSendPayment }) {
  const initials = email ? email[0].toUpperCase() : "A";

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0B1F3A] to-[#1B3A66] text-white p-6 sm:p-8 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300 mb-1">
            ApexPay Checking
          </p>
          <p className="text-sm text-slate-300">{email}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold">
          {initials}
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs text-slate-300 mb-1">Available balance</p>
        {loading ? (
          <div className="h-10 w-40 bg-white/10 rounded-md animate-pulse" />
        ) : (
          <p className="text-3xl sm:text-4xl font-semibold tracking-tight">
            {formatCurrency(balance)}{" "}
            <span className="text-lg font-normal text-slate-300">USD</span>
          </p>
        )}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onSendPayment}
          className="inline-flex items-center gap-2 bg-white text-[#0B1F3A] rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-slate-100 transition"
        >
          <Send className="w-4 h-4" />
          Send Payment
        </button>
      </div>
    </div>
  );
}
