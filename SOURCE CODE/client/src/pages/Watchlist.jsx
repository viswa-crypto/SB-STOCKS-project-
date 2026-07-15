import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Star, Trash2, Pin, BellRing, Bell, Search, GitCompare, Check } from "lucide-react";
import {
  fetchWatchlist,
  removeFromWatchlist,
  togglePinWatchlistItem,
  setWatchlistAlert,
} from "../redux/slices/watchlistSlice";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency, formatPercent } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";

const SORT_OPTIONS = [
  { value: "pinned", label: "Pinned first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "price", label: "Price (high–low)" },
  { value: "change", label: "Today's change" },
];

function AlertPopover({ item, onClose }) {
  const dispatch = useDispatch();
  const [value, setValue] = useState(item.targetPrice ?? "");

  const save = () => {
    const num = value === "" ? null : Number(value);
    dispatch(setWatchlistAlert({ stockId: item.stockId?._id, targetPrice: num })).then(() => {
      dispatch(showToast({ type: "success", message: num ? `Alert set at ${formatCurrency(num)}` : "Alert cleared" }));
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.97 }}
      className="absolute right-0 top-full mt-2 w-56 card !p-3 z-20"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs text-mute mb-2">Notify me when price reaches</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Target price"
          className="w-full bg-panel2 border border-line rounded-lg px-2 py-1.5 text-sm mono-num focus:outline-none focus:border-mint transition-colors"
        />
        <button onClick={save} className="btn-primary !px-2 !py-1.5">
          <Check size={14} />
        </button>
      </div>
      <p className="text-[11px] text-mute mt-2">
        We'll auto-detect the direction — {item.stockId?.currentPrice != null && value !== "" && !Number.isNaN(Number(value))
          ? Number(value) >= item.stockId.currentPrice
            ? "triggers when the price rises to this level."
            : "triggers when the price falls to this level."
          : "above current price triggers on a rise, below triggers on a fall."}
        {" "}You'll get a toast notification (and a desktop alert, if enabled) the moment it hits.
      </p>
    </motion.div>
  );
}

