const mongoose = require("mongoose");

const portfolioHoldingSchema = new mongoose.Schema(
  {
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: "Portfolio", required: true },
    stockId: { type: mongoose.Schema.Types.ObjectId, ref: "Stock", required: true },
    quantity: { type: Number, required: true, default: 0 },
    averagePrice: { type: Number, required: true, default: 0 },
    currentValue: { type: Number, default: 0 },
    profitLoss: { type: Number, default: 0 },
  },
  { timestamps: true }
);

portfolioHoldingSchema.index({ portfolioId: 1, stockId: 1 }, { unique: true });

module.exports = mongoose.model("PortfolioHolding", portfolioHoldingSchema);
