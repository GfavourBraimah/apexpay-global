import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import StatusPill from "./StatusPill";

const CREDIT_TYPES = new Set(["TRANSFER_IN", "INITIAL_DEPOSIT"]);

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Math.abs(amount)
  );
}

function formatTimestamp(value) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function TransactionHistoryTable({ transactions, loading }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-800">Recent Transactions</h2>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-10 flex flex-col items-center text-center text-slate-400">
          <Receipt className="w-8 h-8 mb-2" />
          <p className="text-sm">No transactions yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) => {
                const credit = CREDIT_TYPES.has(tx.transaction_type);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatTimestamp(tx.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            credit ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                          }`}
                        >
                          {credit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-slate-700">
                          {tx.description || tx.transaction_type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusPill>Completed</StatusPill>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-medium whitespace-nowrap ${
                        credit ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {credit ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
