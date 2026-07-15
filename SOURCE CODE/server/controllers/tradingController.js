const asyncHandler = require("../utils/asyncHandler");
const Stock = require("../models/Stock");
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const PortfolioHolding = require("../models/PortfolioHolding");
const Transaction = require("../models/Transaction");
 
// @desc Buy a stock
// @route POST /api/trading/buy
const buyStock = asyncHandler(async (req, res) => {
  const { stockId, quantity } = req.body;
  if (!stockId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error("stockId and a positive quantity are required");
  }
 
  const stock = await Stock.findById(stockId);
  if (!stock) {
    res.status(404);
    throw new Error("Stock not found");
  }
 
  const totalAmount = stock.currentPrice * quantity;
  const user = await User.findById(req.user._id);
 
  if (user.walletBalance < totalAmount) {
    res.status(400);
    throw new Error("Insufficient wallet balance for this order");
  }
 
  let portfolio = await Portfolio.findOne({ userId: user._id });
  if (!portfolio) portfolio = await Portfolio.create({ userId: user._id });
 
  let holding = await PortfolioHolding.findOne({ portfolioId: portfolio._id, stockId });
  if (holding) {
    const newQuantity = holding.quantity + Number(quantity);
    const newAveragePrice =
      (holding.averagePrice * holding.quantity + totalAmount) / newQuantity;
    holding.quantity = newQuantity;
    holding.averagePrice = newAveragePrice;
  } else {
    holding = new PortfolioHolding({
      portfolioId: portfolio._id,
      stockId,
      quantity,
      averagePrice: stock.currentPrice,
    });
  }
  holding.currentValue = holding.quantity * stock.currentPrice;
  holding.profitLoss = holding.currentValue - holding.quantity * holding.averagePrice;
  await holding.save();
 
  user.walletBalance -= totalAmount;
  await user.save();
 
  // Track BUY-side investment. Total investment only ever grows; today's
  // investment accumulates every BUY made since local midnight and rolls
  // over to 0 the first time a BUY happens on a new day. SELL never touches
  // either of these (handled entirely in sellStock, which does not).
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isNewDay =
    !portfolio.todayInvestmentDate || new Date(portfolio.todayInvestmentDate) < startOfToday;
 
  portfolio.totalInvestment = (portfolio.totalInvestment || 0) + totalAmount;
  portfolio.todayInvestment = (isNewDay ? 0 : portfolio.todayInvestment || 0) + totalAmount;
  portfolio.todayInvestmentDate = new Date();
  await portfolio.save();
 
  await recalculatePortfolio(portfolio._id);
 
  const transaction = await Transaction.create({
    userId: user._id,
    stockId,
    type: "BUY",
    quantity,
    price: stock.currentPrice,
    totalAmount,
  });
 
  res.status(201).json({
    success: true,
    message: `Bought ${quantity} share(s) of ${stock.symbol}`,
    transaction,
    walletBalance: user.walletBalance,
  });
});
 
// @desc Sell a stock
// @route POST /api/trading/sell
const sellStock = asyncHandler(async (req, res) => {
  const { stockId, quantity } = req.body;
  if (!stockId || !quantity || quantity <= 0) {
    res.status(400);
    throw new Error("stockId and a positive quantity are required");
  }
 
  const stock = await Stock.findById(stockId);
  if (!stock) {
    res.status(404);
    throw new Error("Stock not found");
  }
 
  const portfolio = await Portfolio.findOne({ userId: req.user._id });
  const holding = portfolio && (await PortfolioHolding.findOne({ portfolioId: portfolio._id, stockId }));
 
  if (!holding || holding.quantity < quantity) {
    res.status(400);
    throw new Error("You don't own enough shares to sell this quantity");
  }
 
  const totalAmount = stock.currentPrice * quantity;
  const costBasis = holding.averagePrice * Number(quantity);
 
  holding.quantity -= Number(quantity);
  if (holding.quantity === 0) {
    await holding.deleteOne();
  } else {
    holding.currentValue = holding.quantity * stock.currentPrice;
    holding.profitLoss = holding.currentValue - holding.quantity * holding.averagePrice;
    await holding.save();
  }
 
  const user = await User.findById(req.user._id);
  user.walletBalance += totalAmount;
  await user.save();
 
  await recalculatePortfolio(portfolio._id);
 
  const transaction = await Transaction.create({
    userId: user._id,
    stockId,
    type: "SELL",
    quantity,
    price: stock.currentPrice,
    totalAmount,
    costBasis,
  });
 
  res.status(201).json({
    success: true,
    message: `Sold ${quantity} share(s) of ${stock.symbol}`,
    transaction,
    walletBalance: user.walletBalance,
  });
});
 
async function recalculatePortfolio(portfolioId) {
  const holdings = await PortfolioHolding.find({ portfolioId }).populate("stockId");
  let totalValue = 0;
  let totalInvested = 0;
  const allocation = {};
 
  for (const h of holdings) {
    const stock = h.stockId;
    h.currentValue = h.quantity * stock.currentPrice;
    h.profitLoss = h.currentValue - h.quantity * h.averagePrice;
    await h.save();
    totalValue += h.currentValue;
    totalInvested += h.quantity * h.averagePrice;
    allocation[stock.symbol] = h.currentValue;
  }
 
  await Portfolio.findByIdAndUpdate(portfolioId, {
    totalValue,
    totalInvested,
    totalProfitLoss: totalValue - totalInvested,
    allocation,
  });
}
 
module.exports = { buyStock, sellStock };