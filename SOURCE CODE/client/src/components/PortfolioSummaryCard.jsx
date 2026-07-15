import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Landmark } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

// Today's P/L and Overall P/L are computed server-side (GET /api/portfolio)
// from real DB records — unrealized movement on current holdings plus
// realized P/L from today's sells, and net worth vs. the fixed ₹1,00,000
// starting capital, respectively. See portfolioController.getPortfolio.
//
// Today's Investment and Total Investment are BUY-side accumulators (also
// server-side, see Portfolio.totalInvestment / todayInvestment) that only
// ever grow on a BUY and are never reduced by a SELL, so they stay
// meaningful even after a holding is fully cashed out.
export default function PortfolioSummaryCard({ portfolio, holdings, walletBalance }) {
  const todaysPL = portfolio?.todayPL ?? 0;
  const overallPL = portfolio?.overallPL ?? 0;
  const netWorth = portfolio?.netWorth ?? ((portfolio?.totalValue || 0) + (walletBalance || 0));
  const todayInvestment = portfolio?.todayInvestment ?? 0;
  const totalInvestment = portfolio?.totalInvestment ?? 0;

  const overallPositive = overallPL >= 0;
  const todayPositive = todaysPL >= 0;

  const stats = [
    {
      label: "Today's Investment",
      value: formatCurrency(todayInvestment),
      icon: PiggyBank,
      valueClass: "text-gold",
    },
    {
      label: "Today's P/L",
      value: formatCurrency(todaysPL),
      icon: todayPositive ? TrendingUp : TrendingDown,
      valueClass: todayPositive ? "text-mint" : "text-rose",
    },
    {
      label: "Total Investment",
      value: formatCurrency(totalInvestment),
      icon: Landmark,
      valueClass: "text-gold",
    },
    {
      label: "Overall P/L",
      value: formatCurrency(overallPL),
      icon: overallPositive ? TrendingUp : TrendingDown,
      valueClass: overallPositive ? "text-mint" : "text-rose",
    },
    {
      label: "Cash",
      value: formatCurrency(walletBalance),
      icon: Wallet,
      valueClass: "text-ice",
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card relative overflow-hidden"
    >
      {/* Ambient accent glow, purely decorative */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-mint/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-mute mb-2">Net worth</p>
          <p className="mono-num text-4xl sm:text-5xl font-bold text-ice leading-none">
            {formatCurrency(netWorth)}
          </p>
        </div>

        <div
          className={`mt-4 sm:mt-0 inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1.5 text-sm font-semibold ${
            todayPositive
              ? "border-mint/30 bg-mint/10 text-mint"
              : "border-rose/30 bg-rose/10 text-rose"
          }`}
        >
          {todayPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span className="mono-num">{formatCurrency(todaysPL)}</span>
          <span className="text-mute font-normal">today</span>
        </div>
      </div>

      <div className="relative my-5 h-px w-full bg-line" />

      <div className="relative grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, valueClass }) => (
          <div key={label}>
            <p className="flex items-center gap-1.5 text-xs text-mute mb-1.5">
              <Icon size={12} />
              {label}
            </p>
            <p className={`mono-num text-lg sm:text-xl font-bold ${valueClass}`}>{value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
