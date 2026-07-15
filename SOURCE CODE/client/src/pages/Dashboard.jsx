import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, Reorder } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, Loader2, ArrowUpCircle, ArrowDownCircle, Inbox } from "lucide-react";
import { fetchPortfolio } from "../redux/slices/portfolioSlice";
import { fetchStocks } from "../redux/slices/stockSlice";
import { formatCurrency, formatPercent, formatDate } from "../utils/formatters";
import PortfolioSummaryCard from "../components/PortfolioSummaryCard";
import HoldingsTable from "../components/HoldingsTable";
import FullPageLoader from "../components/FullPageLoader";
import WidgetShell from "../components/WidgetShell";
import api from "../services/api";

const WIDGET_ORDER_KEY = "sb-stocks-dashboard-widget-order";
// Fixed layout per spec: Portfolio Summary (rendered separately, not a
// widget) → Top Performing Stocks → Recent Activity → Holdings. Watchlist
// widget removed entirely.
const DEFAULT_WIDGET_ORDER = ["holdings","performers","activity"];

function loadWidgetOrder() {
  try {
    const raw = localStorage.getItem(WIDGET_ORDER_KEY);
    if (!raw) return DEFAULT_WIDGET_ORDER;
    const saved = JSON.parse(raw).filter((id) => id !== "watchlist"); // drop any previously saved watchlist entry
    // Guard against a stale saved order missing newer/removed widgets
    const merged = [...saved.filter((id) => DEFAULT_WIDGET_ORDER.includes(id))];
    DEFAULT_WIDGET_ORDER.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
    return merged;
  } catch {
    return DEFAULT_WIDGET_ORDER;
  }
}

