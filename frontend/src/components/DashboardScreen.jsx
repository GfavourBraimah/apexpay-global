import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getBalance, getHistory } from "../api/client";
import Navbar from "./Navbar";
import AccountCard from "./AccountCard";
import SendPaymentModal from "./SendPaymentModal";
import TransactionHistoryTable from "./TransactionHistoryTable";

export default function DashboardScreen() {
  const { email } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', message }

  // getBalance()/getHistory() read the auth token directly from
  // localStorage on every call (see api/client.js), so this never needs
  // to be passed a token explicitly.
  const refresh = useCallback(async () => {
    setError("");
    try {
      const [balanceData, historyData] = await Promise.all([getBalance(), getHistory()]);
      setBalance(balanceData.balance);
      setTransactions(historyData.transactions);
    } catch (err) {
      setError(err.message || "Could not load account data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleTransferSuccess(result) {
    setModalOpen(false);
    setNotice({
      type: "success",
      message: `Sent $${result.amount.toFixed(2)} to ${result.recipient_email}.`,
    });
    await refresh();
    setTimeout(() => setNotice(null), 5000);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {notice && (
          <div
            role="status"
            className={`rounded-lg px-4 py-3 text-sm ${
              notice.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-red-50 text-red-700 border border-red-100"
            }`}
          >
            {notice.message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-100"
          >
            {error}
          </div>
        )}

        <AccountCard
          email={email}
          balance={balance}
          loading={loading}
          onSendPayment={() => setModalOpen(true)}
        />

        <TransactionHistoryTable transactions={transactions} loading={loading} />
      </main>

      {isModalOpen && (
        <SendPaymentModal
          onClose={() => setModalOpen(false)}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
