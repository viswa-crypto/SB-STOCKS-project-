import { Outlet, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import Toast from "../components/Toast";

export default function AuthLayout() {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-panel to-ink border-r border-line relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-mint/10 blur-3xl" />
        <div className="absolute bottom-0 -left-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-xl z-10">
          <TrendingUp className="text-mint" /> SB <span className="text-mint">Stocks</span>
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="z-10"
        >
          <h2 className="font-display text-3xl font-bold leading-tight mb-3">
            Trade smarter.<br />Learn without risk.
          </h2>
          <p className="text-mute max-w-sm">
            Every account starts with ₹1,00,000 in virtual funds. Build real trading instincts before you
            put real capital on the line.
          </p>
        </motion.div>
        <p className="text-xs text-mute z-10">© {new Date().getFullYear()} SB Stocks — simulated trading only.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <Outlet />
      </div>
      <Toast />
    </div>
  );
}
