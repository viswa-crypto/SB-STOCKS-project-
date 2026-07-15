import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatPercent } from "../utils/formatters";

// Full holdings table per spec: stock+logo, qty, avg buy price, market price, investment,
// current value, P/L with icon badge, P/L%, today's change.
export default function HoldingsTable({ holdings }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-mute border-b border-line">
            <th className="py-2 pr-4">Stock</th>
            <th className="py-2 pr-4">Qty</th>
            <th className="py-2 pr-4">Avg buy price</th>
            <th className="py-2 pr-4">Market price</th>
            <th className="py-2 pr-4">Investment</th>
            <th className="py-2 pr-4">Current value</th>
            <th className="py-2 pr-4">P/L</th>
            <th className="py-2 pr-4">P/L %</th>
            <th className="py-2">Today's change</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((h) => {
            const stock = h.stockId;
            const investment = h.quantity * h.averagePrice;
            const plPositive = h.profitLoss >= 0;
            const plPercent = investment > 0 ? (h.profitLoss / investment) * 100 : 0;
            const todayUp = (stock?.changePercent ?? 0) >= 0;
            return (
              <tr key={h._id} className="border-b border-line/50 last:border-0 transition-colors hover:bg-panel2/60">
                <td className="py-3 pr-4">
                  <Link to={`/stocks/${stock?._id}`} className="flex items-center gap-2 font-medium hover:text-mint">
                    {stock?.logo && <img src={stock.logo} alt={stock.symbol} className="w-6 h-6 rounded-md border border-line" />}
                    {stock?.symbol}
                  </Link>
                </td>
                <td className="py-3 pr-4 mono-num">{h.quantity}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(h.averagePrice)}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(stock?.currentPrice)}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(investment)}</td>
                <td className="py-3 pr-4 mono-num">{formatCurrency(h.currentValue)}</td>
                <td className="py-3 pr-4 mono-num">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                    plPositive ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"
                  }`}>
                    {plPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {formatCurrency(Math.abs(h.profitLoss))}
                  </span>
                </td>
                <td className={`py-3 pr-4 mono-num ${plPositive ? "text-mint" : "text-rose"}`}>
                  {formatPercent(plPercent)}
                </td>
                <td className={`py-3 mono-num ${todayUp ? "text-mint" : "text-rose"}`}>
                  {formatPercent(stock?.changePercent ?? 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