export default function Watchlist() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status } = useSelector((s) => s.watchlist);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("pinned");
  const [selected, setSelected] = useState([]);
  const [alertOpenFor, setAlertOpenFor] = useState(null);

  useEffect(() => {
    dispatch(fetchWatchlist());
  }, [dispatch]);

  const filtered = useMemo(() => {
    let list = items.filter((item) => {
      const s = item.stockId;
      if (!s) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return s.symbol?.toLowerCase().includes(q) || s.companyName?.toLowerCase().includes(q);
    });

    list = [...list].sort((a, b) => {
      const sa = a.stockId, sb = b.stockId;
      switch (sortBy) {
        case "name":
          return sa?.symbol?.localeCompare(sb?.symbol);
        case "price":
          return (sb?.currentPrice || 0) - (sa?.currentPrice || 0);
        case "change":
          return (sb?.changePercent || 0) - (sa?.changePercent || 0);
        case "pinned":
        default:
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return sa?.symbol?.localeCompare(sb?.symbol);
      }
    });
    return list;
  }, [items, query, sortBy]);

  const toggleSelect = (stockId) => {
    setSelected((prev) => {
      if (prev.includes(stockId)) return prev.filter((id) => id !== stockId);
      if (prev.length >= 4) {
        dispatch(showToast({ type: "error", message: "You can compare up to 4 stocks at a time" }));
        return prev;
      }
      return [...prev, stockId];
    });
  };

  const goCompare = () => {
    if (selected.length < 2) {
      dispatch(showToast({ type: "error", message: "Select at least 2 stocks to compare" }));
      return;
    }
    navigate(`/compare?ids=${selected.join(",")}`);
  };

  if (status === "loading" && items.length === 0) return <FullPageLoader label="Loading your watchlist" />;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold mb-1">
            Watchlist
          </motion.h1>
          <p className="text-mute">Stocks you're keeping an eye on.</p>
        </div>

        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={14} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter watchlist..."
                className="bg-panel2 border border-line rounded-lg pl-8 pr-3 py-2 text-sm w-44 focus:outline-none focus:border-mint transition-colors"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-panel2 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mint transition-colors"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="card !py-3 flex flex-wrap items-center justify-between gap-3 border-mint/30">
              <div className="flex items-center gap-2 text-sm">
                <GitCompare size={16} className="text-mint" />
                <span>{selected.length} selected for comparison</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected([])} className="btn-ghost !py-1.5 !px-3 text-sm">
                  Clear
                </button>
                <button onClick={goCompare} className="btn-primary !py-1.5 !px-3 text-sm">
                  Compare now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <div className="card text-center py-16">
          <Star className="mx-auto text-mute mb-3" />
          <p className="text-mute mb-4">Your watchlist is empty.</p>
          <Link to="/stocks" className="btn-primary inline-flex">
            Find stocks to track
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-mute">No stocks match "{query}".</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.map((item) => {
              const stock = item.stockId;
              const up = stock?.changePercent >= 0;
              const isSelected = selected.includes(stock?._id);
              const alertTriggered = Boolean(item.alertTriggeredAt);
              const alertDirectionWord = item.alertDirection === "below" ? "falls to" : "rises to";
              return (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`card relative transition-colors ${isSelected ? "border-mint/50 bg-mint/5" : ""}`}
                >
                  {item.pinned && (
                    <span className="absolute -top-2 -left-2 bg-gold text-ink rounded-full p-1 shadow">
                      <Pin size={10} fill="currentColor" />
                    </span>
                  )}

                  <div className="flex items-start justify-between mb-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(stock?._id)}
                        className="mt-1 accent-mint"
                      />
                      <Link to={`/stocks/${stock?._id}`} className="hover:text-mint">
                        <p className="font-display font-bold">{stock?.symbol}</p>
                        <p className="text-xs text-mute">{stock?.companyName}</p>
                      </Link>
                    </label>

                    <div className="flex items-center gap-1 relative">
                      <button
                        onClick={() =>
                          dispatch(togglePinWatchlistItem({ stockId: stock?._id, pinned: !item.pinned }))
                        }
                        className={`p-1.5 rounded-lg transition-colors ${item.pinned ? "text-gold" : "text-mute hover:text-gold"}`}
                        title={item.pinned ? "Unpin" : "Pin to top"}
                      >
                        <Pin size={14} fill={item.pinned ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => setAlertOpenFor(alertOpenFor === item._id ? null : item._id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          alertTriggered ? "text-gold" : item.targetPrice ? "text-mint" : "text-mute hover:text-ice"
                        }`}
                        title="Set price alert"
                      >
                        {item.targetPrice ? <BellRing size={14} /> : <Bell size={14} />}
                      </button>
                      <button
                        onClick={() => dispatch(removeFromWatchlist(stock?._id))}
                        className="p-1.5 rounded-lg text-mute hover:text-rose transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                      <AnimatePresence>
                        {alertOpenFor === item._id && (
                          <AlertPopover item={item} onClose={() => setAlertOpenFor(null)} />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span className="mono-num text-xl font-semibold">{formatCurrency(stock?.currentPrice)}</span>
                    <span className={`mono-num text-sm ${up ? "text-mint" : "text-rose"}`}>
                      {formatPercent(stock?.changePercent)}
                    </span>
                  </div>

                  {item.targetPrice && (
                    <div className={`mt-2 flex items-center gap-1.5 text-[11px] ${alertTriggered ? "text-gold" : "text-mute"}`}>
                      {alertTriggered ? <BellRing size={11} /> : <Bell size={11} />}
                      Alert when price {alertDirectionWord} {formatCurrency(item.targetPrice)}
                      {alertTriggered && " · reached!"}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
