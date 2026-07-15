import { useMemo } from "react";
import { motion } from "framer-motion";

// Signature element: a live-terminal candlestick chart that draws itself in,
// with a glowing trend line, a sweeping scan pass, and a pulsing price
// cursor at the tip — a literal read of "simulated trading terminal"
// rather than a decorative abstract shape. Pure SVG/CSS: no external
// assets, no network dependency, cheap to render on any device.

const W = 640;
const H = 460;
const PAD = 28;

// Deterministic seeded "market" so the shape is stable across renders/SSR
// but still looks organic — a small pseudo-random walk seeded by index.
function buildCandles(count) {
  let price = 182;
  const seed = [3, -5, 7, -2, 9, -8, 4, 6, -3, 11, -6, 2, -9, 8, 5, -4, 10, -7, 3, -2, 12, -5, 6, -3, 9, -6, 4];
  const candles = [];
  for (let i = 0; i < count; i++) {
    const drift = seed[i % seed.length] * 0.9;
    const open = price;
    const close = open + drift;
    const high = Math.max(open, close) + 2 + Math.abs(seed[(i + 3) % seed.length]) * 0.35;
    const low = Math.min(open, close) - 2 - Math.abs(seed[(i + 5) % seed.length]) * 0.35;
    candles.push({ open, close, high, low });
    price = close;
  }
  return candles;
}

export default function HeroScene() {
  const candles = useMemo(() => buildCandles(22), []);

  const prices = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const step = innerW / candles.length;
  const bodyW = Math.max(4, step * 0.42);

  const y = (v) => PAD + (1 - (v - min) / range) * innerH;
  const x = (i) => PAD + step * i + step / 2;

  const trendPoints = candles.map((c, i) => `${x(i)},${y(c.close)}`).join(" ");
  const lastX = x(candles.length - 1);
  const lastY = y(candles[candles.length - 1].close);
  const lastPrice = candles[candles.length - 1].close;
  const firstPrice = candles[0].open;
  const up = lastPrice >= firstPrice;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full h-full rounded-2xl border border-line bg-panel/50 overflow-hidden"
    >
      {/* faint price grid */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--color-line) / 0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-line) / 0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* sweeping scan pass */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hero-scan h-full w-40" />
      </div>

      {/* live pill */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 mono-num text-[10px] text-mint">
        <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulseGlow" />
        LIVE · NIFTY SIM
      </div>

      {/* price readout at cursor */}
      <div
        className="absolute mono-num text-xs font-semibold px-2 py-1 rounded-md border shadow-card"
        style={{
          left: `${(lastX / W) * 100}%`,
          top: `${(lastY / H) * 100}%`,
          transform: "translate(-50%, -160%)",
          color: up ? "rgb(var(--color-mint))" : "rgb(var(--color-rose))",
          borderColor: up ? "rgb(var(--color-mint) / 0.4)" : "rgb(var(--color-rose) / 0.4)",
          background: up ? "rgb(var(--color-mint) / 0.1)" : "rgb(var(--color-rose) / 0.1)",
        }}
      >
        ₹{lastPrice.toFixed(2)}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full relative">
        <defs>
          <linearGradient id="trendGlow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(var(--color-gold))" stopOpacity="0.9" />
            <stop offset="100%" stopColor={up ? "rgb(var(--color-mint))" : "rgb(var(--color-rose))"} stopOpacity="1" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* candlesticks */}
        {candles.map((c, i) => {
          const isUp = c.close >= c.open;
          const color = isUp ? "rgb(var(--color-mint))" : "rgb(var(--color-rose))";
          const cx = x(i);
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyBottom = y(Math.min(c.open, c.close));
          return (
            <motion.g
              key={i}
              initial={{ opacity: 0, scaleY: 0.3 }}
              animate={{ opacity: 0.85, scaleY: 1 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.03, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: `${cx}px ${y(c.high)}px` }}
            >
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth="1.5" opacity="0.6" />
              <rect
                x={cx - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={Math.max(2, bodyBottom - bodyTop)}
                fill={color}
                opacity="0.55"
                rx="1.5"
              />
            </motion.g>
          );
        })}

        {/* glowing trend line drawing itself in */}
        <motion.polyline
          points={trendPoints}
          fill="none"
          stroke="url(#trendGlow)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* pulsing cursor at the tip of the line */}
        <circle cx={lastX} cy={lastY} r="4.5" fill={up ? "rgb(var(--color-mint))" : "rgb(var(--color-rose))"} filter="url(#glow)" />
        <circle cx={lastX} cy={lastY} r="4.5" fill="none" stroke={up ? "rgb(var(--color-mint))" : "rgb(var(--color-rose))"} strokeWidth="1.5" className="hero-ping" />
      </svg>
    </motion.div>
  );
}
