// ---------------------------------------------------------------------------
// SHARED PORTFOLIO CALCULATION ENGINE (client-side)
//
// Single source of truth for turning a raw PortfolioHolding record into the
// display-ready numbers every consumer needs (Portfolio page, HoldingsTable,
// every PDF export). Nothing downstream should read h.averagePrice /
// h.quantity directly and re-derive investment on its own — call
// calcHolding() (or calcHoldings() for a list) and use the fields it
// returns instead, so every surface always agrees.
//
// Backend contract (server/models/PortfolioHolding.js):
//   averagePrice = weighted-average price actually paid for shares still
//                  held (recomputed on every BUY).
//   quantity     = shares currently held.
// Per spec: Investment = Avg Buy Price × Current Quantity, always — never a
// stale/missing field and never ₹0 when there's real purchase history.
// ---------------------------------------------------------------------------

export function calcHolding(h) {
  const quantity = h?.quantity || 0;
  const avgBuyPrice = h?.averagePrice || 0;
  // Investment is always derived this way — matches the backend engine
  // exactly and never depends on a possibly-missing/stale cached field.
  const investment = avgBuyPrice * quantity;
  const currentPrice = h?.stockId?.currentPrice ?? 0;
  const currentValue = h?.currentValue ?? currentPrice * quantity;
  const profitLoss = h?.profitLoss ?? currentValue - investment;
  const plPercent = investment > 0 ? (profitLoss / investment) * 100 : 0;

  return {
    holdingId: h?._id,
    stockId: h?.stockId,
    symbol: h?.stockId?.symbol || "",
    companyName: h?.stockId?.companyName || "",
    quantity,
    avgBuyPrice,
    investment,
    currentPrice,
    currentValue,
    profitLoss,
    plPercent,
  };
}

export function calcHoldings(holdings) {
  return (holdings || []).map(calcHolding);
}

// Portfolio-level summary used by every PDF export. Mirrors exactly what
// portfolioController.getPortfolio returns, with safe fallbacks derived
// from the holdings list itself so a value is never blank/₹0 when real
// data exists.
export function calcPortfolioSummary(portfolio, holdings) {
  const rows = calcHoldings(holdings);
  const totalValue = portfolio?.totalValue ?? rows.reduce((s, r) => s + r.currentValue, 0);
  const totalInvested = portfolio?.totalInvested ?? rows.reduce((s, r) => s + r.investment, 0);
  const totalProfitLoss = portfolio?.totalProfitLoss ?? totalValue - totalInvested;
  return { rows, totalValue, totalInvested, totalProfitLoss, holdingsCount: rows.length };
}
