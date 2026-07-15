const asyncHandler = require("../utils/asyncHandler");
const Goal = require("../models/Goal");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");

// Computes how much progress a user has made toward a given goal based on live account data.
const computeProgress = async (goal, userId, user, portfolio) => {
  switch (goal.type) {
    case "SAVINGS":
      return user?.walletBalance || 0;
    case "PORTFOLIO_VALUE":
      return portfolio?.totalValue || 0;
    case "PROFIT":
      return Math.max(portfolio?.totalProfitLoss || 0, 0);
    case "MONTHLY_INVESTMENT": {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const txs = await Transaction.find({
        userId,
        type: "BUY",
        transactionDate: { $gte: start },
        status: "Completed",
      });
      return txs.reduce((sum, t) => sum + t.totalAmount, 0);
    }
    case "CUSTOM":
    default:
      return goal.manualAmount || 0;
  }
};

const hydrateGoals = async (goals, req) => {
  const portfolio = await Portfolio.findOne({ userId: req.user._id });
  return Promise.all(
    goals.map(async (goal) => {
      const current = await computeProgress(goal, req.user._id, req.user, portfolio);
      const progressPct = goal.targetAmount > 0 ? Math.min((current / goal.targetAmount) * 100, 100) : 0;
      const justAchieved = !goal.achieved && current >= goal.targetAmount;
      if (justAchieved) {
        goal.achieved = true;
        goal.achievedAt = new Date();
        await goal.save();
      }
      return {
        ...goal.toObject(),
        currentAmount: current,
        progressPct,
      };
    })
  );
};

// @desc List the user's goals with live progress
// @route GET /api/goals
const getGoals = asyncHandler(async (req, res) => {
  const goals = await Goal.find({ userId: req.user._id }).sort({ createdAt: -1 });
  const hydrated = await hydrateGoals(goals, req);
  res.json({ success: true, goals: hydrated });
});

// @desc Create a new goal
// @route POST /api/goals
const createGoal = asyncHandler(async (req, res) => {
  const { title, type, targetAmount, deadline } = req.body;
  if (!title || !targetAmount) {
    res.status(400);
    throw new Error("Title and target amount are required");
  }
  const goal = await Goal.create({
    userId: req.user._id,
    title,
    type: type || "CUSTOM",
    targetAmount,
    deadline: deadline || null,
  });
  res.status(201).json({ success: true, goal });
});

// @desc Update a goal (edit target, deadline, or bump manual progress)
// @route PUT /api/goals/:id
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await Goal.findOne({ _id: req.params.id, userId: req.user._id });
  if (!goal) {
    res.status(404);
    throw new Error("Goal not found");
  }
  const { title, targetAmount, deadline, manualAmount } = req.body;
  if (title !== undefined) goal.title = title;
  if (targetAmount !== undefined) goal.targetAmount = targetAmount;
  if (deadline !== undefined) goal.deadline = deadline;
  if (manualAmount !== undefined) goal.manualAmount = manualAmount;
  await goal.save();
  res.json({ success: true, goal });
});

// @desc Delete a goal
// @route DELETE /api/goals/:id
const deleteGoal = asyncHandler(async (req, res) => {
  await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  res.json({ success: true, message: "Goal removed" });
});

module.exports = { getGoals, createGoal, updateGoal, deleteGoal };
