import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  User, Loader2, Wallet, TrendingUp, TrendingDown, Calendar, Star, Award,
  ArrowUpCircle, ArrowDownCircle, Settings as SettingsIcon,
} from "lucide-react";
import { setUser } from "../redux/slices/authSlice";
import { showToast } from "../redux/slices/uiSlice";
import { fetchPortfolio } from "../redux/slices/portfolioSlice";
import { fetchWatchlist } from "../redux/slices/watchlistSlice";
import { formatCurrency, formatDate } from "../utils/formatters";
import api from "../services/api";

const BADGES = [
  { key: "firstInvestment", label: "First Investment", emoji: "🏅", test: (ctx) => ctx.holdings.length > 0 },
  { key: "firstProfit", label: "First Profit", emoji: "🏅", test: (ctx) => ctx.holdings.some((h) => h.profitLoss > 0) },
  { key: "diversified", label: "Diversified Investor", emoji: "🏅", test: (ctx) => ctx.sectorCount >= 3 },
  { key: "portfolioBuilder", label: "Portfolio Builder", emoji: "🏅", test: (ctx) => ctx.holdings.length >= 5 },
  { key: "activeTrader", label: "Active Trader", emoji: "🏅", test: (ctx) => ctx.transactionCount >= 5 },
];

// Simple heuristic risk score from average beta of holdings — not real risk modeling
function riskFromBeta(avgBeta) {
  if (!avgBeta) return { label: "Unrated", tone: "mute" };
  if (avgBeta < 0.85) return { label: "Low", tone: "mint" };
  if (avgBeta < 1.15) return { label: "Medium", tone: "amber" };
  return { label: "High", tone: "rose" };
}

export default function Profile() {
  const { user } = useSelector((s) => s.auth);
  const { portfolio, holdings } = useSelector((s) => s.portfolio);
  const { items: watchlistItems } = useSelector((s) => s.watchlist);
  const dispatch = useDispatch();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [recentTx, setRecentTx] = useState([]);

  useEffect(() => {
    dispatch(fetchPortfolio());
    dispatch(fetchWatchlist());
    api.get("/transactions").then(({ data }) => setRecentTx(data.transactions.slice(0, 5))).catch(() => {});
  }, [dispatch]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/users/me", { name });
      dispatch(setUser({ ...user, name: data.user.name }));
      dispatch(showToast({ type: "success", message: "Profile updated" }));
    } catch (err) {
      dispatch(showToast({ type: "error", message: err.response?.data?.message || "Update failed" }));
    } finally {
      setSaving(false);
    }
  };

  const list = holdings || [];
  const sectorCount = new Set(list.map((h) => h.stockId?.sector).filter(Boolean)).size;
  const avgBeta = list.length
    ? list.reduce((sum, h) => sum + (h.stockId?.beta ?? 1) * h.quantity, 0) / (list.reduce((s, h) => s + h.quantity, 0) || 1)
    : 0;
  const risk = riskFromBeta(avgBeta);
  const plPositive = (portfolio?.overallPL ?? portfolio?.totalProfitLoss ?? 0) >= 0;
  const earnedBadges = BADGES.filter((b) => b.test({ holdings: list, sectorCount, transactionCount: recentTx.length }));

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-8">
      {/* Left: identity card */}
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-mint/10 border border-mint/30 flex items-center justify-center mb-4">
            <User className="text-mint" size={34} />
          </div>
          <p className="font-display text-lg font-bold">{user?.name}</p>
          <p className="text-xs text-mute mb-4">{user?.email}</p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-mute mb-1">
            <Calendar size={12} /> Joined {user?.createdAt ? formatDate(user.createdAt) : "—"}
          </div>
          <span className={`inline-block mt-3 text-[11px] font-medium px-2.5 py-1 rounded-md border ${
            risk.tone === "mint" ? "bg-mint/10 text-mint border-mint/30" :
            risk.tone === "rose" ? "bg-rose/10 text-rose border-rose/30" :
            risk.tone === "amber" ? "bg-amber/10 text-amber border-amber/30" :
            "bg-panel2 text-mute border-line"
          }`}>
            Risk score: {risk.label}
          </span>
        </motion.div>

        <motion.form onSubmit={save} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
          <label className="text-xs text-mute mb-1 block">Full name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-4 bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="animate-spin" size={16} /> : "Save changes"}
          </button>
          <Link to="/settings" className="flex items-center justify-center gap-1.5 text-xs text-mute hover:text-ice mt-4">
            <SettingsIcon size={13} /> Security settings
          </Link>
        </motion.form>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-1.5">
            <Award size={15} className="text-gold" /> Achievements
          </h3>
          {earnedBadges.length === 0 ? (
            <p className="text-xs text-mute">Place your first trade to start earning badges.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map((b) => (
                <span key={b.key} className="text-xs bg-panel2 border border-line rounded-md px-2 py-1" title={b.label}>
                  {b.emoji} {b.label}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Right: investment summary + activity */}
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="card">
            <Wallet className="text-mint mb-2" size={18} />
            <p className="text-xs text-mute mb-1">Cash balance</p>
            <p className="mono-num text-lg font-bold">{formatCurrency(user?.walletBalance)}</p>
          </div>
          <div className="card">
            <TrendingUp className="text-gold mb-2" size={18} />
            <p className="text-xs text-mute mb-1">Portfolio value</p>
            <p className="mono-num text-lg font-bold">{formatCurrency(portfolio?.totalValue)}</p>
          </div>
          <div className="card">
            {plPositive ? <TrendingUp className="text-mint mb-2" size={18} /> : <TrendingDown className="text-rose mb-2" size={18} />}
            <p className="text-xs text-mute mb-1">Overall P/L</p>
            <p className={`mono-num text-lg font-bold ${plPositive ? "text-mint" : "text-rose"}`}>{formatCurrency(portfolio?.overallPL ?? portfolio?.totalProfitLoss)}</p>
          </div>
          <div className="card">
            <Star className="text-gold mb-2" size={18} />
            <p className="text-xs text-mute mb-1">Watchlist</p>
            <p className="mono-num text-lg font-bold">{watchlistItems.length} stocks</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Favorite stocks</h3>
            <Link to="/watchlist" className="text-xs text-mint hover:underline">View all</Link>
          </div>
          {watchlistItems.length === 0 ? (
            <p className="text-sm text-mute">Nothing on your watchlist yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {watchlistItems.slice(0, 4).map((item) => (
                <Link
                  key={item._id}
                  to={`/stocks/${item.stockId?._id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-panel2/60 hover:bg-panel2 transition-colors"
                >
                  <span className="text-sm font-medium">{item.stockId?.symbol}</span>
                  <span className="mono-num text-xs text-mute">{formatCurrency(item.stockId?.currentPrice)}</span>
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Recent activity</h3>
            <Link to="/transactions" className="text-xs text-mint hover:underline">View all</Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-sm text-mute">No trades yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTx.map((tx) => (
                <div key={tx._id} className="flex items-center justify-between py-2 border-b border-line/50 last:border-0">
                  <div className="flex items-center gap-2">
                    {tx.type === "BUY" ? <ArrowUpCircle className="text-mint" size={16} /> : <ArrowDownCircle className="text-rose" size={16} />}
                    <span className="text-sm font-medium">{tx.stockId?.symbol}</span>
                    <span className="text-xs text-mute">{tx.quantity} shares</span>
                  </div>
                  <div className="text-right">
                    <p className="mono-num text-sm">{formatCurrency(tx.totalAmount)}</p>
                    <p className="text-[11px] text-mute">{formatDate(tx.transactionDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
