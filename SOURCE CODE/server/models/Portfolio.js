const mongoose = require("mongoose");
 
const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, default: "My Portfolio" },
    totalValue: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },
    totalProfitLoss: { type: Number, default: 0 },
    allocation: { type: mongoose.Schema.Types.Mixed, default: {} },
 
    // Lifetime and daily BUY-side investment tracking. Unlike `totalInvested`
    // above (which reflects the cost basis of currently-held positions and
    // drops to 0 once everything is sold), these two fields only ever grow on
    // a BUY and are never reduced by a SELL. `todayInvestment` additionally
    // resets to 0 at the start of a new day (tracked via `todayInvestmentDate`).
    // Existing documents created before this field existed will transparently
    // get the schema default (0 / null) applied on read, so no manual DB
    // migration is required.
    totalInvestment: { type: Number, default: 0 },
    todayInvestment: { type: Number, default: 0 },
    todayInvestmentDate: { type: Date, default: null },
  },
  { timestamps: true }
);
 
module.exports = mongoose.model("Portfolio", portfolioSchema);