import { Link } from "react-router-dom";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { formatCurrency, formatPercent } from "../utils/formatters";

// Builds simple, explainable recommendation groups from the currently loaded
// stock list. No ML involved — reasoning is derived from plain rules so the
// "why" shown to the user is always accurate to how the pick was made.
function buildRecommendations(current, list) {
  if (!current || !list?.length) return { similar: [], trending: [] };

  const others = list.filter((s) => s._id !== current._id);

  const similar = others
    .filter((s) => s.sector === current.sector)
    .sort((a, b) => Math.abs(a.currentPrice - current.currentPrice) - Math.abs(b.currentPrice - current.currentPrice))
    .slice(0, 4)
    .map((s) => ({ stock: s, reason: `Same ${s.sector} sector as ${current.symbol}` }));

  const trending = [...others]
    .filter((s) => !similar.some((r) => r.stock._id === s._id))
    .sort((a, b) => (b.isTrending === a.isTrending ? b.changePercent - a.changePercent : b.isTrending ? 1 : -1))
    .slice(0, 4)
    .map((s) => ({
      stock: s,
      reason: s.isTrending ? "Trending across the platform today" : "Strong momentum today",
    }));

  return { similar, trending };
}

function RecCard({ stock, reason }) {
  const up = stock.changePercent >= 0;
  return (
    <Link
      to={`/stocks/${stock._id}`}
      className="card group flex flex-col hover:border-mint/40 hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {stock.logo ? (
            <img src={stock.logo} alt={stock.symbol} className="w-8 h-8 rounded-full border border-line object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-line bg-panel2 flex items-center justify-center font-display text-[10px] font-bold text-mint shrink-0">
              {stock.symbol?.slice(0, 2)}
            </div>
          )}
          <p className="font-display font-bold text-sm truncate">{stock.symbol}</p>
        </div>
        <span className={`shrink-0 text-[11px] font-mono px-2 py-0.5 rounded-md ${up ? "bg-mint/10 text-mint" : "bg-rose/10 text-rose"}`}>
          {formatPercent(stock.changePercent)}
        </span>
      </div>
      <p className="mono-num text-lg font-semibold mb-2">{formatCurrency(stock.currentPrice)}</p>
      <p className="text-[11px] text-mute leading-relaxed mt-auto flex items-start gap-1">
        <Sparkles size={12} className="text-gold shrink-0 mt-0.5" /> {reason}
      </p>
      <span className="mt-3 text-[11px] text-mint font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
        View details <ArrowUpRight size={12} />
      </span>
    </Link>
  );
}

export default function RelatedStocks({ current, list }) {
  const { similar, trending } = buildRecommendations(current, list);

  if (!similar.length && !trending.length) return null;

  return (
    <div className="mt-10 space-y-8">
      {similar.length > 0 && (
        <div>
          <h3 className="font-display font-semibold mb-4">Similar stocks</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {similar.map(({ stock, reason }) => (
              <RecCard key={stock._id} stock={stock} reason={reason} />
            ))}
          </div>
        </div>
      )}
      {trending.length > 0 && (
        <div>
          <h3 className="font-display font-semibold mb-4">Trending investments</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trending.map(({ stock, reason }) => (
              <RecCard key={stock._id} stock={stock} reason={reason} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
