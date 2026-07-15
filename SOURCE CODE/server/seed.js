require("dotenv").config();
const connectDB = require("./config/db");
const Stock = require("./models/Stock");
const MarketData = require("./models/MarketData");
 
// 15 real NSE large-caps with realistic INR prices and enriched fields.
// OHLC/52-week ranges are derived-but-plausible from currentPrice, not live data.
const raw = [
  { symbol: "RELIANCE", companyName: "Reliance Industries Ltd.", sector: "Energy", currentPrice: 2945, peRatio: 27.4, eps: 107.5, dividendYield: 0.35, beta: 1.05, about: "India's largest conglomerate spanning energy, petrochemicals, retail, and telecom.", industry: "Oil & Gas / Conglomerate", ceo: "Mukesh Ambani", founded: "1966", headquarters: "Mumbai, Maharashtra", employees: "3,50,000+", isFeatured: true },
  { symbol: "TCS", companyName: "Tata Consultancy Services Ltd.", sector: "Technology", currentPrice: 3860, peRatio: 29.1, eps: 132.6, dividendYield: 1.6, beta: 0.72, about: "India's largest IT services and consulting firm, part of the Tata Group.", industry: "Information Technology", ceo: "K. Krithivasan", founded: "1968", headquarters: "Mumbai, Maharashtra", employees: "6,00,000+", isFeatured: true },
  { symbol: "INFY", companyName: "Infosys Ltd.", sector: "Technology", currentPrice: 1685, peRatio: 25.8, eps: 65.3, dividendYield: 2.1, beta: 0.78, about: "Global leader in next-generation digital services and consulting.", industry: "Information Technology", ceo: "Salil Parekh", founded: "1981", headquarters: "Bengaluru, Karnataka", employees: "3,20,000+", isTrending: true },
  { symbol: "HDFCBANK", companyName: "HDFC Bank Ltd.", sector: "Financials", currentPrice: 1720, peRatio: 19.5, eps: 88.2, dividendYield: 1.1, beta: 0.95, about: "India's largest private sector bank by assets.", industry: "Banking", ceo: "Sashidhar Jagdishan", founded: "1994", headquarters: "Mumbai, Maharashtra", employees: "2,15,000+", isFeatured: true },
  { symbol: "ICICIBANK", companyName: "ICICI Bank Ltd.", sector: "Financials", currentPrice: 1240, peRatio: 18.2, eps: 68.1, dividendYield: 0.9, beta: 1.02, about: "One of India's leading private sector banks offering a wide range of banking products.", industry: "Banking", ceo: "Sandeep Bakhshi", founded: "1994", headquarters: "Mumbai, Maharashtra", employees: "1,45,000+" },
  { symbol: "HINDUNILVR", companyName: "Hindustan Unilever Ltd.", sector: "Consumer Staples", currentPrice: 2380, peRatio: 52.3, eps: 45.5, dividendYield: 1.8, beta: 0.55, about: "India's largest fast-moving consumer goods company.", industry: "FMCG", ceo: "Rohit Jawa", founded: "1933", headquarters: "Mumbai, Maharashtra", employees: "18,000+" },
  { symbol: "SBIN", companyName: "State Bank of India", sector: "Financials", currentPrice: 815, peRatio: 10.4, eps: 78.4, dividendYield: 1.7, beta: 1.18, about: "India's largest public sector bank by assets and branch network.", industry: "Banking", ceo: "C.S. Setty", founded: "1955", headquarters: "Mumbai, Maharashtra", employees: "2,35,000+", isTrending: true },
  { symbol: "BHARTIARTL", companyName: "Bharti Airtel Ltd.", sector: "Telecom", currentPrice: 1560, peRatio: 68.5, eps: 22.8, dividendYield: 0.5, beta: 0.88, about: "Leading global telecommunications company operating in India and Africa.", industry: "Telecommunications", ceo: "Gopal Vittal", founded: "1995", headquarters: "New Delhi", employees: "23,000+" },
  { symbol: "ITC", companyName: "ITC Ltd.", sector: "Consumer Staples", currentPrice: 435, peRatio: 24.6, eps: 17.7, dividendYield: 3.2, beta: 0.62, about: "Diversified conglomerate with interests in FMCG, hotels, paperboards, and agri-business.", industry: "FMCG / Conglomerate", ceo: "Sanjiv Puri", founded: "1910", headquarters: "Kolkata, West Bengal", employees: "25,000+" },
  { symbol: "LT", companyName: "Larsen & Toubro Ltd.", sector: "Industrials", currentPrice: 3560, peRatio: 33.2, eps: 107.2, dividendYield: 0.8, beta: 1.12, about: "India's largest engineering and construction conglomerate.", industry: "Engineering & Construction", ceo: "S.N. Subrahmanyan", founded: "1938", headquarters: "Mumbai, Maharashtra", employees: "60,000+" },
  { symbol: "MARUTI", companyName: "Maruti Suzuki India Ltd.", sector: "Automotive", currentPrice: 12450, peRatio: 27.9, eps: 446.2, dividendYield: 1.0, beta: 0.98, about: "India's largest passenger vehicle manufacturer.", industry: "Automobiles", ceo: "Hisashi Takeuchi", founded: "1981", headquarters: "New Delhi", employees: "17,000+" },
  { symbol: "ASIANPAINT", companyName: "Asian Paints Ltd.", sector: "Materials", currentPrice: 2890, peRatio: 48.7, eps: 59.3, dividendYield: 1.4, beta: 0.68, about: "India's largest paint company and a leading player across Asia.", industry: "Paints & Coatings", ceo: "Amit Syngle", founded: "1942", headquarters: "Mumbai, Maharashtra", employees: "8,000+" },
  { symbol: "TATAMOTORS", companyName: "Tata Motors Ltd.", sector: "Automotive", currentPrice: 985, peRatio: 12.1, eps: 81.4, dividendYield: 0.4, beta: 1.35, about: "Leading Indian automobile manufacturer, part of the Tata Group, owner of Jaguar Land Rover.", industry: "Automobiles", ceo: "N. Chandrasekaran (Chairman)", founded: "1945", headquarters: "Mumbai, Maharashtra", employees: "80,000+", isTrending: true },
  { symbol: "AXISBANK", companyName: "Axis Bank Ltd.", sector: "Financials", currentPrice: 1145, peRatio: 14.8, eps: 77.4, dividendYield: 0.1, beta: 1.08, about: "Third-largest private sector bank in India.", industry: "Banking", ceo: "Amitabh Chaudhry", founded: "1993", headquarters: "Mumbai, Maharashtra", employees: "1,04,000+" },
  { symbol: "WIPRO", companyName: "Wipro Ltd.", sector: "Technology", currentPrice: 545, peRatio: 22.7, eps: 24.0, dividendYield: 0.5, beta: 0.75, about: "Global IT, consulting, and business process services company.", industry: "Information Technology", ceo: "Srini Pallia", founded: "1945", headquarters: "Bengaluru, Karnataka", employees: "2,30,000+" },
];
 
