import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { X, Plus, GitCompare, FileDown } from "lucide-react";
import { fetchStocks } from "../redux/slices/stockSlice";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency, formatPercent } from "../utils/formatters";
import { exportComparisonPDF } from "../utils/pdfExport";
import api from "../services/api";
import FullPageLoader from "../components/FullPageLoader";

const COLORS = ["#2FE6A6", "#5C9BFF", "#F5A623", "#FF5C7A"];

// Compute % growth over the trailing N calendar days from a MarketData history array
function growthOverDays(history, days) {
  if (!history || history.length < 2) return null;
  const last = history[history.length - 1];
  const cutoff = new Date(last.date).getTime() - days * 24 * 60 * 60 * 1000;
  let base = history[0];
  for (const point of history) {
    if (new Date(point.date).getTime() <= cutoff) base = point;
    else break;
  }
  if (!base?.close) return null;
  return ((last.close - base.close) / base.close) * 100;
}

function volatility(history) {
  if (!history || history.length < 3) return null;
  const closes = history.map((h) => h.close).filter(Boolean);
  const returns = [];
  for (let i = 1; i < closes.length; i++) returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.sqrt(variance) * 100;
}

const ROWS = [
  { key: "currentPrice", label: "Current Price", format: (s) => formatCurrency(s.stock.currentPrice) },
  { key: "changePercent", label: "Today's Change", format: (s) => formatPercent(s.stock.changePercent), colorize: true, raw: (s) => s.stock.changePercent },
  { key: "week", label: "Weekly Growth", format: (s) => (s.weekGrowth == null ? "—" : formatPercent(s.weekGrowth)), colorize: true, raw: (s) => s.weekGrowth },
  { key: "month", label: "Monthly Growth", format: (s) => (s.monthGrowth == null ? "—" : formatPercent(s.monthGrowth)), colorize: true, raw: (s) => s.monthGrowth },
  { key: "year", label: "Yearly Growth", format: (s) => (s.yearGrowth == null ? "—" : formatPercent(s.yearGrowth)), colorize: true, raw: (s) => s.yearGrowth },
  { key: "marketCap", label: "Market Cap", format: (s) => (s.stock.marketCap ? `₹${(s.stock.marketCap / 1e7).toFixed(0)} Cr` : "—") },
  { key: "peRatio", label: "P/E Ratio", format: (s) => s.stock.peRatio || "—" },
  { key: "dividendYield", label: "Dividend Yield", format: (s) => (s.stock.dividendYield ? `${s.stock.dividendYield}%` : "—") },
  { key: "volatility", label: "Volatility (est.)", format: (s) => (s.vol == null ? "—" : `${s.vol.toFixed(2)}%`) },
];

function StockPicker({ excludeIds, onPick }) {
  const dispatch = useDispatch();
  const { list } = useSelector((s) => s.stocks);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (list.length === 0) dispatch(fetchStocks());
  }, [dispatch, list.length]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list
      .filter((s) => !excludeIds.includes(s._id))
      .filter((s) => !q || s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [list, query, excludeIds]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="card w-full h-full min-h-[180px] flex flex-col items-center justify-center gap-2 border-dashed hover:border-mint/50 transition-colors text-mute hover:text-mint"
      >
        <Plus size={22} />
        <span className="text-sm">Add stock to compare</span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 left-0 right-0 card !p-2 z-20 max-h-72 overflow-y-auto"
        >
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks..."
            className="w-full bg-panel2 border border-line rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-mint"
          />
          {results.map((s) => (
            <button
              key={s._id}
              onClick={() => {
                onPick(s._id);
                setOpen(false);
                setQuery("");
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left hover:bg-panel2 transition-colors"
            >
              <span>
                <span className="font-medium text-sm">{s.symbol}</span>
                <span className="text-xs text-mute ml-2">{s.companyName}</span>
              </span>
              <span className="mono-num text-xs text-mute">{formatCurrency(s.currentPrice)}</span>
            </button>
          ))}
          {results.length === 0 && <p className="text-xs text-mute px-3 py-2">No matches.</p>}
        </motion.div>
      )}
    </div>
  );
}

