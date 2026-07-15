const mongoose = require("mongoose");

const watchlistItemSchema = new mongoose.Schema(
  {
    watchlistId: { type: mongoose.Schema.Types.ObjectId, ref: "Watchlist", required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: true },
    pinned: { type: Boolean, default: false },
    targetPrice: { type: Number, default: null },
    alertDirection: { type: String, enum: ["above", "below", null], default: null },
    alertTriggeredAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

watchlistItemSchema.index({ watchlistId: 1, stockId: 1 }, { unique: true });

module.exports = mongoose.model("WatchlistItem", watchlistItemSchema);
