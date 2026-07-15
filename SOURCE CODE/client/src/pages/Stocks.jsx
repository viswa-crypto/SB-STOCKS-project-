import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { fetchStocks } from "../redux/slices/stockSlice";
import StockCard from "../components/StockCard";
import FullPageLoader from "../components/FullPageLoader";

const sorts = [
  { key: "", label: "All" },
  { key: "gainers", label: "Top gainers" },
  { key: "losers", label: "Top losers" },
  { key: "volume", label: "Most active" },
];

export default function Stocks() {
  const dispatch = useDispatch();
  const { list, status } = useSelector((s) => s.stocks);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");

  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchStocks({ search, sort })), 300);
    return () => clearTimeout(t);
  }, [dispatch, search, sort]);

  return (
    <div>
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold mb-1">
        Markets
      </motion.h1>
      <p className="text-mute mb-6">Browse and trade every stock available on SB Stocks.</p>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by symbol or company name…"
            className="w-full bg-panel2 border border-line rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-mint transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {sorts.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                sort === s.key ? "bg-mint/10 text-mint border border-mint/30" : "text-mute border border-line hover:text-ice"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" && list.length === 0 ? (
        <FullPageLoader label="Loading the market" />
      ) : list.length === 0 ? (
        <p className="text-mute text-center py-20">No stocks match your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {list.map((s, i) => (
            <StockCard stock={s} key={s._id} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