export default function Compare() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = useMemo(() => (searchParams.get("ids") || "").split(",").filter(Boolean), [searchParams]);
  const [stocksData, setStocksData] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const results = await Promise.all(
        ids.map(async (id) => {
          if (stocksData[id]) return [id, stocksData[id]];
          try {
            const { data } = await api.get(`/stocks/${id}`);
            const history = data.history || [];
            return [
              id,
              {
                stock: data.stock,
                history,
                weekGrowth: growthOverDays(history, 7),
                monthGrowth: growthOverDays(history, 30),
                yearGrowth: growthOverDays(history, 365),
                vol: volatility(history),
              },
            ];
          } catch {
            return [id, null];
          }
        })
      );
      if (!cancelled) {
        setStocksData((prev) => {
          const next = { ...prev };
          results.forEach(([id, val]) => { if (val) next[id] = val; });
          return next;
        });
        setLoading(false);
      }
    }
    if (ids.length) load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids.join(",")]);

  const addStock = (id) => {
    if (ids.length >= 4 || ids.includes(id)) return;
    setSearchParams({ ids: [...ids, id].join(",") });
  };

  const removeStock = (id) => {
    setSearchParams({ ids: ids.filter((i) => i !== id).join(",") });
  };

  const activeStocks = ids.map((id) => ({ id, ...stocksData[id] })).filter((s) => s.stock);

  const downloadReport = async () => {
    setExporting(true);
    try {
      await exportComparisonPDF(activeStocks);
    } catch {
      dispatch(showToast({ type: "error", message: "Couldn't generate the comparison report. Try again in a moment." }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-1">
        <div className="flex items-center gap-3">
          <GitCompare className="text-mint" size={24} />
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold">
            Stock Comparison
          </motion.h1>
        </div>
        {activeStocks.length >= 2 && (
          <button onClick={downloadReport} disabled={exporting} className="btn-ghost text-xs px-3.5 py-2 disabled:opacity-60">
            <FileDown size={14} /> {exporting ? "Generating..." : "Download Comparison Report"}
          </button>
        )}
      </div>
      <p className="text-mute mb-8">Compare up to 4 stocks side by side.</p>

      {loading && activeStocks.length === 0 ? (
        <FullPageLoader label="Loading comparison" />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {activeStocks.map((s, i) => {
              const up = s.stock.changePercent >= 0;
              const sparkData = s.history.slice(-30).map((h) => ({ v: h.close }));
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card relative"
                  style={{ borderTop: `3px solid ${COLORS[i % COLORS.length]}` }}
                >
                  <button
                    onClick={() => removeStock(s.id)}
                    className="absolute top-3 right-3 text-mute hover:text-rose transition-colors"
                  >
                    <X size={14} />
                  </button>
                  <Link to={`/stocks/${s.id}`} className="hover:text-mint">
                    <p className="font-display font-bold">{s.stock.symbol}</p>
                    <p className="text-xs text-mute truncate">{s.stock.companyName}</p>
                  </Link>
                  <p className="mono-num text-xl font-semibold mt-2">{formatCurrency(s.stock.currentPrice)}</p>
                  <span className={`mono-num text-xs ${up ? "text-mint" : "text-rose"}`}>
                    {formatPercent(s.stock.changePercent)}
                  </span>
                  {sparkData.length > 1 && (
                    <div className="h-12 mt-2 -mx-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparkData}>
                          <Line type="monotone" dataKey="v" stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </motion.div>
              );
            })}
            {activeStocks.length < 4 && <StockPicker excludeIds={ids} onPick={addStock} />}
          </div>

          {activeStocks.length >= 2 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-mute">
                    <th className="py-3 pr-4 font-medium">Metric</th>
                    {activeStocks.map((s) => (
                      <th key={s.id} className="py-3 px-4 font-medium text-ice">{s.stock.symbol}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row) => (
                    <tr key={row.key} className="border-b border-line/50 last:border-0">
                      <td className="py-3 pr-4 text-mute">{row.label}</td>
                      {activeStocks.map((s) => {
                        const raw = row.raw?.(s);
                        const colorClass = row.colorize && raw != null ? (raw >= 0 ? "text-mint" : "text-rose") : "";
                        return (
                          <td key={s.id} className={`py-3 px-4 mono-num ${colorClass}`}>
                            {row.format(s)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <div className="card text-center py-12 text-mute">Add at least 2 stocks to see the full comparison table.</div>
          )}
        </>
      )}

      {ids.length === 0 && (
        <div className="card text-center py-16 mt-8">
          <p className="text-mute mb-4">No stocks selected yet.</p>
          <button onClick={() => navigate("/watchlist")} className="btn-primary inline-flex">
            Pick from watchlist
          </button>
        </div>
      )}
    </div>
  );
}
