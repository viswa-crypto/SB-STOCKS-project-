import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, UserCheck, Landmark, Receipt, DollarSign, Wallet, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { formatCurrency, formatCompact, formatDate } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";
import api from "../services/api";

const Stat = ({ icon: Icon, label, value, delay }) => (
  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="card">
    <Icon className="text-gold mb-3" size={20} />
    <p className="text-xs text-mute mb-1">{label}</p>
    <p className="mono-num text-xl font-bold">{value}</p>
  </motion.div>
);

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/admin/dashboard").then(({ data }) => setData(data));
  }, []);

  if (!data) return <FullPageLoader label="Compiling platform analytics" />;

  const growthData = data.userGrowth.map((d) => ({ ...d, date: d.date.slice(5) }));
  const volumeData = data.dailyVolume.map((d) => ({ ...d, date: d.date.slice(5) }));

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">Admin overview</h1>
      <p className="text-mute mb-8">Platform-wide stats at a glance.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <Stat icon={Users} label="Total users" value={data.stats.userCount} delay={0} />
        <Stat icon={UserCheck} label="Active users" value={data.stats.activeUserCount} delay={0.03} />
        <Stat icon={Landmark} label="Listed stocks" value={data.stats.stockCount} delay={0.06} />
        <Stat icon={Receipt} label="Transactions" value={data.stats.transactionCount} delay={0.09} />
        <Stat icon={Wallet} label="Total investments" value={formatCompact(data.stats.totalInvestments)} delay={0.12} />
        <Stat icon={DollarSign} label="Traded volume" value={formatCompact(data.stats.totalTradedVolume)} delay={0.15} />
        <Stat icon={ArrowUpRight} label="Buy orders" value={data.stats.buyCount} delay={0.18} />
        <Stat icon={ArrowDownRight} label="Sell orders" value={data.stats.sellCount} delay={0.21} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
          <h3 className="font-display font-semibold mb-4">User growth (14 days)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid stroke="#1E2A3F" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#8592AB", fontSize: 11 }} />
                <YAxis tick={{ fill: "#8592AB", fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #1E2A3F", borderRadius: 8 }} />
                <Line type="monotone" dataKey="users" stroke="#D9B25C" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card">
          <h3 className="font-display font-semibold mb-4">Daily buy/sell volume</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <CartesianGrid stroke="#1E2A3F" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#8592AB", fontSize: 11 }} />
                <YAxis tick={{ fill: "#8592AB", fontSize: 11 }} tickFormatter={formatCompact} />
                <Tooltip contentStyle={{ background: "#111A2B", border: "1px solid #1E2A3F", borderRadius: 8 }} formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="buy" stackId="a" fill="#2FE6A6" name="Buy" radius={[0, 0, 0, 0]} />
                <Bar dataKey="sell" stackId="a" fill="#FF5C7A" name="Sell" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <h2 className="font-display text-xl font-semibold mb-4">Recent transactions</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-mute border-b border-line">
              <th className="py-2 pr-4">User</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Stock</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTransactions.map((tx) => (
              <tr key={tx._id} className="border-b border-line/50 last:border-0">
                <td className="py-3 pr-4">{tx.userId?.name}</td>
                <td className={`py-3 pr-4 ${tx.type === "BUY" ? "text-mint" : "text-rose"}`}>{tx.type}</td>
                <td className="py-3 pr-4 font-medium">{tx.stockId?.symbol}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(tx.totalAmount)}</td>
                <td className="py-3 text-mute">{formatDate(tx.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
