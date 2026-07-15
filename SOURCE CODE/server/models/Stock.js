const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
    companyName: { type: String, required: true },
    sector: { type: String, default: "General" },
    currentPrice: { type: Number, required: true },
    change: { type: Number, default: 0 },
    changePercent: { type: Number, default: 0 },
    marketCap: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    logo: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isTrending: { type: Boolean, default: false },

    // Price statistics (Stock Details page)
    openPrice: { type: Number, default: 0 },
    prevClose: { type: Number, default: 0 },
    dayHigh: { type: Number, default: 0 },
    dayLow: { type: Number, default: 0 },
    week52High: { type: Number, default: 0 },
    week52Low: { type: Number, default: 0 },
    peRatio: { type: Number, default: 0 },
    eps: { type: Number, default: 0 },
    dividendYield: { type: Number, default: 0 },
    beta: { type: Number, default: 1 },

    // Company info
    about: { type: String, default: "" },
    industry: { type: String, default: "" },
    ceo: { type: String, default: "" },
    founded: { type: String, default: "" },
    headquarters: { type: String, default: "" },
    employees: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", stockSchema);
