const express = require("express");
const router = express.Router();
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
} = require("../controllers/watchlistController");
const { protect } = require("../middleware/auth");

router.get("/", protect, getWatchlist);
router.post("/", protect, addToWatchlist);
router.patch("/:stockId", protect, updateWatchlistItem);
router.delete("/:stockId", protect, removeFromWatchlist);

module.exports = router;
