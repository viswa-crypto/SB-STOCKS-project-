const mongoose = require("mongoose");

const marketDataSchema = new mongoose.Schema(
  {
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: true },
    date: { type: Date, required: true },
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number,
    adjustedClose: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("MarketData", marketDataSchema);
