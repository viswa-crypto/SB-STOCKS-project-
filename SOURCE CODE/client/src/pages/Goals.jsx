import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Plus, Trash2, PartyPopper, X } from "lucide-react";
import { fetchGoals, createGoal, deleteGoal, updateGoal } from "../redux/slices/goalSlice";
import { showToast } from "../redux/slices/uiSlice";
import { formatCurrency, formatDate } from "../utils/formatters";
import FullPageLoader from "../components/FullPageLoader";

const GOAL_TYPES = [
  { value: "SAVINGS", label: "Cash Savings", hint: "Tracks your wallet balance" },
  { value: "PORTFOLIO_VALUE", label: "Portfolio Value", hint: "Tracks total portfolio value" },
  { value: "PROFIT", label: "Profit Target", hint: "Tracks overall profit" },
  { value: "MONTHLY_INVESTMENT", label: "Monthly Investment", hint: "Tracks this month's buys" },
  { value: "CUSTOM", label: "Custom Goal", hint: "Update progress manually" },
];

const PRESETS = [
  { title: "Save ₹1,00,000", type: "SAVINGS", targetAmount: 100000 },
  { title: "Build ₹10,00,000 Portfolio", type: "PORTFOLIO_VALUE", targetAmount: 1000000 },
  { title: "Earn ₹50,000 Profit", type: "PROFIT", targetAmount: 50000 },
  { title: "Invest ₹20,000 This Month", type: "MONTHLY_INVESTMENT", targetAmount: 20000 },
];

function NewGoalForm({ onClose }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("CUSTOM");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const applyPreset = (p) => {
    setTitle(p.title);
    setType(p.type);
    setTargetAmount(p.targetAmount);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!title || !targetAmount) {
      dispatch(showToast({ type: "error", message: "Title and target amount are required" }));
      return;
    }
    dispatch(createGoal({ title, type, targetAmount: Number(targetAmount), deadline: deadline || null })).then(() => {
      dispatch(showToast({ type: "success", message: "Goal created" }));
    });
    onClose();
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="card mb-6 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">New goal</h3>
        <button type="button" onClick={onClose} className="text-mute hover:text-ice">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.title}
            type="button"
            onClick={() => applyPreset(p)}
            className="text-xs bg-panel2 border border-line rounded-lg px-3 py-1.5 hover:border-mint/40 transition-colors"
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-mute mb-1 block">Goal title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Save for a laptop"
            className="w-full bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="text-xs text-mute mb-1 block">Goal type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
          >
            {GOAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-mute mb-1 block">Target amount (₹)</label>
          <input
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            className="w-full bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm mono-num focus:outline-none focus:border-mint"
          />
        </div>
        <div>
          <label className="text-xs text-mute mb-1 block">Deadline (optional)</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full bg-panel2 border border-line rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-mint"
          />
        </div>
      </div>
      <p className="text-[11px] text-mute mt-3">
        {GOAL_TYPES.find((t) => t.value === type)?.hint}
      </p>
      <button type="submit" className="btn-primary mt-4">Create goal</button>
    </motion.form>
  );
}

function GoalCard({ goal, index }) {
  const dispatch = useDispatch();
  const [manualValue, setManualValue] = useState("");
  const pct = Math.min(goal.progressPct, 100);

  const logProgress = () => {
    if (manualValue === "") return;
    dispatch(updateGoal({ id: goal._id, manualAmount: Number(manualValue) })).then(() => {
      dispatch(showToast({ type: "success", message: "Progress updated" }));
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04 }}
      className={`card relative overflow-hidden ${goal.achieved ? "border-mint/40" : ""}`}
    >
      {goal.achieved && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          className="absolute top-3 right-3 text-mint flex items-center gap-1 text-xs font-semibold bg-mint/10 px-2 py-1 rounded-full"
        >
          <PartyPopper size={13} /> Achieved!
        </motion.div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <Target size={15} className="text-gold shrink-0" />
        <h4 className="font-display font-semibold truncate pr-16">{goal.title}</h4>
      </div>
      <p className="text-xs text-mute mb-4">
        {GOAL_TYPES.find((t) => t.value === goal.type)?.label}
        {goal.deadline && ` · by ${formatDate(goal.deadline)}`}
      </p>

      <div className="flex items-baseline justify-between mb-2">
        <span className="mono-num text-sm">{formatCurrency(goal.currentAmount)}</span>
        <span className="mono-num text-xs text-mute">of {formatCurrency(goal.targetAmount)}</span>
      </div>

      <div className="h-2.5 bg-panel2 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${goal.achieved ? "bg-mint" : "bg-gradient-to-r from-mint to-ice"}`}
        />
      </div>
      <p className="text-[11px] text-mute mt-1.5">{pct.toFixed(0)}% complete</p>

      {goal.type === "CUSTOM" && !goal.achieved && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Update progress amount"
            className="w-full bg-panel2 border border-line rounded-lg px-2 py-1.5 text-xs mono-num focus:outline-none focus:border-mint"
          />
          <button onClick={logProgress} className="btn-ghost !py-1.5 !px-3 text-xs shrink-0">
            Log
          </button>
        </div>
      )}

      <button
        onClick={() => dispatch(deleteGoal(goal._id))}
        className="absolute bottom-3 right-3 text-mute hover:text-rose transition-colors"
        title="Delete goal"
      >
        <Trash2 size={13} />
      </button>
    </motion.div>
  );
}

export default function Goals() {
  const dispatch = useDispatch();
  const { list, status } = useSelector((s) => s.goals);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(fetchGoals());
  }, [dispatch]);

  if (status === "loading" && list.length === 0) return <FullPageLoader label="Loading your goals" />;

  const achievedCount = list.filter((g) => g.achieved).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-3xl font-bold mb-1">
            Goals & Milestones
          </motion.h1>
          <p className="text-mute">
            {list.length === 0 ? "Set a target and track your progress." : `${achievedCount} of ${list.length} goals achieved.`}
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-1.5 self-start">
            <Plus size={16} /> New goal
          </button>
        )}
      </div>

      <AnimatePresence>{showForm && <NewGoalForm onClose={() => setShowForm(false)} />}</AnimatePresence>

      {list.length === 0 ? (
        <div className="card text-center py-16">
          <Target className="mx-auto text-mute mb-3" />
          <p className="text-mute mb-4">You haven't set any goals yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex">
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {list.map((goal, i) => (
              <GoalCard key={goal._id} goal={goal} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
