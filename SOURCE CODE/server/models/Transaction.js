const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: true },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    // Cost basis (quantity * averagePrice at the moment of sale) — only set for SELL
    // transactions. Lets us compute real realized profit/loss later without having
    // to reconstruct it from holdings that may no longer exist.
    costBasis: { type: Number },
    transactionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ["Completed", "Cancelled"], default: "Completed" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
