// Lightweight price-simulation service. In production, swap this out for a real
// market-data provider (see EXTERNAL SERVICES in the technical architecture doc)
// while keeping the same Stock schema shape.
const Stock = require("../models/Stock");
const MarketData = require("../models/MarketData");
const { checkPriceAlerts } = require("./alertService");

const randomWalk = (price) => {
  const changePercent = (Math.random() - 0.5) * 2.4; // +/- 1.2%, reads more like a real market than noise
  const newPrice = Math.max(1, price * (1 + changePercent / 100));
  return { newPrice: Number(newPrice.toFixed(2)), changePercent: Number(changePercent.toFixed(2)) };
};

const tickPrices = async () => {
  const stocks = await Stock.find({ isActive: true });
  for (const stock of stocks) {
    const prevPrice = stock.currentPrice;
    const { newPrice, changePercent } = randomWalk(prevPrice);
    stock.change = Number((newPrice - prevPrice).toFixed(2));
    stock.changePercent = changePercent;
    stock.currentPrice = newPrice;
    stock.volume = Math.floor(Math.random() * 5_000_000);

    // Keep derived stats moving consistently with the live price instead of going stale
    stock.dayHigh = Math.max(stock.dayHigh || newPrice, newPrice);
    stock.dayLow = stock.dayLow ? Math.min(stock.dayLow, newPrice) : newPrice;
    stock.week52High = Math.max(stock.week52High || newPrice, newPrice);
    stock.week52Low = stock.week52Low ? Math.min(stock.week52Low, newPrice) : newPrice;

    await stock.save();

    await MarketData.create({
      stockId: stock._id,
      date: new Date(),
      open: prevPrice,
      high: Math.max(prevPrice, newPrice),
      low: Math.min(prevPrice, newPrice),
      close: newPrice,
      volume: stock.volume,
      adjustedClose: newPrice,
    });
  }

  try {
    await checkPriceAlerts(stocks);
  } catch (err) {
    console.error("Price alert check failed:", err.message);
  }
};

// Call this once from server.js to simulate a live-ish market during dev/demo.
const startPriceSimulation = (intervalMs = 15000) => {
  setInterval(() => {
    tickPrices().catch((err) => console.error("Price tick failed:", err.message));
  }, intervalMs);
};

module.exports = { tickPrices, startPriceSimulation };
