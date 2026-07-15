import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  Brush, ReferenceLine, ReferenceDot,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Star, Loader2, Wallet, TrendingUp, TrendingDown, Minus,
  Building2, User as UserIcon, Calendar, MapPin, Users, Plus, Minus as MinusIcon,
  Briefcase, Radio, Maximize2, Minimize2,
} from "lucide-react";
import { fetchStockById, fetchStocks } from "../redux/slices/stockSlice";
import { addToWatchlist, removeFromWatchlist, fetchWatchlist } from "../redux/slices/watchlistSlice";
import { executeTrade, fetchPortfolio } from "../redux/slices/portfolioSlice";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency, formatCompact, formatPercent, formatDate, formatDateTime, formatTime } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";
import RelatedStocks from "../components/RelatedStocks";

// How far back each range should look. "1D" is handled separately (it filters
// to today's calendar date rather than a fixed millisecond window). "MAX"
// shows every point the API returned.
const RANGES = [
  { key: "1D", days: null },
  { key: "1W", days: 7 },
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "5Y", days: 5 * 365 },
  { key: "MAX", days: Infinity },
];

// How often to silently re-fetch the stock (and its history) in the background
// so the price and chart keep moving without the user refreshing. Matches the
// backend's own live price-tick interval (see server/services/stockPriceService.js).
const LIVE_POLL_MS = 15000;

function Badge({ children, tone = "mute" }) {
  const tones = {
    mint: "bg-mint/10 text-mint border-mint/30",
    rose: "bg-rose/10 text-rose border-rose/30",
    amber: "bg-amber/10 text-amber border-amber/30",
    mute: "bg-panel2 text-mute border-line",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] text-mute uppercase tracking-wide">{label}</span>
      <span className="mono-num text-sm font-semibold text-ice">{value}</span>
    </div>
  );
}

// Builds the chart series for the active range from the raw (ascending, mixed
// intraday + daily) history array the API returns.
//
// - "1D": keeps every point from today's calendar date, at whatever granularity
//   the live price-tick service produced them (so this is genuinely intraday,
//   rightmost = now, moving left = earlier today).
// - Everything else: filters to the window, then keeps only the LAST point of
//   each calendar day. This is deliberate — without it, a stock that's been
//   live-ticking for hours would flood a "1M"/"1Y" chart with today's dense
//   intraday noise while every earlier day only has a single seeded close,
//   which reads as a broken, uneven chart rather than a clean daily line.
function buildChartData(history, rangeKey) {
  if (!history?.length) return [];
  const rangeCfg = RANGES.find((r) => r.key === rangeKey) || RANGES[2];
  const now = new Date();

  let windowed;
  if (rangeKey === "1D") {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    windowed = history.filter((h) => new Date(h.date) >= startOfToday);
    // Server just started / no ticks yet today — fall back to the most recent
    // handful of points so the panel isn't empty, rather than showing nothing.
    if (windowed.length < 2) windowed = history.slice(-Math.min(20, history.length));
  } else if (rangeCfg.days === Infinity) {
    windowed = history;
  } else {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - rangeCfg.days);
    windowed = history.filter((h) => new Date(h.date) >= cutoff);
  }

  let points;
  if (rangeKey === "1D") {
    points = windowed;
  } else {
    // Keep only the last entry per calendar day (Map preserves insertion order,
    // and `windowed` is already ascending, so re-inserting a key just updates
    // its value in place — the resulting order stays chronological).
    const byDay = new Map();
    for (const h of windowed) {
      const d = new Date(h.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      byDay.set(key, h);
    }
    points = Array.from(byDay.values());
  }

  const basePrice = points[0]?.close ?? 0;
  return points.map((h) => ({
    label: rangeKey === "1D" ? formatTime(h.date) : formatDate(h.date),
    full: h.date,
    price: h.close,
    pctChange: basePrice > 0 ? ((h.close - basePrice) / basePrice) * 100 : 0,
  }));
}

function ChartTooltip({ active, payload, rangeKey }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const changeUp = point.pctChange >= 0;
  return (
    <div className="bg-panel border border-line rounded-lg px-3 py-2 shadow-card">
      <div className="text-[11px] text-mute mb-1">
        {rangeKey === "1D" ? formatDateTime(point.full) : formatDate(point.full)}
      </div>
      <div className="mono-num text-sm font-semibold text-ice">{formatCurrency(point.price)}</div>
      <div className={`mono-num text-[11px] ${changeUp ? "text-mint" : "text-rose"}`}>
        {formatPercent(point.pctChange)} <span className="text-mute">since range start</span>
      </div>
    </div>
  );
}

