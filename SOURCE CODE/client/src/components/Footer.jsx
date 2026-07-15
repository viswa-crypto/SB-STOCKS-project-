import { TrendingUp } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-line mt-24">
      <div className="max-w-7xl mx-auto px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-mute">
        <div className="flex items-center gap-2 font-display font-semibold text-ice">
          <TrendingUp className="text-mint" size={18} /> SB Stocks
        </div>
        <p>Simulated trading with virtual funds. No real money, no real risk — all the reps.</p>
        <p>© {new Date().getFullYear()} SB Stocks</p>
      </div>
    </footer>
  );
}
