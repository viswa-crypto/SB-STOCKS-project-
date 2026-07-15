const asyncHandler = require("../utils/asyncHandler");
const Stock = require("../models/Stock");
const MarketData = require("../models/MarketData");
 
// @desc List / search / filter stocks
// @route GET /api/stocks
const getStocks = asyncHandler(async (req, res) => {
  const { search, sector, sort } = req.query;
  const query = { isActive: true };
 
  if (search) {
    query.$or = [
      { symbol: new RegExp(search, "i") },
      { companyName: new RegExp(search, "i") },
    ];
  }
  if (sector) query.sector = sector;
 
  let sortOption = { companyName: 1 };
  if (sort === "gainers") sortOption = { changePercent: -1 };
  if (sort === "losers") sortOption = { changePercent: 1 };
  if (sort === "volume") sortOption = { volume: -1 };
 
  const stocks = await Stock.find(query).sort(sortOption);
  res.json({ success: true, count: stocks.length, stocks });
});
 
// @desc Get single stock + recent history
// @route GET /api/stocks/:id
const getStockById = asyncHandler(async (req, res) => {
  const stock = await Stock.findById(req.params.id);
  if (!stock) {
    res.status(404);
    throw new Error("Stock not found");
  }
  // Sort descending + limit to get the MOST RECENT points (not the oldest —
  // the previous ascending-sort-then-limit approach silently returned the
  // earliest 300 records once a stock accumulated more history than that,
  // which meant today's live price ticks eventually fell outside the window
  // entirely and the chart stopped reflecting current data). Reversed back
  // to ascending order afterwards since that's what the chart expects.
  const history = await MarketData.find({ stockId: stock._id }).sort({ date: -1 }).limit(3000);
  res.json({ success: true, stock, history: history.reverse() });
});
 
module.exports = { getStocks, getStockById };