// Pulsing marker for the most recent point on the chart — reads as "this is
// happening right now" rather than a static endpoint.
function LivePriceDot({ cx, cy, fill }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={9} fill={fill} opacity={0.3}>
        <animate attributeName="r" values="6;13;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#0B1220" strokeWidth={1.5} />
    </g>
  );
}

export default function StockDetails() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: stock, history, list: stockList, detailStatus, detailId } = useSelector((s) => s.stocks);
  const { items: watchlistItems } = useSelector((s) => s.watchlist);
  const { holdings } = useSelector((s) => s.portfolio);
  const { user } = useSelector((s) => s.auth);
  const [quantity, setQuantity] = useState(1);
  const [trading, setTrading] = useState(false);
  const [range, setRange] = useState("1M");
  const [hoverPrice, setHoverPrice] = useState(null);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [brushRange, setBrushRange] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const pollRef = useRef(null);

  // Fresh load whenever the route's stock id changes.
  useEffect(() => {
    setInitialLoaded(false);
    dispatch(fetchStockById(id));
    dispatch(fetchWatchlist());
    dispatch(fetchStocks());
    dispatch(fetchPortfolio());
  }, [dispatch, id]);

  // Flip on once this id's detail fetch has actually succeeded, so background
  // polling below never has to show the full-page loader again.
  useEffect(() => {
    if (detailStatus === "succeeded" && detailId === id) setInitialLoaded(true);
  }, [detailStatus, detailId, id]);

  // Keep the price + chart "live" in the background, matching how often the
  // server itself ticks prices (see LIVE_POLL_MS). This is a silent refresh —
  // it never re-triggers the full-page loader once the page has loaded once.
  useEffect(() => {
    pollRef.current = setInterval(() => {
      dispatch(fetchStockById(id));
    }, LIVE_POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [dispatch, id]);

  const chartData = useMemo(() => buildChartData(history, range), [history, range]);

  // Dragging the Brush shouldn't carry a zoom window over from a different
  // timeframe tab, or point at indices that no longer exist once the series
  // length changes (e.g. switching 1D -> 1Y).
  useEffect(() => {
    setBrushRange(null);
  }, [range]);

  // The live background poll refreshes `history` (and therefore `chartData`)
  // every 15s with a brand-new array reference, even though it's usually just
  // appending one new point. An UNCONTROLLED Brush treats that as an entirely
  // new dataset and silently resets the zoom back to full view — which is
  // exactly the "zooms back out while I'm inspecting it" bug. Clamping the
  // existing indices (rather than clearing them) keeps the user's zoom window
  // stable across live refreshes; it's only cleared outright on a genuine
  // timeframe switch above.
  useEffect(() => {
    setBrushRange((prev) => {
      if (!prev) return prev;
      const maxIndex = Math.max(chartData.length - 1, 0);
      if (prev.endIndex <= maxIndex && prev.startIndex <= maxIndex) return prev;
      return { startIndex: Math.min(prev.startIndex, maxIndex), endIndex: maxIndex };
    });
  }, [chartData.length]);

  // The slice actually visible right now — either the full series, or the
  // user's zoomed-in Brush window.
  const visibleData = brushRange
    ? chartData.slice(brushRange.startIndex, brushRange.endIndex + 1)
    : chartData;

  // Recharts does NOT automatically rescale the Y axis to a Brush-zoomed
  // window — by default it keeps computing "auto" off the FULL series. That's
  // exactly what caused the zoomed-in line to look squashed against one edge
  // with a flat "step" at the end instead of filling the chart cleanly. Here
  // we compute the domain from whatever's actually visible, with a little
  // padding so the line never touches the very top/bottom.
  const yDomain = useMemo(() => {
    if (!visibleData.length) return ["auto", "auto"];
    const prices = visibleData.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.1 || max * 0.01 || 1;
    return [min - pad, max + pad];
  }, [visibleData]);

  // Gate strictly on THIS id's detail fetch, not the unrelated stock-list
  // status and not a stale `stock` object left over from a previous page.
  // `initialLoaded` ensures the background live-poll (above) never flashes
  // this loader again once the page has successfully loaded once.
  const isLoadingThisStock = !initialLoaded && (detailStatus === "loading" || detailId !== id);
  if (isLoadingThisStock) return <FullPageLoader label="Loading stock details" />;
  if (detailStatus === "failed" && !stock) {
    return (
      <div className="card text-center py-16">
        <p className="text-mute mb-4">This stock couldn't be loaded.</p>
        <button onClick={() => dispatch(fetchStockById(id))} className="btn-primary inline-flex">
          Try again
        </button>
      </div>
    );
  }
  if (!stock) return <FullPageLoader label="Loading stock details" />;

  const up = stock.changePercent >= 0;
  const inWatchlist = watchlistItems.some((i) => i.stockId?._id === stock._id);
  const estTotal = stock.currentPrice * (Number(quantity) || 0);
  const insufficientFunds = estTotal > (user?.walletBalance ?? 0);

  // The user's current position in this stock, if any. Recomputed from live
  // Redux state on every render, so it updates instantly the moment a trade
  // resolves (executeTrade always refetches the portfolio) and also tracks
  // the live price ticks polled above — no page reload needed either way.
  const holding = holdings.find((h) => String(h.stockId?._id) === String(stock._id));
  const ownsStock = Boolean(holding && holding.quantity > 0);
  const totalInvestment = ownsStock ? holding.quantity * holding.averagePrice : 0;
  const currentHoldingValue = ownsStock ? holding.quantity * stock.currentPrice : 0;
  const holdingPL = currentHoldingValue - totalInvestment;
  const holdingPLPercent = totalInvestment > 0 ? (holdingPL / totalInvestment) * 100 : 0;

  const trade = async (type) => {
    setTrading(true);
    try {
      const data = await dispatch(
        executeTrade({ type, stockId: stock._id, quantity: Number(quantity) })
      ).unwrap();
      dispatch(showToast({ type: "success", message: data.message }));
    } catch (message) {
      dispatch(showToast({ type: "error", message: message || "Trade failed" }));
    } finally {
      setTrading(false);
    }
  };

  const toggleWatchlist = () => {
    if (inWatchlist) dispatch(removeFromWatchlist(stock._id));
    else dispatch(addToWatchlist(stock._id));
  };

  // Simple rule-based insight from momentum + position in the 52-week range — not real analysis
  const rangeSpan = (stock.week52High || 1) - (stock.week52Low || 0);
  const rangePosition = rangeSpan > 0 ? ((stock.currentPrice - stock.week52Low) / rangeSpan) * 100 : 50;
  let sentiment = { label: "Neutral", tone: "amber", Icon: Minus };
  if (stock.changePercent > 0.5 && rangePosition > 55) sentiment = { label: "Bullish", tone: "mint", Icon: TrendingUp };
  else if (stock.changePercent < -0.5 && rangePosition < 45) sentiment = { label: "Bearish", tone: "rose", Icon: TrendingDown };

  const chartUp = chartData.length > 1 ? chartData[chartData.length - 1].price >= chartData[0].price : up;
  const chartColor = chartUp ? "#2FE6A6" : "#FF5C7A";
  const rangeChangePct = chartData.length ? chartData[chartData.length - 1].pctChange : 0;
  const lastPoint = chartData[chartData.length - 1];

  return (
    <>
    <div className="grid lg:grid-cols-[1fr_320px] gap-8">
      <div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {stock.logo && <img src={stock.logo} alt={stock.symbol} className="w-10 h-10 rounded-lg border border-line" />}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-3xl font-bold">{stock.symbol}</h1>
                  {stock.isFeatured && <Badge tone="mint">Featured</Badge>}
                  {stock.isTrending && <Badge tone="amber">Trending</Badge>}
                </div>
                <p className="text-mute">{stock.companyName} · {stock.sector}</p>
              </div>
            </div>
            <button onClick={toggleWatchlist} className="btn-ghost !px-3">
              <Star size={18} className={inWatchlist ? "fill-gold text-gold" : ""} />
            </button>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="mono-num text-4xl font-bold">{formatCurrency(stock.currentPrice)}</span>
            <span className={`flex items-center gap-1 mono-num text-sm ${up ? "text-mint" : "text-rose"}`}>
              {up ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {formatCurrency(Math.abs(stock.change))} ({formatPercent(stock.changePercent)})
            </span>
            <span className="flex items-center gap-1 text-[11px] text-mute">
              <Radio size={11} className="text-mint animate-pulse" /> Live
            </span>
          </div>
        </motion.div>

        {/* Your Holding — instantly reflects every Buy/Sell via the portfolio slice */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={16} className="text-mint" />
            <h3 className="font-display font-semibold">Your holding</h3>
          </div>
          {ownsStock ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4 mb-5">
                <StatTile label="Shares owned" value={holding.quantity} />
                <StatTile label="Avg buy price" value={formatCurrency(holding.averagePrice)} />
                <StatTile label="Current price" value={formatCurrency(stock.currentPrice)} />
                <StatTile label="Total investment" value={formatCurrency(totalInvestment)} />
                <StatTile label="Current value" value={formatCurrency(currentHoldingValue)} />
              </div>
              <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                holdingPL >= 0 ? "bg-mint/10 border-mint/30" : "bg-rose/10 border-rose/30"
              }`}>
                <span className="text-xs text-mute">Profit / loss</span>
                <span className={`flex items-center gap-1.5 mono-num text-sm font-semibold ${holdingPL >= 0 ? "text-mint" : "text-rose"}`}>
                  {holdingPL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {formatCurrency(holdingPL)} ({formatPercent(holdingPLPercent)})
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-mute">You don't own this stock.</p>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1 flex-wrap">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                    range === r.key ? "bg-mint/10 text-mint" : "text-mute hover:text-ice"
                  }`}
                >
                  {r.key}
                </button>
              ))}
            </div>
            {chartData.length > 1 && (
              <span className={`mono-num text-xs font-medium ${rangeChangePct >= 0 ? "text-mint" : "text-rose"}`}>
                {formatPercent(rangeChangePct)} this {range === "1D" ? "day" : range.toLowerCase()}
              </span>
            )}
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-mute hover:text-ice transition-colors p-1.5 rounded-md hover:bg-panel2"
              title={expanded ? "Collapse chart" : "Expand chart"}
              aria-label={expanded ? "Collapse chart" : "Expand chart"}
            >
              {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
          <div className={expanded ? "h-[32rem] transition-[height] duration-300" : "h-72 transition-[height] duration-300"}>
            {chartData.length > 1 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={range}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35 }}
                  className="w-full h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      onMouseMove={(e) => {
                        const v = e?.activePayload?.[0]?.value;
                        setHoverPrice(typeof v === "number" ? v : null);
                      }}
                      onMouseLeave={() => setHoverPrice(null)}
                      margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={chartColor} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1E2A3F" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" hide />
                      <YAxis domain={yDomain} hide />
                      <Tooltip
                        content={<ChartTooltip rangeKey={range} />}
                        cursor={{ stroke: "#8592AB", strokeDasharray: "4 4", strokeWidth: 1 }}
                      />
                      {hoverPrice != null && (
                        <ReferenceLine
                          y={hoverPrice}
                          stroke="#8592AB"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          ifOverflow="extendDomain"
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartColor}
                        strokeWidth={2}
                        fill="url(#priceGradient)"
                        isAnimationActive={false}
                      />
                      {lastPoint && (
                        <ReferenceDot
                          x={lastPoint.label}
                          y={lastPoint.price}
                          r={4}
                          fill={chartColor}
                          shape={<LivePriceDot fill={chartColor} />}
                          isFront
                        />
                      )}
                      {chartData.length > 3 && (
                        <Brush
                          dataKey="label"
                          height={22}
                          stroke={chartColor}
                          fill="#0B1220"
                          travellerWidth={8}
                          tickFormatter={() => ""}
                          startIndex={brushRange ? brushRange.startIndex : 0}
                          endIndex={brushRange ? brushRange.endIndex : chartData.length - 1}
                          onChange={(r) => {
                            if (r && typeof r.startIndex === "number" && typeof r.endIndex === "number") {
                              setBrushRange({ startIndex: r.startIndex, endIndex: r.endIndex });
                            }
                          }}
                        />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex items-center justify-center text-mute text-sm text-center px-6">
                Price history will populate as the market ticks (check back shortly).
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card mt-6">
          <h3 className="font-display font-semibold mb-4">Price statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-5 gap-x-4">
            <StatTile label="Open" value={formatCurrency(stock.openPrice)} />
            <StatTile label="Prev close" value={formatCurrency(stock.prevClose)} />
            <StatTile label="Day high" value={formatCurrency(stock.dayHigh)} />
            <StatTile label="Day low" value={formatCurrency(stock.dayLow)} />
            <StatTile label="52W high" value={formatCurrency(stock.week52High)} />
            <StatTile label="52W low" value={formatCurrency(stock.week52Low)} />
            <StatTile label="Market cap" value={formatCompact(stock.marketCap)} />
            <StatTile label="Volume" value={stock.volume?.toLocaleString("en-IN")} />
            <StatTile label="P/E ratio" value={stock.peRatio?.toFixed(1)} />
            <StatTile label="EPS" value={formatCurrency(stock.eps)} />
            <StatTile label="Dividend yield" value={`${stock.dividendYield?.toFixed(2)}%`} />
            <StatTile label="Beta" value={stock.beta?.toFixed(2)} />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold">Investment insight</h3>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
              sentiment.tone === "mint" ? "bg-mint/10 text-mint border-mint/30" :
              sentiment.tone === "rose" ? "bg-rose/10 text-rose border-rose/30" :
              "bg-amber/10 text-amber border-amber/30"
            }`}>
              <sentiment.Icon size={14} /> {sentiment.label}
            </span>
          </div>
          <p className="text-sm text-mute leading-relaxed">
            Based on recent momentum ({formatPercent(stock.changePercent)}) and its position in the 52-week
            range ({rangePosition.toFixed(0)}th percentile), this stock currently reads {sentiment.label.toLowerCase()}.
          </p>
          <p className="text-[11px] text-mute/70 mt-3 italic">
            Simple rule-based heuristic, not real financial analysis. Educational purposes only.
          </p>
        </motion.div>

        {stock.about && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card mt-6">
            <h3 className="font-display font-semibold mb-4">About {stock.companyName}</h3>
            <p className="text-sm text-mute leading-relaxed mb-5">{stock.about}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
              <div className="flex items-center gap-2 text-mute"><Building2 size={14} /> {stock.industry}</div>
              <div className="flex items-center gap-2 text-mute"><UserIcon size={14} /> {stock.ceo}</div>
              <div className="flex items-center gap-2 text-mute"><Calendar size={14} /> Founded {stock.founded}</div>
              <div className="flex items-center gap-2 text-mute"><MapPin size={14} /> {stock.headquarters}</div>
              <div className="flex items-center gap-2 text-mute"><Users size={14} /> {stock.employees} employees</div>
            </div>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="card h-fit sticky top-24">
        <h3 className="font-display font-semibold mb-1">Trade {stock.symbol}</h3>
        <div className="flex items-center gap-1.5 text-xs text-mute mb-4">
          <Wallet size={13} /> Balance: <span className="mono-num text-ice">{formatCurrency(user?.walletBalance ?? 0)}</span>
        </div>

        <label className="text-xs text-mute mb-1 block">Quantity</label>
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, Number(q) - 1))}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-line hover:border-mint/60 hover:text-mint transition-colors"
          >
            <MinusIcon size={14} />
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full text-center bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => Number(q) + 1)}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-lg border border-line hover:border-mint/60 hover:text-mint transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex justify-between text-sm text-mute mb-2">
          <span>Est. total</span>
          <span className="mono-num text-ice">{formatCurrency(estTotal)}</span>
        </div>

        {insufficientFunds && (
          <p className="text-[11px] text-rose mb-3">Order exceeds your available balance.</p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => trade("buy")}
            disabled={trading || insufficientFunds}
            className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {trading ? <Loader2 className="animate-spin" size={16} /> : "Buy"}
          </button>
          <button onClick={() => trade("sell")} disabled={trading} className="btn-danger flex-1">
            {trading ? <Loader2 className="animate-spin" size={16} /> : "Sell"}
          </button>
        </div>
        <p className="text-[10px] text-mute/70 mt-3">
          Client-side balance check for UX only — the server remains the source of truth for order validation.
        </p>
      </motion.div>
    </div>

    <RelatedStocks current={stock} list={stockList} />
    </>
  );
}
