import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatPercent } from "../utils/formatters";

export default function StockCard({ stock, index = 0 }) {
  const up = stock.changePercent >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotateX: -6 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={{ y: -6, rotateX: 4, boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Link to={`/stocks/${stock._id}`} className="card flex flex-col gap-3 hover:border-mint/40 transition-colors group">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display font-bold text-ice">{stock.symbol}</p>
            <p className="text-xs text-mute truncate max-w-[140px]">{stock.companyName}</p>
          </div>
          <span
            className={`flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-md ${
              up ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"
            }`}
          >
            {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {formatPercent(stock.changePercent)}
          </span>
        </div>
        <p className="mono-num text-2xl font-semibold text-ice group-hover:text-mint transition-colors">
          {formatCurrency(stock.currentPrice)}
        </p>
        <p className="text-xs text-mute">{stock.sector}</p>
      </Link>
    </motion.div>
  );
}
