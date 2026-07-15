const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Stock = require("../models/Stock");
const Transaction = require("../models/Transaction");
const Portfolio = require("../models/Portfolio");
const AdminLog = require("../models/AdminLog");

const logAction = (adminId, action, entityType, entityId, details = {}) =>
  AdminLog.create({ adminId, action, entityType, entityId, details });

// @desc Admin dashboard analytics
// @route GET /api/admin/dashboard
const getDashboardStats = asyncHandler(async (req, res) => {
  const since14 = new Date();
  since14.setDate(since14.getDate() - 14);

  const [
    userCount,
    activeUserCount,
    stockCount,
    txCount,
    volumeAgg,
    investmentAgg,
    buyCount,
    sellCount,
    userGrowthAgg,
    dailyVolumeAgg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Stock.countDocuments(),
    Transaction.countDocuments(),
    Transaction.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    // Platform-wide "Total investments" must reflect capital ever deployed
    // (lifetime, BUY-side), not the cost basis of currently-held positions —
    // otherwise this number drops every time any user sells, which is wrong
    // for a "total invested" metric. See Portfolio.totalInvestment /
    // tradingController.buyStock for how this is accumulated per-user.
    Portfolio.aggregate([{ $group: { _id: null, total: { $sum: "$totalInvestment" } } }]),
    Transaction.countDocuments({ type: "BUY" }),
    Transaction.countDocuments({ type: "SELL" }),
    User.aggregate([
      { $match: { createdAt: { $gte: since14 } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: { createdAt: { $gte: since14 } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, type: "$type" },
          total: { $sum: "$totalAmount" },
        },
      },
    ]),
  ]);

  // Zero-fill the last 14 days so the charts don't have gaps
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const userGrowthMap = Object.fromEntries(userGrowthAgg.map((r) => [r._id, r.count]));
  const userGrowth = days.map((date) => ({ date, users: userGrowthMap[date] || 0 }));

  const volumeMap = {};
  dailyVolumeAgg.forEach((r) => {
    volumeMap[r._id.date] = volumeMap[r._id.date] || { buy: 0, sell: 0 };
    volumeMap[r._id.date][r._id.type.toLowerCase()] = r.total;
  });
  const dailyVolume = days.map((date) => ({
    date,
    buy: volumeMap[date]?.buy || 0,
    sell: volumeMap[date]?.sell || 0,
  }));

  const recentTransactions = await Transaction.find()
    .populate("userId", "name email")
    .populate("stockId", "symbol companyName")
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    stats: {
      userCount,
      activeUserCount,
      stockCount,
      transactionCount: txCount,
      totalTradedVolume: volumeAgg[0]?.total || 0,
      totalInvestments: investmentAgg[0]?.total || 0,
      buyCount,
      sellCount,
    },
    userGrowth,
    dailyVolume,
    recentTransactions,
  });
});

// @desc List recent admin activity logs
// @route GET /api/admin/logs
const getLogs = asyncHandler(async (req, res) => {
  const logs = await AdminLog.find()
    .populate("adminId", "name email")
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, count: logs.length, logs });
});

// @desc List all users
// @route GET /api/admin/users
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, count: users.length, users });
});

// @desc Update a user (role / active status)
// @route PUT /api/admin/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save();
  await logAction(req.user._id, "UPDATE_USER", "User", user._id, req.body);
  res.json({ success: true, user });
});

// @desc Delete a user
// @route DELETE /api/admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  await user.deleteOne();
  await logAction(req.user._id, "DELETE_USER", "User", user._id);
  res.json({ success: true, message: "User deleted" });
});

// @desc Create a stock
// @route POST /api/admin/stocks
const createStock = asyncHandler(async (req, res) => {
  const stock = await Stock.create(req.body);
  await logAction(req.user._id, "CREATE_STOCK", "Stock", stock._id, req.body);
  res.status(201).json({ success: true, stock });
});

// @desc Update a stock
// @route PUT /api/admin/stocks/:id
const updateStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findById(req.params.id);
  if (!stock) {
    res.status(404);
    throw new Error("Stock not found");
  }
  Object.assign(stock, req.body);
  await stock.save();
  await logAction(req.user._id, "UPDATE_STOCK", "Stock", stock._id, req.body);
  res.json({ success: true, stock });
});

// @desc Delete a stock
// @route DELETE /api/admin/stocks/:id
const deleteStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findById(req.params.id);
  if (!stock) {
    res.status(404);
    throw new Error("Stock not found");
  }
  await stock.deleteOne();
  await logAction(req.user._id, "DELETE_STOCK", "Stock", stock._id);
  res.json({ success: true, message: "Stock deleted" });
});

// @desc View all transactions (admin)
// @route GET /api/admin/transactions
const getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await Transaction.find()
    .populate("userId", "name email")
    .populate("stockId", "symbol companyName")
    .sort({ createdAt: -1 });
  res.json({ success: true, count: transactions.length, transactions });
});

module.exports = {
  getDashboardStats,
  getUsers,
  updateUser,
  deleteUser,
  createStock,
  updateStock,
  deleteStock,
  getAllTransactions,
  getLogs,
};
