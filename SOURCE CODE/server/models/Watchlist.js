const mongoose = require("mongoose");

const watchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, default: "My Watchlist" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Watchlist", watchlistSchema);
