const express = require("express");
const router = express.Router();
const { getStocks, getStockById } = require("../controllers/stockController");

router.get("/", getStocks);
router.get("/:id", getStockById);

module.exports = router;
