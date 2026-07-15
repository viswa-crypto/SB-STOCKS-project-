const WatchlistItem = require("../models/WatchlistItem");
const Notification = require("../models/Notification");
const { formatCurrency } = require("../utils/formatCurrency");

function isSatisfied(item, price) {
  if (item.alertDirection === "above") return price >= item.targetPrice;
  if (item.alertDirection === "below") return price <= item.targetPrice;
  return false;
}

// Checks every untriggered watchlist alert against the prices a price tick
// just wrote, and creates a Notification for each one now satisfied.
async function checkPriceAlerts(stocks) {
  const priceById = new Map(stocks.map((s) => [String(s._id), s.currentPrice]));
  const active = await WatchlistItem.find({ targetPrice: { $ne: null }, alertTriggeredAt: null }).populate("watchlistId", "userId");
  if (!active.length) return;

  console.log(`[alerts] checking ${active.length} active alert(s) against ${stocks.length} stock price(s)`);

  const stocksById = new Map(stocks.map((s) => [String(s._id), s]));
  for (const item of active) {
    const price = priceById.get(String(item.stockId));
    const stock = stocksById.get(String(item.stockId));
    if (price === undefined) {
      console.log(`[alerts] skip — no live price found for stockId=${item.stockId}`);
      continue;
    }
    const satisfied = isSatisfied(item, price);
    console.log(`[alerts] ${stock?.symbol || item.stockId}: price=${price} target=${item.targetPrice} dir=${item.alertDirection} -> ${satisfied ? "TRIGGER" : "not yet"}`);
    if (!satisfied) continue;
    if (!item.watchlistId?.userId) {
      console.log(`[alerts] skip — watchlist item ${item._id} has no resolvable userId`);
      continue;
    }

    item.alertTriggeredAt = new Date();
    await item.save();

    const symbol = stock?.symbol || "Your stock";
    const notif = await Notification.create({
      userId: item.watchlistId.userId,
      type: "PRICE_ALERT",
      stockId: item.stockId,
      title: `🔔 Price Alert: ${symbol}`,
      message: `${symbol} has reached your target price of ${formatCurrency(item.targetPrice)}. Current Price: ${formatCurrency(price)}.`,
    });
    console.log(`[alerts] notification created id=${notif._id} for userId=${item.watchlistId.userId}`);
  }
}

module.exports = { checkPriceAlerts };
