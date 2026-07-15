const asyncHandler = require("../utils/asyncHandler");
const Portfolio = require("../models/Portfolio");
const PortfolioHolding = require("../models/PortfolioHolding");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
 
// Starting virtual capital every account is seeded with (matches User.walletBalance
// default). Overall P/L is always measured against this fixed baseline, not against
// whatever is currently invested, so it stays correct even after fully cashing out.
const BASE_INVESTMENT = 100000;
 
// @desc Get logged-in user's portfolio + holdings
// @route GET /api/portfolio
//
// Every value here is recomputed live from the underlying records (holdings,
// transactions, wallet balance) on every request instead of trusting the
// cached fields on the Portfolio document. That cache can drift (e.g. right
// after a sell empties a holding) and is only kept around for other read
// paths (allocation charts, etc.) — this endpoint is the source of truth.
const getPortfolio = asyncHandler(async (req, res) => {
  let portfolio = await Portfolio.findOne({ userId: req.user._id });
  if (!portfolio) portfolio = await Portfolio.create({ userId: req.user._id });
 
  const user = await User.findById(req.user._id);
  const holdings = await PortfolioHolding.find({ portfolioId: portfolio._id }).populate("stockId");
 
  let holdingsValue = 0;
  let investedAmount = 0;
  let unrealizedTodayPL = 0;
  const allocation = {};
 
  for (const h of holdings) {
    const stock = h.stockId;
    if (!stock) continue;
 
    const currentValue = h.quantity * stock.currentPrice;
    const costBasis = h.quantity * h.averagePrice;
 
    // Keep the holding doc's cached fields in sync for other consumers
    // (e.g. HoldingsTable, PDF exports) without relying on them here.
    h.currentValue = currentValue;
    h.profitLoss = currentValue - costBasis;
 
    holdingsValue += currentValue;
    investedAmount += costBasis;
    allocation[stock.symbol] = currentValue;
 
    // Reverse today's % move to estimate how much of the current value is
    // today's price movement alone (a documented simplification — a newly
    // bought stock's "day change" this way isn't perfectly time-weighted,
    // but it's derived from real current data, not a fabricated number).
    const changePercent = stock.changePercent ?? 0;
    const prevValue = currentValue / (1 + changePercent / 100);
    unrealizedTodayPL += currentValue - prevValue;
  }
 
  if (holdings.length) {
    await PortfolioHolding.bulkWrite(
      holdings.map((h) => ({
        updateOne: {
          filter: { _id: h._id },
          update: { currentValue: h.currentValue, profitLoss: h.profitLoss },
        },
      }))
    );
  }
 
  // Realized P/L from today's sells (proceeds minus the cost basis recorded
  // at the moment of sale) — this is what keeps Today's P/L correct even
  // when a holding is fully sold off and no longer exists to reverse-engineer.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysSells = await Transaction.find({
    userId: req.user._id,
    type: "SELL",
    transactionDate: { $gte: startOfToday },
  });
  const realizedTodayPL = todaysSells.reduce(
    (sum, tx) => sum + ((tx.totalAmount || 0) - (tx.costBasis ?? tx.totalAmount)),
    0
  );
 
  const todayPL = unrealizedTodayPL + realizedTodayPL;
  const cashBalance = user.walletBalance;
  const netWorth = holdingsValue + cashBalance;
  const overallPL = netWorth - BASE_INVESTMENT;
  const returnPercent = (overallPL / BASE_INVESTMENT) * 100;
  const totalProfitLoss = holdingsValue - investedAmount;
 
  // Today's Investment display resets to 0 once a new day has started even
  // if no BUY has happened yet today (the stored value only actually rolls
  // over on the next BUY, in tradingController). This is read-only
  // normalization for the response — nothing is written back here, so the
  // stored value+date remain untouched until the next real BUY.
  const todayInvestmentDate = portfolio.todayInvestmentDate ? new Date(portfolio.todayInvestmentDate) : null;
  const todayInvestment =
    todayInvestmentDate && todayInvestmentDate >= startOfToday ? portfolio.todayInvestment || 0 : 0;
  const totalInvestment = portfolio.totalInvestment || 0;
 
  // Persist the cache fields other parts of the app still read from the
  // Portfolio document directly (kept for backwards compatibility).
  await Portfolio.findByIdAndUpdate(portfolio._id, {
    totalValue: holdingsValue,
    totalInvested: investedAmount,
    totalProfitLoss,
    allocation,
  });
 
  res.json({
    success: true,
    portfolio: {
      ...portfolio.toObject(),
      totalValue: holdingsValue,
      totalInvested: investedAmount,
      totalProfitLoss,
      allocation,
      cashBalance,
      netWorth,
      todayPL,
      overallPL,
      returnPercent,
      baseInvestment: BASE_INVESTMENT,
      todayInvestment,
      totalInvestment,
    },
    holdings,
  });
});
 
module.exports = { getPortfolio };