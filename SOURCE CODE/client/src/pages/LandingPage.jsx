import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, LineChart, Wallet, Zap, Quote } from "lucide-react";
import HeroScene from "../components/HeroScene";
import CountUp from "../components/CountUp";

const tickers = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "BHARTIARTL", "TATAMOTORS", "LT", "MARUTI"];

const features = [
  {
    icon: Wallet,
    title: "₹1,00,000 virtual bankroll",
    desc: "Every account starts fully funded with simulated capital — trade freely, no real money at risk.",
  },
  {
    icon: LineChart,
    title: "Live-feeling price action",
    desc: "Prices tick on a realistic simulation engine, so charts move the way real markets do.",
  },
  {
    icon: ShieldCheck,
    title: "Built for learning",
    desc: "Portfolio breakdowns, transaction history, and watchlists that mirror real brokerage tools.",
  },
  {
    icon: Zap,
    title: "Instant execution",
    desc: "Buy and sell orders settle immediately against your simulated wallet — no waiting.",
  },
];

const stats = [
  { end: 15, suffix: "+", label: "NSE stocks tracked" },
  { end: 1, prefix: "₹", suffix: "L", label: "Starting bankroll" },
  { end: 15, suffix: "s", label: "Price tick speed" },
  { end: 100, suffix: "%", label: "Risk-free" },
];

// Illustrative personas — not real user reviews
const testimonials = [
  { name: "Ananya R.", role: "Engineering student", quote: "Finally a place to test my trading ideas without touching real savings. The portfolio view alone taught me more than any course." },
  { name: "Rohan M.", role: "MBA aspirant", quote: "The instant order execution and live-feeling charts made the whole thing click for the first time." },
  { name: "Priya S.", role: "Early-career analyst", quote: "I use it to sanity-check strategies before I ever think about a real brokerage account." },
];

export default function LandingPage() {
  return (
    <div>
      {/* Ticker tape */}
      <div className="overflow-hidden border-b border-line bg-panel/60 -mx-5 px-5 py-2 mb-10">
        <div className="flex gap-10 w-max animate-ticker mono-num text-xs text-mute">
          {[...tickers, ...tickers].map((t, i) => (
            <span key={i} className="flex items-center gap-1">
              {t} <span className="text-mint">▲</span>
            </span>
          ))}
        </div>
      </div>

      {/* Hero */}
      <section className="grid md:grid-cols-2 gap-10 items-center min-h-[70vh] relative">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-xs tracking-[0.3em] text-mint mb-4">SIMULATED TRADING TERMINAL</p>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] mb-6">
            Trade the market.<br />
            <span className="text-mint">Risk nothing</span> but time.
          </h1>
          <p className="text-mute text-lg max-w-md mb-8">
            SB Stocks is a full-fidelity trading simulator — real market mechanics, virtual money.
            Build conviction, test strategies, and track every trade before you ever touch a live account.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className="btn-primary text-base">
              Start trading free <ArrowRight size={18} />
            </Link>
            <Link to="/stocks" className="btn-ghost text-base">
              Browse the market
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="h-[420px] md:h-[520px] relative"
        >
          <HeroScene />

        </motion.div>
      </section>

      {/* Stats */}
      <section className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="card text-center"
          >
            <p className="font-display text-3xl font-bold text-mint mb-1">
              <CountUp end={s.end} prefix={s.prefix} suffix={s.suffix} />
            </p>
            <p className="text-xs text-mute">{s.label}</p>
          </motion.div>
        ))}
      </section>

      {/* Features */}
      <section className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="card"
          >
            <f.icon className="text-mint mb-4" size={22} />
            <h3 className="font-display font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-mute">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      {/* Testimonials */}
      <section className="mt-24">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl font-bold mb-1">What traders are saying</h2>
          <p className="text-mute text-sm">Illustrative quotes from example personas, not verified user reviews.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="card"
            >
              <Quote className="text-mint/40 mb-3" size={22} />
              <p className="text-sm text-ice/90 mb-4 leading-relaxed">"{t.quote}"</p>
              <p className="text-sm font-semibold">{t.name}</p>
              <p className="text-xs text-mute">{t.role}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-24 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="card flex flex-col md:flex-row items-center justify-between gap-6 !p-10 border-mint/20"
        >
          <div>
            <h2 className="font-display text-2xl font-bold mb-2">Ready to place your first trade?</h2>
            <p className="text-mute">It takes less than a minute to open an account.</p>
          </div>
          <Link to="/register" className="btn-primary text-base shrink-0">
            Create free account <ArrowRight size={18} />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
