import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, TrendingUp, TrendingDown } from "lucide-react";
import { useSelector } from "react-redux";
import { formatPercent, formatCurrency } from "../utils/formatters";
import api from "../services/api";
import FullPageLoader from "../components/FullPageLoader";

const medalStyles = [
  { bg: "bg-gold/15", border: "border-gold/40", text: "text-gold", icon: Trophy },
  { bg: "bg-mute/10", border: "border-line", text: "text-ice", icon: Medal },
  { bg: "bg-amber/15", border: "border-amber/30", text: "text-amber", icon: Medal },
];

export default function Leaderboard() {
  const { user } = useSelector((s) => s.auth);
  const [ranked, setRanked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => api.get("/leaderboard").then(({ data }) => setRanked(data.leaderboard)).finally(() => setLoading(false));
    load();
    const interval = setInterval(load, 20000); // rankings refresh as live prices/holdings change
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <Trophy className="text-gold" size={24} />
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold">Leaderboard</motion.h1>
      </div>
      <p className="text-mute mb-8">Real users, ranked live by portfolio ROI.</p>

      {loading ? (
        <FullPageLoader label="Loading leaderboard" />
      ) : ranked.length === 0 ? (
        <div className="card text-center py-16 text-mute">No users with an active portfolio yet.</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {ranked.slice(0, 3).map((inv, i) => {
              const style = medalStyles[i];
              const Icon = style.icon;
              return (
                <motion.div key={inv.userId} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className={`card text-center ${style.bg} border ${style.border}`}>
                  <Icon className={`mx-auto mb-2 ${style.text}`} size={28} />
                  <p className="font-display font-bold">{inv.username}</p>
                  <p className="text-xs text-mute mb-3">Rank #{inv.rank}</p>
                  <p className={`mono-num text-2xl font-bold ${inv.roi >= 0 ? style.text : "text-rose"}`}>{formatPercent(inv.roi)}</p>
                </motion.div>
              );
            })}
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-mute">
                  <th className="py-3 pr-4 font-medium">Rank</th>
                  <th className="py-3 px-4 font-medium">Username</th>
                  <th className="py-3 px-4 font-medium">Net Worth</th>
                  <th className="py-3 px-4 font-medium">Total Returns</th>
                  <th className="py-3 px-4 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((inv) => {
                  const isMe = inv.userId === user?._id;
                  const positive = inv.roi >= 0;
                  return (
                    <tr key={inv.userId} className={`border-b border-line/50 last:border-0 hover:bg-panel2/50 transition-colors ${isMe ? "bg-mint/5" : ""}`}>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${inv.rank <= 3 ? "bg-gold/15 text-gold" : "bg-panel2 text-mute"}`}>{inv.rank}</span>
                      </td>
                      <td className={`py-3 px-4 font-medium ${isMe ? "text-mint" : ""}`}>{inv.username}{isMe && <span className="text-[10px] text-mute font-normal ml-1">(you)</span>}</td>
                      <td className="py-3 px-4 mono-num">{formatCurrency(inv.netWorth)}</td>
                      <td className={`py-3 px-4 mono-num ${inv.totalReturns >= 0 ? "text-mint" : "text-rose"}`}>{formatCurrency(inv.totalReturns)}</td>
                      <td className={`py-3 px-4 mono-num flex items-center gap-1 ${positive ? "text-mint" : "text-rose"}`}>
                        {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {formatPercent(inv.roi)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
