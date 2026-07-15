const asyncHandler = require("../utils/asyncHandler");
const Transaction = require("../models/Transaction");

// @desc Get logged-in user's transactions (filter/search)
// @route GET /api/transactions
const getTransactions = asyncHandler(async (req, res) => {
  const { type, from, to } = req.query;
  const query = { userId: req.user._id };

  if (type) query.type = type;
  if (from || to) {
    query.transactionDate = {};
    if (from) query.transactionDate.$gte = new Date(from);
    if (to) query.transactionDate.$lte = new Date(to);
  }

  const transactions = await Transaction.find(query)
    .populate("stockId")
    .sort({ transactionDate: -1 });

  res.json({ success: true, count: transactions.length, transactions });
});

module.exports = { getTransactions };
