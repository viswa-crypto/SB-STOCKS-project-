const asyncHandler = require("../utils/asyncHandler");
const Watchlist = require("../models/Watchlist");
const WatchlistItem = require("../models/WatchlistItem");
const Stock = require("../models/Stock");

const getOrCreateWatchlist = async (userId) => {
  let watchlist = await Watchlist.findOne({ userId });
  if (!watchlist) watchlist = await Watchlist.create({ userId });
  return watchlist;
};

// @desc Get watchlist
// @route GET /api/watchlist
const getWatchlist = asyncHandler(async (req, res) => {
  const watchlist = await getOrCreateWatchlist(req.user._id);
  const items = await WatchlistItem.find({ watchlistId: watchlist._id }).populate("stockId");
  res.json({ success: true, watchlist, items });
});

// @desc Add stock to watchlist
// @route POST /api/watchlist
const addToWatchlist = asyncHandler(async (req, res) => {
  const { stockId } = req.body;
  const watchlist = await getOrCreateWatchlist(req.user._id);

  const exists = await WatchlistItem.findOne({ watchlistId: watchlist._id, stockId });
  if (exists) {
    res.status(400);
    throw new Error("Stock is already in your watchlist");
  }

  const item = await WatchlistItem.create({ watchlistId: watchlist._id, stockId });
  res.status(201).json({ success: true, item });
});

// @desc Remove stock from watchlist
// @route DELETE /api/watchlist/:stockId
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const watchlist = await getOrCreateWatchlist(req.user._id);
  await WatchlistItem.findOneAndDelete({ watchlistId: watchlist._id, stockId: req.params.stockId });
  res.json({ success: true, message: "Removed from watchlist" });
});

// @desc Update a watchlist item (pin/unpin, set/clear price alert)
// @route PATCH /api/watchlist/:stockId
const updateWatchlistItem = asyncHandler(async (req, res) => {
  const { pinned, targetPrice } = req.body;
  const watchlist = await getOrCreateWatchlist(req.user._id);

  const update = {};
  if (typeof pinned === "boolean") update.pinned = pinned;
  if (targetPrice !== undefined) {
    if (targetPrice === null || targetPrice === "") {
      update.targetPrice = null;
      update.alertDirection = null;
      update.alertTriggeredAt = null;
    } else {
      const num = Number(targetPrice);
      const stock = await Stock.findById(req.params.stockId);
      if (!stock) {
        res.status(404);
        throw new Error("Stock not found — can't set an alert without a live price to compare against");
      }
      update.targetPrice = num;
      update.alertDirection = num >= stock.currentPrice ? "above" : "below";
      update.alertTriggeredAt = null; // re-arm on every edit
    }
  }

  const item = await WatchlistItem.findOneAndUpdate(
    { watchlistId: watchlist._id, stockId: req.params.stockId },
    update,
    { new: true }
  ).populate("stockId");

  if (!item) {
    res.status(404);
    throw new Error("Watchlist item not found");
  }

  res.json({ success: true, item });
});

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist, updateWatchlistItem };
