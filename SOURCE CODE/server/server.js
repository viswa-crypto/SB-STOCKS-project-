require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const Notification = require("./models/Notification");
const { startPriceSimulation } = require("./services/stockPriceService");

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  // Notifications are intentionally NOT durable across server restarts —
  // only alerts fired while this server process is actually running should
  // ever show up. Wiping the collection on boot means a full server
  // stop/start always begins from an empty notification state, even though
  // the watchlist alert *settings* themselves (target price, direction)
  // remain persisted in WatchlistItem as usual.
  await Notification.deleteMany({});

  app.listen(PORT, () => {
    console.log(`SB Stocks API listening on port ${PORT}`);
    startPriceSimulation(); // simulate live price ticks every 15s
  });
});
