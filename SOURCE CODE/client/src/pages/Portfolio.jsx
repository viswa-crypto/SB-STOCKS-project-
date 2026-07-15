import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Layers, Percent, PieChart as PieIcon, Sparkles, ShieldAlert, FileDown } from "lucide-react";
import { fetchPortfolio } from "../redux/slices/portfolioSlice";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { pieTooltipStyle, legendFormatter, renderOutsidePieLabel, pieLabelLineStyle, MIN_SLICE_ANGLE, renderActivePieShape } from "../utils/chartTheme";
import { exportPortfolioReportPDF, exportHoldingsPDF, exportPortfolioSummaryPDF } from "../utils/pdfExport";
import api from "../services/api";
import FullPageLoader from "../components/FullPageLoader";
import HoldingsTable from "../components/HoldingsTable";
import SectorAllocationChart from "../components/SectorAllocationChart";
import PortfolioGlobe from "../components/PortfolioGlobe";
import TradingAchievements from "../components/TradingAchievements";
import PortfolioPerformanceChart from "../components/PortfolioPerformanceChart";

const COLORS = ["#2FE6A6", "#D9B25C", "#FF5C7A", "#17C98C", "#8592AB", "#F5A623", "#5C9BFF", "#B85CFF"];

export default function Portfolio() {
  const dispatch = useDispatch();
  const { portfolio, holdings, status, tradeVersion } = useSelector((s) => s.portfolio);
  const { user } = useSelector((s) => s.auth);
  const [view, setView] = useState("stock"); // "stock" | "sector"
  const [activeStockSlice, setActiveStockSlice] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => { dispatch(fetchPortfolio()); }, [dispatch]);

  // Fetched once here and shared by the performance chart and achievements
  // section below, instead of each component independently re-fetching the
  // same transaction history.
  // Also re-runs when tradeVersion bumps (see portfolioSlice.executeTrade) so
  // the performance chart and achievements stay in sync immediately after a
  // trade, without requiring a full page reload — the same pattern Dashboard
  // already uses for its own recent-activity list.
  useEffect(() => {
    setTxLoading(true);
    api.get("/transactions")
      .then(({ data }) => setTransactions(data.transactions || []))
      .catch(() => setTransactions([]))
      .finally(() => setTxLoading(false));
  }, [tradeVersion]);

  const pieData = holdings.map((h) => ({ name: h.stockId?.symbol, value: h.currentValue }));

  // "Total P/L" and ROI must reflect everything that's happened on this
  // account to date (realized gains/losses from closed positions included),
  // not just the unrealized P/L of whatever happens to still be held —
  // otherwise both silently drop to ₹0 the moment a portfolio is fully sold
  // off, even if the user made real money along the way. overallPL (from
  // the server: netWorth - starting capital) already captures this
  // correctly regardless of current holdings state.
  const overallPL = portfolio?.overallPL ?? portfolio?.totalProfitLoss ?? 0;
  const plPositive = overallPL >= 0;

  // Best/worst performer: prefer current unrealized standings when the user
  // holds something; fall back to realized P&L per stock (from closed SELL
  // trades) so this still means something right after a full exit instead
  // of just disappearing.
  const realizedByStock = useMemo(() => {
    const map = {};
    (transactions || [])
      .filter((t) => String(t.type).toUpperCase() === "SELL")
      .forEach((t) => {
        const symbol = t.stockId?.symbol || t.symbol || "—";
        const realized = (t.totalAmount || 0) - (t.costBasis ?? t.totalAmount ?? 0);
        map[symbol] = (map[symbol] || 0) + realized;
      });
    return Object.entries(map).map(([symbol, profitLoss]) => ({ stockId: { symbol }, profitLoss, realized: true }));
  }, [transactions]);

  const ranked = holdings.length
    ? [...holdings].sort((a, b) => b.profitLoss - a.profitLoss)
    : [...realizedByStock].sort((a, b) => b.profitLoss - a.profitLoss);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const sectorWeights = useMemo(() => {
    const bySector = {};
    let total = 0;
    holdings.forEach((h) => {
      const sector = h.stockId?.sector || "Other";
      bySector[sector] = (bySector[sector] || 0) + (h.currentValue || 0);
      total += h.currentValue || 0;
    });
    return Object.entries(bySector).map(([name, value]) => ({ name, weight: total ? value / total : 0 }));
  }, [holdings]);

  // Portfolio-wide analytics. ROI is always computed from lifetime
  // investment + all-time P/L (works with zero current holdings, since
  // totalInvestment never resets and overallPL includes realized gains).
  // Composition-based stats (diversification, top sector, risk, most
  // invested) are only meaningful with something currently held, so those
  // stay null-safe and render as "—" rather than blocking the rest of the
  // page.
  const analytics = useMemo(() => {
    const totalInvestment = portfolio?.totalInvestment || 0;
    const roi = totalInvestment > 0 ? (overallPL / totalInvestment) * 100 : 0;

    if (!holdings.length) {
      return { roi, mostInvested: null, topSector: null, diversificationScore: null, risk: null, hasHoldings: false };
    }

    const mostInvested = [...holdings].sort((a, b) => (b.investment || 0) - (a.investment || 0))[0];
    const topSector = [...sectorWeights].sort((a, b) => b.weight - a.weight)[0];
    // Herfindahl-based diversification score: lower concentration = higher score (0-100)
    const hhi = sectorWeights.reduce((sum, s) => sum + s.weight ** 2, 0);
    const diversificationScore = Math.round((1 - hhi) * 100);
    const avgBeta = holdings.reduce((sum, h) => sum + (h.stockId?.beta ?? 1) * (h.quantity || 0), 0) /
      (holdings.reduce((s, h) => s + (h.quantity || 0), 0) || 1);
    const risk = avgBeta < 0.85 ? "Low" : avgBeta < 1.15 ? "Medium" : "High";
    return { roi, mostInvested, topSector, diversificationScore, risk, hasHoldings: true };
  }, [holdings, portfolio, sectorWeights, overallPL]);

  const insights = useMemo(() => {
    if (!analytics) return [];
    const list = [];
    list.push(analytics.roi >= 0 ? "Your overall returns are currently positive." : "Your overall returns are currently negative — review your positions.");
    if (analytics.hasHoldings) {
      list.push(
        analytics.diversificationScore >= 60
          ? "Your portfolio is well diversified across sectors."
          : `${analytics.topSector?.name || "One sector"} dominates your investments — consider balancing with other sectors.`
      );
      list.push(`Risk level is ${analytics.risk.toLowerCase()} based on the average volatility of your holdings.`);
      if (analytics.mostInvested) list.push(`${analytics.mostInvested.stockId?.symbol} is your largest position by investment.`);
    } else if (best) {
      list.push(`${best.stockId?.symbol} was your best-performing closed trade, based on realized P/L.`);
    }
    return list;
  }, [analytics, best]);

  if (status === "loading" && !portfolio) {
    return <FullPageLoader label="Building your portfolio view" />;
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-1">
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold">
          Portfolio
        </motion.h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportPortfolioReportPDF({ user, portfolio, holdings }).catch(() =>
              dispatch(showToast({ type: "error", message: "Couldn't generate the PDF. Try again in a moment." }))
            )}
            className="btn-ghost text-xs px-3.5 py-2"
          >
            <FileDown size={14} /> Portfolio report
          </button>
          {holdings.length > 0 && (
            <button
              onClick={() => exportHoldingsPDF(holdings).catch(() =>
                dispatch(showToast({ type: "error", message: "Couldn't generate the PDF. Try again in a moment." }))
              )}
              className="btn-ghost text-xs px-3.5 py-2"
            >
              <FileDown size={14} /> Holdings PDF
            </button>
          )}
          <button
            onClick={() => exportPortfolioSummaryPDF({ user, portfolio, holdings }).catch(() =>
              dispatch(showToast({ type: "error", message: "Couldn't generate the PDF. Try again in a moment." }))
            )}
            className="btn-ghost text-xs px-3.5 py-2"
          >
            <FileDown size={14} /> Export summary
          </button>
        </div>
      </div>
      <p className="text-mute mb-8">
        {holdings.length > 0
          ? "A full breakdown of everything you currently hold."
          : "No current holdings — figures below reflect your full trading history to date."}
      </p>

      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        <div className="card">
          <p className="text-xs text-mute mb-1">Net worth {holdings.length > 0 ? "(holdings + cash)" : "(cash)"}</p>
          <p className="mono-num text-2xl font-bold">
            {formatCurrency(portfolio?.netWorth ?? ((portfolio?.totalValue || 0) + (portfolio?.cashBalance || 0)))}
          </p>
        </div>
        <div className="card">
          <p className="text-xs text-mute mb-1">Lifetime investment</p>
          <p className="mono-num text-2xl font-bold text-gold">{formatCurrency(portfolio?.totalInvestment)}</p>
        </div>
        <div className="card">
          <p className="text-xs text-mute mb-1">Total P/L (all-time)</p>
          <p className={`mono-num text-2xl font-bold ${plPositive ? "text-mint" : "text-rose"}`}>
            {formatCurrency(overallPL)}
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-5 mb-8">
        <div className="card flex items-center gap-3">
          <Layers className="text-mute" size={20} />
          <div>
            <p className="text-xs text-mute">Holdings</p>
            <p className="font-display text-lg font-bold">{holdings.length}</p>
          </div>
        </div>
        {best && (
          <div className="card flex items-center gap-3">
            <TrendingUp className="text-mint" size={20} />
            <div>
              <p className="text-xs text-mute">{holdings.length ? "Best performer" : "Best closed trade"}</p>
              <p className="font-display text-lg font-bold">{best.stockId?.symbol} <span className="text-mint text-sm">{formatCurrency(best.profitLoss)}</span></p>
            </div>
          </div>
        )}
        {worst && (
          <div className="card flex items-center gap-3">
            <TrendingDown className="text-rose" size={20} />
            <div>
              <p className="text-xs text-mute">{holdings.length ? "Worst performer" : "Worst closed trade"}</p>
              <p className="font-display text-lg font-bold">{worst.stockId?.symbol} <span className="text-rose text-sm">{formatCurrency(worst.profitLoss)}</span></p>
            </div>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-4 gap-5 mb-8">
        <div className="card flex items-center gap-3">
          <Percent className="text-mint" size={20} />
          <div>
            <p className="text-xs text-mute">ROI (all-time)</p>
            <p className={`font-display text-lg font-bold ${analytics?.roi >= 0 ? "text-mint" : "text-rose"}`}>
              {analytics ? formatPercent(analytics.roi) : "—"}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <PieIcon className="text-ice" size={20} />
          <div>
            <p className="text-xs text-mute">Diversification score</p>
            <p className="font-display text-lg font-bold">{analytics?.hasHoldings ? `${analytics.diversificationScore}/100` : "—"}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <ShieldAlert className="text-gold" size={20} />
          <div>
            <p className="text-xs text-mute">Risk score</p>
            <p className="font-display text-lg font-bold">{analytics?.hasHoldings ? analytics.risk : "—"}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Layers className="text-mute" size={20} />
          <div>
            <p className="text-xs text-mute">Top sector</p>
            <p className="font-display text-lg font-bold truncate">{analytics?.hasHoldings ? (analytics.topSector?.name || "—") : "—"}</p>
          </div>
        </div>
      </div>

      {insights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card mb-8">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-1.5">
            <Sparkles size={15} className="text-gold" /> Investment insights
          </h3>
          <ul className="space-y-2">
            {insights.map((text, i) => (
              <li key={i} className="text-sm text-mute flex items-start gap-2">
                <span className="text-mint mt-1">•</span> {text}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-mute mt-3">Generated from simple portfolio heuristics — not financial advice.</p>
        </motion.div>
      )}

      {holdings.length === 0 ? (
        <div className="card text-center py-16 mb-8">
          <p className="text-mute mb-4">You don't currently hold any stocks.</p>
          <Link to="/stocks" className="btn-primary inline-flex">Browse the market</Link>
        </div>
      ) : (
        <>
          <div className="card overflow-x-auto mb-8">
            <HoldingsTable holdings={holdings} />
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card h-80 flex flex-col">
              <div className="flex items-center gap-1 mb-2 self-center bg-panel2 rounded-lg p-1">
                <button
                  onClick={() => setView("stock")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${view === "stock" ? "bg-mint/10 text-mint" : "text-mute"}`}
                >
                  By stock
                </button>
                <button
                  onClick={() => setView("sector")}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${view === "sector" ? "bg-mint/10 text-mint" : "text-mute"}`}
                >
                  By sector
                </button>
              </div>
              <div className="flex-1">
                {view === "stock" ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="42%"
                        outerRadius="62%"
                        paddingAngle={3}
                        minAngle={MIN_SLICE_ANGLE}
                        label={renderOutsidePieLabel}
                        labelLine={{ style: pieLabelLineStyle }}
                        isAnimationActive={false}
                        activeIndex={activeStockSlice}
                        activeShape={renderActivePieShape}
                        onMouseEnter={(_, i) => setActiveStockSlice(i)}
                        onMouseLeave={() => setActiveStockSlice(null)}
                      >
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgb(var(--color-panel))" strokeWidth={1} />)}
                      </Pie>
                      <Tooltip {...pieTooltipStyle} formatter={(v) => formatCurrency(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendFormatter} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <SectorAllocationChart holdings={holdings} />
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 }}
              className="card h-80 hidden lg:flex flex-col"
            >
              <p className="text-xs text-mute mb-1 self-center">Sector distribution</p>
              <div className="flex-1">
                <PortfolioGlobe sectors={sectorWeights} />
              </div>
            </motion.div>

          </div>
        </>
      )}

      <div className="mt-8">
        <PortfolioPerformanceChart portfolio={portfolio} transactions={transactions} loading={txLoading} />
      </div>

      <div className="mt-8">
        <TradingAchievements
          holdings={holdings}
          transactions={transactions}
          analytics={analytics}
          sectorWeights={sectorWeights}
        />
      </div>
    </div>
  );
}
