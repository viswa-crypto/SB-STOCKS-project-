export const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
 
// Indian numbering: Lakh (L) / Crore (Cr) instead of K/M/B — reads naturally for INR amounts
export const formatCompact = (value = 0) => {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(2)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};
 
export const formatPercent = (value = 0) => `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
 
export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
 
export const formatDateTime = (date) =>
  new Date(date).toLocaleString("en-IN", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
 
export const formatTime = (date) =>
  new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });