import { formatDate } from "./formatters";
import { calcHoldings, calcPortfolioSummary } from "./portfolioCalc";
 
// jsPDF/jspdf-autotable are loaded lazily (dynamic import) rather than at
// module top-level. These are the only files in the app that need them, and
// keeping them out of the static import graph means the rest of the app
// (every other page, since App.jsx imports pages eagerly) can never fail to
// load just because this dependency is missing or hasn't been installed yet.
async function loadPdfLibs() {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default || autoTableModule;
  return { jsPDF, autoTable };
}
 
// jsPDF's default fonts don't render the ₹ glyph reliably across viewers, so
// PDF exports use "Rs." — CSV exports and the on-screen UI keep the real ₹ symbol.
const inr = (v = 0) => `Rs. ${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
 
function addHeader(doc, title, subtitle) {
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 45);
  doc.text("SB Stocks", 14, 18);
  doc.setFontSize(12);
  doc.setTextColor(90, 100, 120);
  doc.text(title, 14, 26);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 32);
  }
  doc.setDrawColor(220, 224, 232);
  doc.line(14, 36, 196, 36);
}
 
export async function exportPortfolioReportPDF({ user, portfolio, holdings }) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  addHeader(doc, "Portfolio Report", `Generated ${formatDate(new Date())} for ${user?.name || "User"}`);

  const summary = calcPortfolioSummary(portfolio, holdings);
  // Net worth and all-time P/L come straight from the server (getPortfolio)
  // and reflect cash + holdings vs. starting capital — unlike
  // summary.totalValue / totalProfitLoss (current-holdings-only), these
  // never read as ₹0 just because everything's been sold off.
  const netWorth = portfolio?.netWorth ?? (summary.totalValue + (user?.walletBalance || 0));
  const overallPL = portfolio?.overallPL ?? summary.totalProfitLoss;
 
  autoTable(doc, {
    startY: 42,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      ["Net worth (holdings + cash)", inr(netWorth)],
      ["Current holdings value", inr(summary.totalValue)],
      ["Total invested (current holdings)", inr(summary.totalInvested)],
      ["Lifetime investment (all-time BUYs)", inr(portfolio?.totalInvestment ?? summary.totalInvested)],
      ["Total profit / loss (all-time)", inr(overallPL)],
      ["Cash balance", inr(user?.walletBalance)],
      ["Number of holdings", String(summary.holdingsCount)],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
 
  const holdingsRows = summary.rows.map((r) => [
    r.symbol,
    r.quantity,
    inr(r.avgBuyPrice),
    inr(r.currentPrice),
    inr(r.currentValue),
    inr(r.profitLoss),
  ]);
 
  if (holdingsRows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Stock", "Qty", "Avg buy price", "Current price", "Current value", "Profit / loss"]],
      body: holdingsRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 26, 43] },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 128, 145);
    doc.text("You don't have any holdings currently.", 14, doc.lastAutoTable.finalY + 14);
  }
 
  doc.setFontSize(8);
  doc.setTextColor(140, 148, 165);
  doc.text("Simulated portfolio for educational purposes only. Not real financial advice.", 14, 287);
 
  doc.save(`sb-stocks-portfolio-report-${Date.now()}.pdf`);
}
 
export async function exportHoldingsPDF(holdings) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  addHeader(doc, "Holdings", `Generated ${formatDate(new Date())}`);
 
  const rows = calcHoldings(holdings).map((r) => [
    r.symbol,
    r.companyName,
    r.quantity,
    inr(r.avgBuyPrice),
    inr(r.investment),
    inr(r.currentValue),
    inr(r.profitLoss),
  ]);
 
  if (rows.length > 0) {
    autoTable(doc, {
      startY: 42,
      head: [["Stock", "Company", "Qty", "Avg buy price", "Investment", "Current value", "P/L"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 26, 43] },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 128, 145);
    doc.text("You don't have any holdings currently.", 14, 46);
  }
 
  doc.save(`sb-stocks-holdings-${Date.now()}.pdf`);
}
 
export async function exportTransactionsPDF(transactions) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  addHeader(doc, "Transaction History", `Generated ${formatDate(new Date())}`);
 
  const rows = (transactions || []).map((tx) => [
    formatDate(tx.transactionDate),
    tx.type?.toUpperCase(),
    tx.stockId?.symbol || "",
    tx.quantity,
    inr(tx.price),
    inr(tx.totalAmount),
  ]);
 
  autoTable(doc, {
    startY: 42,
    head: [["Date", "Type", "Stock", "Qty", "Price", "Total"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [17, 26, 43] },
  });
 
  doc.save(`sb-stocks-transactions-${Date.now()}.pdf`);
}
 
// Monthly investment report — buys/sells grouped by calendar month
export async function exportMonthlyReportPDF(transactions) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  addHeader(doc, "Monthly Investment Report", `Generated ${formatDate(new Date())}`);
 
  const byMonth = {};
  (transactions || []).forEach((tx) => {
    const d = new Date(tx.transactionDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!byMonth[key]) byMonth[key] = { invested: 0, realized: 0, buys: 0, sells: 0 };
    if (tx.type?.toUpperCase() === "BUY") { byMonth[key].invested += tx.totalAmount || 0; byMonth[key].buys += 1; }
    else { byMonth[key].realized += tx.totalAmount || 0; byMonth[key].sells += 1; }
  });
 
  const rows = Object.keys(byMonth).sort().reverse().map((key) => {
    const [y, m] = key.split("-");
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const s = byMonth[key];
    return [label, s.buys, s.sells, inr(s.invested), inr(s.realized)];
  });
 
  autoTable(doc, {
    startY: 42,
    head: [["Month", "Buys", "Sells", "Invested", "Realized"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [17, 26, 43] },
  });
 
  doc.save(`sb-stocks-monthly-report-${Date.now()}.pdf`);
}
 
// Downloads the portfolio summary directly as a PDF file (no print dialog).
// Mirrors the same content as printPortfolioSummary — stat overview plus
// the holdings breakdown table — but saves straight to disk via jsPDF.
export async function exportPortfolioSummaryPDF({ user, portfolio, holdings }) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  addHeader(doc, "Portfolio Summary", `Generated ${formatDate(new Date())} for ${user?.name || "User"}`);

  const summary = calcPortfolioSummary(portfolio, holdings);
  const netWorth = portfolio?.netWorth ?? (summary.totalValue + (user?.walletBalance || 0));
  const overallPL = portfolio?.overallPL ?? summary.totalProfitLoss;
 
  autoTable(doc, {
    startY: 42,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      ["Net worth (holdings + cash)", inr(netWorth)],
      ["Current holdings value", inr(summary.totalValue)],
      ["Total invested (current holdings)", inr(summary.totalInvested)],
      ["Lifetime investment (all-time BUYs)", inr(portfolio?.totalInvestment ?? summary.totalInvested)],
      ["Total profit / loss (all-time)", inr(overallPL)],
    ],
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
  });
 
  const rows = summary.rows.map((r) => [
    r.symbol,
    r.quantity,
    inr(r.avgBuyPrice),
    inr(r.currentValue),
    inr(r.profitLoss),
  ]);
 
  if (rows.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Stock", "Qty", "Avg buy price", "Current value", "P/L"]],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [17, 26, 43] },
    });
  } else {
    doc.setFontSize(10);
    doc.setTextColor(120, 128, 145);
    doc.text("You don't have any holdings currently.", 14, doc.lastAutoTable.finalY + 14);
  }
 
  doc.save(`sb-stocks-portfolio-summary-${Date.now()}.pdf`);
}
 
// ---------------------------------------------------------------------------
// STOCK COMPARISON REPORT
//
// `stocks` is the Compare page's `activeStocks` array — each entry is
// { stock, history, weekGrowth, monthGrowth, yearGrowth, vol }, i.e. exactly
// what's already rendered on screen. Nothing is re-fetched or recomputed
// here beyond simple formatting/comparison, so every exported number is
// guaranteed to match the UI at the moment of export.
// ---------------------------------------------------------------------------
const CMP_COLORS = [[47, 230, 166], [92, 155, 255], [245, 166, 35], [255, 92, 122]];
const cmpPct = (v) => (v == null ? "N/A" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
const cmpCr = (v) => (v ? `Rs. ${(v / 1e7).toFixed(2)} Cr` : "N/A");
const riskLabel = (vol) => (vol == null ? "N/A" : vol < 1.5 ? "Low" : vol < 3 ? "Moderate" : "High");

// Finds, for a given (higher-is-better or lower-is-better) metric, which
// stock is best and which is worst among the compared set — used to derive
// the strengths/weaknesses list below. Returns {bestIdx, worstIdx} or nulls
// when there isn't enough valid data to compare.
function bestWorst(values, higherIsBetter) {
  const valid = values.map((v, i) => (v == null || Number.isNaN(v) ? null : { v, i })).filter(Boolean);
  if (valid.length < 2) return { bestIdx: null, worstIdx: null };
  const sorted = [...valid].sort((a, b) => (higherIsBetter ? b.v - a.v : a.v - b.v));
  const bestIdx = sorted[0].v !== sorted[sorted.length - 1].v ? sorted[0].i : null;
  const worstIdx = sorted[0].v !== sorted[sorted.length - 1].v ? sorted[sorted.length - 1].i : null;
  return { bestIdx, worstIdx };
}

// Builds a per-stock { strengths: [...], weaknesses: [...] } list purely by
// comparing the compared stocks' own live metrics against each other — a
// "strength" is a metric where that stock leads the group, a "weakness" is
// one where it trails. No external/fabricated judgement is introduced.
function buildStrengthsWeaknesses(stocks) {
  const notes = stocks.map(() => ({ strengths: [], weaknesses: [] }));

  const metrics = [
    { values: stocks.map((s) => s.monthGrowth), higherIsBetter: true, strength: "Strongest monthly price growth", weakness: "Weakest monthly price growth" },
    { values: stocks.map((s) => s.vol), higherIsBetter: false, strength: "Lowest volatility (steadier price)", weakness: "Highest volatility (larger price swings)" },
    { values: stocks.map((s) => (s.stock.peRatio > 0 ? s.stock.peRatio : null)), higherIsBetter: false, strength: "Most attractively valued (lowest P/E)", weakness: "Richest valuation (highest P/E)" },
    { values: stocks.map((s) => s.stock.dividendYield), higherIsBetter: true, strength: "Highest dividend yield", weakness: "Lowest dividend yield" },
    { values: stocks.map((s) => s.yearGrowth), higherIsBetter: true, strength: "Strongest yearly return", weakness: "Weakest yearly return" },
  ];

  metrics.forEach(({ values, higherIsBetter, strength, weakness }) => {
    const { bestIdx, worstIdx } = bestWorst(values, higherIsBetter);
    if (bestIdx != null) notes[bestIdx].strengths.push(strength);
    if (worstIdx != null && worstIdx !== bestIdx) notes[worstIdx].weaknesses.push(weakness);
  });

  return notes;
}

// Native jsPDF vector line chart (no canvas/rasterization, so it can never
// fail headlessly) plotting normalized % price movement for every compared
// stock over its available trailing history, plus a color-coded legend.
// Returns the Y position just below the chart.
function drawComparisonChart(doc, stocks, startY) {
  const chartX = 14, chartW = 182, chartH = 60, chartY = startY;
  doc.setDrawColor(220, 224, 232);
  doc.rect(chartX, chartY, chartW, chartH);

  const series = stocks
    .map((s, i) => {
      const closes = (s.history || []).slice(-60).map((h) => h.close).filter((v) => v != null);
      if (closes.length < 2) return null;
      const base = closes[0];
      return { color: CMP_COLORS[i % CMP_COLORS.length], symbol: s.stock.symbol, normalized: closes.map((c) => ((c - base) / base) * 100) };
    })
    .filter(Boolean);

  if (!series.length) {
    doc.setFontSize(9);
    doc.setTextColor(140, 148, 165);
    doc.text("Not enough price history to plot a chart.", chartX + 8, chartY + chartH / 2);
    return chartY + chartH + 10;
  }

  const allValues = series.flatMap((s) => s.normalized);
  const maxV = Math.max(...allValues, 0), minV = Math.min(...allValues, 0), range = maxV - minV || 1;
  const xFor = (i, len) => chartX + (i / (len - 1)) * chartW;
  const yFor = (v) => chartY + chartH - ((v - minV) / range) * chartH;

  doc.setDrawColor(200, 204, 214);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(chartX, yFor(0), chartX + chartW, yFor(0));
  doc.setLineDashPattern([], 0);

  series.forEach(({ color, normalized }) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.6);
    for (let i = 1; i < normalized.length; i++) {
      doc.line(xFor(i - 1, normalized.length), yFor(normalized[i - 1]), xFor(i, normalized.length), yFor(normalized[i]));
    }
  });
  doc.setLineWidth(0.2);

  let legendX = chartX;
  const legendY = chartY + chartH + 7;
  doc.setFontSize(8);
  series.forEach(({ color, symbol }) => {
    doc.setFillColor(...color);
    doc.rect(legendX, legendY - 2.5, 3, 3, "F");
    doc.setTextColor(90, 100, 120);
    doc.text(symbol, legendX + 5, legendY);
    legendX += doc.getTextWidth(symbol) + 16;
  });

  return legendY + 8;
}

// Auto-generated, plainly-worded summary naming the group's strongest
// monthly performer and its most volatile member — grounded entirely in the
// numbers already computed above, framed the same "not financial advice"
// way as the rest of the app's auto-generated write-ups.
function comparisonSummary(stocks) {
  const withMonth = stocks.filter((s) => s.monthGrowth != null);
  const withVol = stocks.filter((s) => s.vol != null);
  const parts = [];
  if (withMonth.length >= 2) {
    const best = [...withMonth].sort((a, b) => b.monthGrowth - a.monthGrowth)[0];
    parts.push(`${best.stock.symbol} posted the strongest monthly return among the compared stocks, at ${cmpPct(best.monthGrowth)}`);
  }
  if (withVol.length >= 2) {
    const riskiest = [...withVol].sort((a, b) => b.vol - a.vol)[0];
    parts.push(`${riskiest.stock.symbol} showed the highest estimated volatility (${riskiest.vol.toFixed(2)}%), making it the relatively higher-risk pick of the group`);
  }
  if (!parts.length) return "Not enough historical data yet to summarize relative performance across the selected stocks.";
  return `${parts.join(". ")}. This comparison is based on live platform data at the time of export and is not financial advice.`;
}

export async function exportComparisonPDF(stocks) {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF();
  const symbols = stocks.map((s) => s.stock.symbol).join(" vs ");
  addHeader(doc, "Stock Comparison Report", `Generated ${formatDate(new Date())} - ${symbols}`);

  autoTable(doc, {
    startY: 42,
    head: [["Metric", ...stocks.map((s) => s.stock.symbol)]],
    body: [
      ["Company", ...stocks.map((s) => s.stock.companyName || "N/A")],
      ["Sector", ...stocks.map((s) => s.stock.sector || "N/A")],
      ["Current Price", ...stocks.map((s) => inr(s.stock.currentPrice))],
      ["Today's Change", ...stocks.map((s) => cmpPct(s.stock.changePercent))],
      ["Weekly Growth", ...stocks.map((s) => cmpPct(s.weekGrowth))],
      ["Monthly Growth", ...stocks.map((s) => cmpPct(s.monthGrowth))],
      ["Yearly Growth", ...stocks.map((s) => cmpPct(s.yearGrowth))],
      ["Market Cap", ...stocks.map((s) => cmpCr(s.stock.marketCap))],
      ["P/E Ratio", ...stocks.map((s) => (s.stock.peRatio > 0 ? s.stock.peRatio : "N/A"))],
      ["Dividend Yield", ...stocks.map((s) => (s.stock.dividendYield ? `${s.stock.dividendYield}%` : "N/A"))],
      ["Beta", ...stocks.map((s) => s.stock.beta ?? "N/A")],
      ["Volatility (est.)", ...stocks.map((s) => (s.vol == null ? "N/A" : `${s.vol.toFixed(2)}%`))],
      ["Risk Level", ...stocks.map((s) => riskLabel(s.vol))],
      ["52 Week High", ...stocks.map((s) => inr(s.stock.week52High))],
      ["52 Week Low", ...stocks.map((s) => inr(s.stock.week52Low))],
    ],
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [17, 26, 43] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 34 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0 && [3, 4, 5, 6].includes(data.row.index)) {
        const raw = String(data.cell.raw || "");
        if (raw.startsWith("+")) data.cell.styles.textColor = [10, 122, 79];
        else if (raw.startsWith("-")) data.cell.styles.textColor = [192, 35, 63];
      }
    },
  });

  let y = doc.lastAutoTable.finalY + 10;
  if (y > 210) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 45);
  doc.text("Price Movement Comparison (normalized %)", 14, y);
  y = drawComparisonChart(doc, stocks, y + 5);

  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 45);
  doc.text("Strengths & Weaknesses", 14, y);
  y += 7;
  const notes = buildStrengthsWeaknesses(stocks);
  stocks.forEach((s, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setFontSize(9.5);
    doc.setFont(undefined, "bold");
    doc.setTextColor(20, 30, 45);
    doc.text(s.stock.symbol, 14, y);
    doc.setFont(undefined, "normal");
    y += 5;
    doc.setFontSize(8.5);
    const { strengths, weaknesses } = notes[i];
    if (!strengths.length && !weaknesses.length) {
      doc.setTextColor(140, 148, 165);
      doc.text("No standout metrics relative to the other compared stocks.", 18, y);
      y += 5;
    } else {
      strengths.forEach((s2) => { doc.setTextColor(10, 122, 79); doc.text(`+ ${s2}`, 18, y); y += 4.5; });
      weaknesses.forEach((w) => { doc.setTextColor(192, 35, 63); doc.text(`- ${w}`, 18, y); y += 4.5; });
    }
    y += 3;
  });

  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 45);
  doc.text("Comparison Summary", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 120);
  const summaryLines = doc.splitTextToSize(comparisonSummary(stocks), 182);
  doc.text(summaryLines, 14, y);

  doc.setFontSize(8);
  doc.setTextColor(140, 148, 165);
  doc.text("Live comparison data from SB Stocks at time of export. Simulated market, not real financial advice.", 14, 292);

  doc.save(`sb-stocks-comparison-${Date.now()}.pdf`);
}