const stocks = raw.map((s) => {
  const openPrice = Number((s.currentPrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2));
  const prevClose = Number((s.currentPrice * (1 + (Math.random() - 0.5) * 0.015)).toFixed(2));
  const dayHigh = Number((Math.max(s.currentPrice, openPrice) * (1 + Math.random() * 0.008)).toFixed(2));
  const dayLow = Number((Math.min(s.currentPrice, openPrice) * (1 - Math.random() * 0.008)).toFixed(2));
  const week52High = Number((s.currentPrice * (1 + 0.15 + Math.random() * 0.2)).toFixed(2));
  const week52Low = Number((s.currentPrice * (1 - 0.15 - Math.random() * 0.2)).toFixed(2));
  const change = Number((s.currentPrice - prevClose).toFixed(2));
  const changePercent = Number(((change / prevClose) * 100).toFixed(2));
  const marketCap = Math.floor(s.currentPrice * (5_00_00_000 + Math.random() * 50_00_00_000));
  const volume = Math.floor(1_00_000 + Math.random() * 50_00_000);
 
  return {
    ...s,
    openPrice,
    prevClose,
    dayHigh,
    dayLow,
    week52High,
    week52Low,
    change,
    changePercent,
    marketCap,
    volume,
    logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.symbol)}&background=111A2B&color=2FE6A6&bold=true`,
  };
});
 
const seed = async () => {
  await connectDB();
  await Stock.deleteMany({});
  await MarketData.deleteMany({});
  const created = await Stock.insertMany(stocks);
 
  // Backfill 5 years of daily closes per stock (one point per calendar day, set at a
  // fixed end-of-day time) so 1Y/5Y/MAX ranges have real calendar-spaced history from
  // the moment the DB is seeded — today's finer-grained intraday points are supplied
  // separately, live, by stockPriceService's recurring ticks once the server is running.
  const DAYS_BACK = 5 * 365;
  for (const stock of created) {
    let price = stock.prevClose;
    const docs = [];
    for (let i = DAYS_BACK; i >= 1; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(15, 30, 0, 0); // mimic NSE market-close timestamp
      const changePct = (Math.random() - 0.5) * 2.4;
      const close = Number((price * (1 + changePct / 100)).toFixed(2));
      docs.push({
        stockId: stock._id,
        date,
        open: price,
        high: Math.max(price, close) * (1 + Math.random() * 0.005),
        low: Math.min(price, close) * (1 - Math.random() * 0.005),
        close,
        volume: Math.floor(1_00_000 + Math.random() * 30_00_000),
        adjustedClose: close,
      });
      price = close;
    }
    await MarketData.insertMany(docs);
  }
 
  console.log(`Seeded ${stocks.length} stocks with ${DAYS_BACK} days (~5 years) of daily history each.`);
  process.exit(0);
};
 
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});