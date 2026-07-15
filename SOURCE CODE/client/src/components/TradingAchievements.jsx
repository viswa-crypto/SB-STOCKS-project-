import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Lock,
  Rocket,
  Layers,
  Globe2,
  Briefcase,
  Gem,
  Zap,
  Flame,
  ShieldCheck,
  Coins,
  TrendingUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Every achievement is derived entirely from data the Portfolio page already
// has in hand (holdings, transactions, portfolio totals, sector weights) —
// no new backend fields, no fabricated stats. "Collector"-style achievements
// (sector/stock count, trade count) are permanent progress markers, while
// portfolio-size and performance achievements reflect current live state, so
// they can rise or fall the same way the rest of the dashboard does.
// ---------------------------------------------------------------------------

function clampPercent(current, target) {
  if (target <= 0) return current >= target ? 100 : 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

export function buildAchievements({ holdings = [], transactions = [], analytics, sectorWeights = [] }) {
  const totalTrades = transactions.length;
  const sellCount = transactions.filter((t) => String(t.type).toUpperCase() === "SELL").length;
  const activeSectors = sectorWeights.filter((s) => s.weight > 0).length;
  const roi = analytics?.roi ?? 0;
  const diversificationScore = analytics?.diversificationScore ?? 0;

  const defs = [
    {
      id: "first-trade",
      title: "First Steps",
      description: "Execute your very first trade.",
      icon: Rocket,
      category: "Activity",
      current: totalTrades,
      target: 1,
    },
    {
      id: "active-trader",
      title: "Active Trader",
      description: "Complete 10 total trades.",
      icon: Zap,
      category: "Activity",
      current: totalTrades,
      target: 10,
    },
    {
      id: "power-trader",
      title: "Power Trader",
      description: "Complete 50 total trades.",
      icon: Flame,
      category: "Activity",
      current: totalTrades,
      target: 50,
    },
    {
      id: "first-sale",
      title: "First Payday",
      description: "Sell a position to realize a gain or loss.",
      icon: Coins,
      category: "Activity",
      current: sellCount,
      target: 1,
    },
    {
      id: "portfolio-builder",
      title: "Portfolio Builder",
      description: "Hold 5 different stocks at the same time.",
      icon: Briefcase,
      category: "Growth",
      current: holdings.length,
      target: 5,
    },
    {
      id: "blue-chip-collector",
      title: "Blue-Chip Collector",
      description: "Hold 10 different stocks at the same time.",
      icon: Gem,
      category: "Growth",
      current: holdings.length,
      target: 10,
    },
    {
      id: "diversified-investor",
      title: "Diversified Investor",
      description: "Spread holdings across 3 different sectors.",
      icon: Layers,
      category: "Risk",
      current: activeSectors,
      target: 3,
    },
    {
      id: "sector-master",
      title: "Sector Master",
      description: "Spread holdings across 5 different sectors.",
      icon: Globe2,
      category: "Risk",
      current: activeSectors,
      target: 5,
    },
    {
      id: "balanced-portfolio",
      title: "Balanced Portfolio",
      description: "Reach a diversification score of 70 or higher.",
      icon: ShieldCheck,
      category: "Risk",
      current: diversificationScore,
      target: 70,
    },
    {
      id: "in-the-green",
      title: "In the Green",
      description: "Get your overall return above 0%.",
      icon: TrendingUp,
      category: "Performance",
      current: roi,
      target: 0.0001,
    },
    {
      id: "rising-star",
      title: "Rising Star",
      description: "Reach a +10% overall return.",
      icon: TrendingUp,
      category: "Performance",
      current: roi,
      target: 10,
    },
    {
      id: "quarter-century",
      title: "Quarter Century",
      description: "Reach a +25% overall return.",
      icon: Trophy,
      category: "Performance",
      current: roi,
      target: 25,
    },
  ];

  return defs.map((d) => {
    const progress = clampPercent(d.current, d.target);
    return { ...d, progress, unlocked: progress >= 100 };
  });
}

export default function TradingAchievements({ holdings = [], transactions = [], analytics, sectorWeights = [] }) {
  const achievements = useMemo(
    () => buildAchievements({ holdings, transactions, analytics, sectorWeights }),
    [holdings, transactions, analytics, sectorWeights]
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="font-display font-semibold flex items-center gap-1.5">
            <Trophy size={16} className="text-gold" /> Trading achievements
          </h3>
          <p className="text-[11px] text-mute mt-0.5">Milestones earned from your real trading activity</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold">
          {unlockedCount}/{achievements.length} unlocked
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`relative rounded-xl border p-4 transition-colors ${
                a.unlocked ? "border-gold/30 bg-gold/5" : "border-line bg-panel2/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    a.unlocked ? "bg-gold/15 text-gold" : "bg-panel2 text-mute"
                  }`}
                >
                  <Icon size={18} />
                  {!a.unlocked && (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink border border-line">
                      <Lock size={9} className="text-mute" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${a.unlocked ? "text-ice" : "text-mute"}`}>{a.title}</p>
                  <p className="text-[11px] text-mute mt-0.5 leading-snug">{a.description}</p>
                </div>
              </div>

              <div className="mt-3">
                <div className="h-1.5 w-full rounded-full bg-line/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${a.progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${a.unlocked ? "bg-gold" : "bg-mint/60"}`}
                  />
                </div>
                <p className="text-[10px] text-mute mt-1.5 text-right">
                  {a.unlocked ? "Complete" : `${Math.round(a.progress)}%`}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
