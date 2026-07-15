const express = require("express");
const router = express.Router();
const { buyStock, sellStock } = require("../controllers/tradingController");
const { protect } = require("../middleware/auth");

router.post("/buy", protect, buyStock);
router.post("/sell", protect, sellStock);

module.exports = router;
