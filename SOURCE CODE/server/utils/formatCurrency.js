// Mirrors client/src/utils/formatters.js#formatCurrency exactly, so any price
// baked into a server-generated string (e.g. a price-alert notification) reads
// identically to how the same number is displayed everywhere in the UI.
function formatCurrency(value = 0) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    value
  );
}

module.exports = { formatCurrency };
