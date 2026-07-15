import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { ArrowUpCircle, ArrowDownCircle, Download, Search, FileDown, CalendarRange } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { exportTransactionsPDF, exportMonthlyReportPDF } from "../utils/pdfExport";
import { showToast } from "../redux/slices/uiSlice";
import FullPageLoader from "../components/FullPageLoader";
import api from "../services/api";

function downloadCSV(rows) {
  const header = ["Type", "Stock", "Company", "Quantity", "Price", "Total", "Date"];
  const lines = rows.map((tx) => [
    tx.type,
    tx.stockId?.symbol || "",
    (tx.stockId?.companyName || "").replace(/,/g, " "),
    tx.quantity,
    tx.price,
    tx.totalAmount,
    new Date(tx.transactionDate).toISOString().slice(0, 10),
  ]);
  const csv = [header, ...lines].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sb-stocks-transactions-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Transactions() {
  const dispatch = useDispatch();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get("/transactions", { params: { type: type || undefined } })
      .then(({ data }) => setTransactions(data.transactions))
      .finally(() => setLoading(false));
  }, [type]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) => tx.stockId?.symbol?.toLowerCase().includes(q) || tx.stockId?.companyName?.toLowerCase().includes(q)
    );
  }, [transactions, query]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold mb-1">
            Transactions
          </motion.h1>
          <p className="text-mute">Every buy and sell you've made, in one place.</p>
        </div>
        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-2 self-start">
            <button
              onClick={() => downloadCSV(filtered)}
              className="btn-ghost inline-flex items-center gap-1.5 text-sm"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={() => exportTransactionsPDF(filtered).catch(() =>
                dispatch(showToast({ type: "error", message: "Couldn't generate the PDF. Try again in a moment." }))
              )}
              className="btn-ghost inline-flex items-center gap-1.5 text-sm"
            >
              <FileDown size={14} /> Export PDF
            </button>
            <button
              onClick={() => exportMonthlyReportPDF(transactions).catch(() =>
                dispatch(showToast({ type: "error", message: "Couldn't generate the PDF. Try again in a moment." }))
              )}
              className="btn-ghost inline-flex items-center gap-1.5 text-sm"
            >
              <CalendarRange size={14} /> Monthly report
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-2">
          {["", "BUY", "SELL"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                type === t ? "bg-mint/10 text-mint border border-mint/30" : "text-mute border border-line hover:text-ice"
              }`}
            >
              {t || "All"}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by stock..."
            className="bg-panel2 border border-line rounded-lg pl-8 pr-3 py-2 text-sm w-48 focus:outline-none focus:border-mint transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <FullPageLoader label="Fetching transaction history" />
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-mute">No transactions match this filter yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-mute border-b border-line">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Stock</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, i) => (
                <motion.tr
                  key={tx._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-line/50 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <span className={`flex items-center gap-1 ${tx.type === "BUY" ? "text-mint" : "text-rose"}`}>
                      {tx.type === "BUY" ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-medium">{tx.stockId?.symbol}</td>
                  <td className="py-3 pr-4 mono-num">{tx.quantity}</td>
                  <td className="py-3 pr-4 mono-num">{formatCurrency(tx.price)}</td>
                  <td className="py-3 pr-4 mono-num">{formatCurrency(tx.totalAmount)}</td>
                  <td className="py-3 text-mute">{formatDate(tx.transactionDate)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