// Realistic-looking mini price curve, seeded from the stock symbol (stable
// across re-renders) and shaped by today's actual change% so the curve
// reads as genuinely bullish, bearish, or choppy/volatile rather than a
// generic noisy line:
//  - |change| >= 1.5%   → clear trend (steady drift + small noise)
//  - |change| < 1.5%    → volatile/choppy (little net drift, larger noise)
function Sparkline({ symbol, changePercent = 0 }) {
  const up = changePercent >= 0;
  const trending = Math.abs(changePercent) >= 1.5;

  const points = (() => {
    let seed = 0;
    for (let i = 0; i < symbol.length; i++) seed = (seed * 31 + symbol.charCodeAt(i)) % 997;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const n = 24;
    const raw = [];
    let v = 50;
    const drift = trending ? (up ? 1 : -1) * 1.1 : 0;
    const noise = trending ? 5 : 9; // volatile stocks swing harder around a flat trend
    for (let i = 0; i < n; i++) {
      v += (rand() - 0.5) * noise + drift;
      v = Math.max(8, Math.min(92, v));
      raw.push(v);
    }
    // Light smoothing pass (3-point moving average) so it reads as a real
    // price curve rather than jagged noise, while keeping the shape intact.
    return raw.map((_, i) => {
      const a = raw[Math.max(0, i - 1)];
      const b = raw[i];
      const c = raw[Math.min(raw.length - 1, i + 1)];
      return (a + b + c) / 3;
    });
  })();

  const w = 120;
  const h = 36;
  const step = w / (points.length - 1);
  const path = points
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i * step).toFixed(1)} ${(h - (v / 100) * h).toFixed(1)}`)
    .join(" ");
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  const color = up ? "#2FE6A6" : "#FF5C7A";
  const gradId = `spark-grad-${symbol}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TopPerformerCard({ stock }) {
  const up = stock.changePercent >= 0;

  return (
    <div className="card group relative flex flex-col w-full h-full overflow-hidden hover:border-mint/40 hover:-translate-y-1 hover:shadow-glow transition-all duration-300">
      <Link to={`/stocks/${stock._id}`} className="block">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {stock.logo ? (
              <img src={stock.logo} alt={stock.symbol} className="w-9 h-9 rounded-full border border-line object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full border border-line bg-panel2 flex items-center justify-center font-display text-[11px] font-bold text-mint shrink-0">
                {stock.symbol?.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display font-bold text-sm leading-tight">{stock.symbol}</p>
              <p className="text-[11px] text-mute truncate max-w-[120px]">{stock.companyName}</p>
            </div>
          </div>
          <span className={`shrink-0 text-xs font-mono px-2 py-1 rounded-md ${up ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"}`}>
            {formatPercent(stock.changePercent)}
          </span>
        </div>

        <p className="mono-num text-xl font-semibold mb-2">{formatCurrency(stock.currentPrice)}</p>

        <div className="mb-3 -mx-1">
          <Sparkline symbol={stock.symbol} changePercent={stock.changePercent} />
        </div>
      </Link>

      <div className="mt-auto flex items-center gap-2 pt-1">
        {/* Buy here only ever navigates to the Stock Details page — actual
            order placement happens exclusively there (see StockDetails.jsx),
            never directly from the Dashboard. */}
        <Link
          to={`/stocks/${stock._id}`}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-mint text-ink font-display font-semibold text-xs py-2 transition-all duration-200 active:scale-95 hover:brightness-110"
        >
          <Plus size={14} /> Buy
        </Link>
        <Link
          to={`/stocks/${stock._id}`}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-line text-ice font-display font-medium text-xs py-2 transition-all duration-200 hover:border-mint/60 hover:text-mint"
        >
          View details
        </Link>
      </div>
    </div>
  );
}

function RecentActivityWidget() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  // Bumped by portfolioSlice.executeTrade whenever a BUY/SELL completes
  // anywhere in the app. This list isn't stored in Redux (it's local
  // component state), so it depends on this counter to know to refetch
  // itself instantly instead of only refreshing on next mount/navigation.
  const tradeVersion = useSelector((s) => s.portfolio.tradeVersion);

  useEffect(() => {
    setLoading(true);
    api.get("/transactions")
      .then(({ data }) => setTransactions((data.transactions || []).slice(0, 5)))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, [tradeVersion]);

  if (loading) {
    return <div className="card h-40 flex items-center justify-center text-mute"><Loader2 className="animate-spin" size={18} /></div>;
  }

  if (!transactions.length) {
    return (
      <div className="card flex flex-col items-center justify-center text-center py-10">
        <Inbox className="text-mute mb-2" size={22} />
        <p className="text-sm text-mute">No activity yet — your trades will show up here.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-line">
      {transactions.map((tx) => {
        const isBuy = tx.type?.toUpperCase() === "BUY";
        return (
          <div key={tx._id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-2">
              {isBuy ? <ArrowUpCircle size={16} className="text-mint" /> : <ArrowDownCircle size={16} className="text-rose" />}
              <div>
                <p className="text-sm font-medium">{isBuy ? "Bought" : "Sold"} {tx.stockId?.symbol}</p>
                <p className="text-[11px] text-mute">{tx.quantity} shares · {formatDate(tx.transactionDate)}</p>
              </div>
            </div>
            <p className="mono-num text-sm">{formatCurrency(tx.totalAmount)}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { portfolio, holdings, status } = useSelector((s) => s.portfolio);
  const { list: stocks } = useSelector((s) => s.stocks);
  const [widgetOrder, setWidgetOrder] = useState(loadWidgetOrder);

  useEffect(() => {
    dispatch(fetchPortfolio());
    dispatch(fetchStocks({ sort: "gainers" }));
  }, [dispatch]);

  const reorder = (next) => {
    setWidgetOrder(next);
    try { localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  if (status === "loading" && !portfolio) return <FullPageLoader label="Pulling up your dashboard" />;

  const topPerformers = [...stocks].sort((a, b) => b.changePercent - a.changePercent).slice(0, 6);

  const widgetContent = {
    holdings: holdings?.length > 0 && (
      <WidgetShell
        id="holdings"
        title="Your holdings"
        action={<Link to="/portfolio" className="text-sm text-mint flex items-center gap-1 hover:underline">Full portfolio <ArrowRight size={14} /></Link>}
      >
        <div className="card overflow-x-auto">
          <HoldingsTable holdings={holdings.slice(0, 5)} />
        </div>
      </WidgetShell>
    ),
    activity: (
      <WidgetShell
        id="activity"
        title="Recent activity"
        action={<Link to="/transactions" className="text-sm text-mint flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link>}
      >
        <RecentActivityWidget />
      </WidgetShell>
    ),
    performers: (
      <WidgetShell
        id="performers"
        title="Top performing stocks today"
        action={<Link to="/stocks" className="text-sm text-mint flex items-center gap-1 hover:underline">View all <ArrowRight size={14} /></Link>}
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {topPerformers.map((s, i) => (
            <motion.div
              key={s._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="h-full"
            >
              <TopPerformerCard stock={s} />
            </motion.div>
          ))}
        </div>
      </WidgetShell>
    ),
  };

  const visibleOrder = widgetOrder.filter((id) => id !== "holdings" || holdings?.length > 0);

  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-3xl font-bold mb-1"
      >
        Welcome back, {user?.name?.split(" ")[0]}
      </motion.h1>
      <p className="text-mute mb-8">Here's how your simulated portfolio is doing today. Drag the grip handle on any section below to rearrange your dashboard.</p>

      <div className="mb-10">
        <PortfolioSummaryCard portfolio={portfolio} holdings={holdings || []} walletBalance={user?.walletBalance} />
      </div>

      <Reorder.Group axis="y" values={visibleOrder} onReorder={reorder}>
        {visibleOrder.map((id) => widgetContent[id])}
      </Reorder.Group>
    </div>
  );
}
