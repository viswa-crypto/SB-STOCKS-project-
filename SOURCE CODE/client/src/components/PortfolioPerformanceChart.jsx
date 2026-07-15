import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

// ---------------------------------------------------------------------------
// PORTFOLIO PERFORMANCE — 1D / 1W / 1M / 3M / 6M / 1Y / All
//
// The backend keeps no daily portfolio-value snapshots (see
// portfolioController.getPortfolio), so there's no real historical
// mark-to-market series to plot directly. Rather than leave the chart empty
// on quiet timeframes, this builds an honest approximation:
//
//   1. Real transaction history gives us the true cumulative cost basis
//      (capital deployed) at every point in time.
//   2. That cost-basis curve is scaled by a single factor — current market
//      value ÷ current cost basis — so the curve always lands exactly on
//      today's real portfolio value, and the shape in between reflects
//      genuine capital-deployment timing rather than a fabricated price
//      history.
//   3. Each timeframe is always sampled at an even grid of at least
//      `minPoints` points across the window, so a brand-new account with a
//      single day of history (or a quiet stretch with no trades) still
//      renders a meaningful, non-empty trend line instead of one dot or a
//      blank panel.
//
// This is clearly a simplification, not a real historical NAV series, and
// is labeled as such in the UI.
// ---------------------------------------------------------------------------

const TIMEFRAMES = [
  { key: "1D", label: "1D", days: 1, bucket: "hour", minPoints: 7 },
  { key: "1W", label: "1W", days: 7, bucket: "day", minPoints: 7 },
  { key: "1M", label: "1M", days: 30, bucket: "day", minPoints: 10 },
  { key: "3M", label: "3M", days: 90, bucket: "week", minPoints: 9 },
  { key: "6M", label: "6M", days: 182, bucket: "week", minPoints: 10 },
  { key: "1Y", label: "1Y", days: 365, bucket: "month", minPoints: 8 },
  { key: "ALL", label: "All", days: Infinity, bucket: "month", minPoints: 6 },
];

function formatLabel(ms, bucket) {
  const d = new Date(ms);
  if (bucket === "hour") return d.toLocaleTimeString("en-IN", { hour: "numeric" });
  if (bucket === "month") return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Normalizes real BUY/SELL history into a chronological cumulative
// cost-basis curve: { time (ms), invested }.
function buildCumulativeInvested(transactions) {
  const sorted = [...transactions]
    .filter((t) => t?.transactionDate)
    .sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));

  let running = 0;
  return sorted.map((tx) => {
    const sign = String(tx.type).toUpperCase() === "SELL" ? -1 : 1;
    running += sign * (tx.totalAmount || 0);
    return { time: new Date(tx.transactionDate).getTime(), invested: running };
  });
}

// Carry-forward lookup: the last known cumulative value at or before `time`.
function investedAt(cumulative, time) {
  let value = 0;
  for (const point of cumulative) {
    if (point.time > time) break;
    value = point.invested;
  }
  return value;
}

function buildSeries(transactions, { totalInvested, currentValue }, cfg) {
  const now = Date.now();
  const cumulative = buildCumulativeInvested(transactions);

  const windowStart =
    cfg.days === Infinity ? cumulative[0]?.time ?? now - 6 * 86400000 : now - cfg.days * 86400000;

  const investedNow = totalInvested > 0 ? totalInvested : investedAt(cumulative, now);
  // Single scale factor mapping cost-basis history onto today's real market
  // value — keeps the curve's shape genuine while guaranteeing it always
  // ends exactly at the real, current portfolio value.
  const scale = investedNow > 0 ? currentValue / investedNow : currentValue > 0 ? 1 : 0;

  const nPoints = Math.max(cfg.minPoints, 2);
  const step = (now - windowStart) / (nPoints - 1);

  const points = Array.from({ length: nPoints }, (_, i) => {
    const time = i === nPoints - 1 ? now : windowStart + step * i;
    const rawInvested = i === 0 ? investedAt(cumulative, windowStart) : investedAt(cumulative, time);
    const value = rawInvested * scale;
    return { time, value };
  });

  // The final point is always the real, exact current value — not an
  // approximation — so "today" on the chart always matches the rest of the
  // dashboard.
  points[points.length - 1].value = currentValue;

  return points.map((p, i) => ({
    label: i === points.length - 1 ? "Now" : formatLabel(p.time, cfg.bucket),
    value: Math.max(0, p.value),
  }));
}

export default function PortfolioPerformanceChart({ portfolio, transactions, loading }) {
  const [timeframe, setTimeframe] = useState("1M");
  // Net worth (cash + current holdings) is the real, up-to-date measure of
  // "what this account is worth right now" — unlike totalValue (holdings
  // market value alone), it doesn't collapse to ₹0 the moment everything is
  // sold, since the proceeds are sitting in cash. Anchoring the curve here
  // keeps it accurate through every buy/sell up to this exact moment.
  const currentValue = portfolio?.netWorth ?? ((portfolio?.totalValue || 0) + (portfolio?.cashBalance || 0));
  // Lifetime investment (all-time BUYs, never reduced by a SELL) is used to
  // scale the cost-basis curve instead of current-holdings cost basis, so
  // the chart still reflects real capital deployed even with zero current
  // holdings.
  const totalInvested = portfolio?.totalInvestment || 0;

  const cfg = TIMEFRAMES.find((t) => t.key === timeframe);
  const series = useMemo(
    () => buildSeries(transactions || [], { totalInvested, currentValue }, cfg),
    [transactions, totalInvested, currentValue, cfg]
  );

  const startValue = series[0]?.value ?? 0;
  const change = currentValue - startValue;
  const changePercent = startValue > 0 ? (change / startValue) * 100 : 0;
  const isPositive = change >= 0;
  const accentColor = isPositive ? "#2FE6A6" : "#FF5C7A";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-display font-semibold">Portfolio performance</h3>
          <p className="text-[11px] text-mute mt-0.5">Approximate value trend, anchored to your real holdings today</p>
        </div>
        <div className="flex items-center gap-1 bg-panel2 rounded-lg p-1 flex-wrap">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.key}
              onClick={() => setTimeframe(t.key)}
              className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                timeframe === t.key ? "bg-mint/10 text-mint" : "text-mute hover:text-ice"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && series.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-mint" : "text-rose"}`}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatCurrency(change)} ({changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
          <span className="text-[11px] text-mute">over {cfg.label}</span>
        </div>
      )}

      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center text-mute">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="perfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1E2A3F" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8592AB" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#8592AB" }}
                axisLine={false}
                tickLine={false}
                width={70}
                domain={["auto", "auto"]}
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                contentStyle={{ background: "#111A2B", border: "1px solid #1E2A3F", borderRadius: 8 }}
                labelStyle={{ color: "#8592AB" }}
                formatter={(v) => [formatCurrency(v), "Portfolio value"]}
              />
              <Area type="monotone" dataKey="value" stroke={accentColor} strokeWidth={2} fill="url(#perfGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <p className="text-[11px] text-mute mt-3">
        Current portfolio value today: <span className="mono-num text-ice font-medium">{formatCurrency(currentValue)}</span>
      </p>
    </motion.div>
  );
}
