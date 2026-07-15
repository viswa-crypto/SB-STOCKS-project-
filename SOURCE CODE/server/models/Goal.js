const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["SAVINGS", "PORTFOLIO_VALUE", "PROFIT", "MONTHLY_INVESTMENT", "CUSTOM"],
      default: "CUSTOM",
    },
    targetAmount: { type: Number, required: true },
    // Only used for CUSTOM goals — other types compute progress live from real account data
    manualAmount: { type: Number, default: 0 },
    deadline: { type: Date, default: null },
    achieved: { type: Boolean, default: false },
    achievedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);
