const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const PortfolioHolding = require("../models/PortfolioHolding");

const BASE_INVESTMENT = 100000;

// @desc Leaderboard ranked by real users' live portfolio performance
// @route GET /api/leaderboard
// Every number is computed fresh from live data (holdings + current stock
// prices + wallet balance) on each request — no cached/stale/mock values,
// so rankings update automatically as prices and holdings change.
const getLeaderboard = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, role: "user" }).select("name walletBalance");
  const portfolios = await Portfolio.find({}).select("userId");
  const portfolioIdToUserId = new Map(portfolios.map((p) => [String(p._id), String(p.userId)]));

  const holdings = await PortfolioHolding.find({}).populate("stockId", "currentPrice");
  const valueByUser = new Map();
  for (const h of holdings) {
    const userId = portfolioIdToUserId.get(String(h.portfolioId));
    if (!userId || !h.stockId) continue;
    valueByUser.set(userId, (valueByUser.get(userId) || 0) + h.quantity * h.stockId.currentPrice);
  }

  const rows = users
    .map((u) => {
      const holdingsValue = valueByUser.get(String(u._id)) || 0;
      const netWorth = holdingsValue + (u.walletBalance || 0);
      const totalReturns = netWorth - BASE_INVESTMENT;
      const roi = (totalReturns / BASE_INVESTMENT) * 100;
      return { userId: String(u._id), username: u.name, netWorth, totalReturns, roi };
    })
    // Only users with a valid, tracked portfolio (i.e. a Portfolio doc exists)
    .filter((r) => portfolios.some((p) => String(p.userId) === r.userId));

  rows.sort((a, b) => b.roi - a.roi);
  rows.forEach((r, i) => { r.rank = i + 1; });

  res.json({ success: true, leaderboard: rows });
});

module.exports = { getLeaderboard };
