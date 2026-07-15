# SB Stocks

A full-stack stock trading simulator built with React (Vite), Node/Express, and MongoDB.
Trade with virtual funds, track your portfolio, build watchlists, and review your transaction history —
with a 3D animated landing page and smooth page transitions throughout.

## Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Redux Toolkit, Framer Motion, React Three Fiber (3D), Recharts, Axios
- **Backend**: Node.js, Express, MongoDB + Mongoose, JWT auth, bcrypt

## Folder structure
```
SB-Stocks/
├── client/         # React frontend
│   └── src/
│       ├── assets/
│       ├── components/
│       ├── pages/
│       ├── redux/
│       ├── services/
│       ├── hooks/
│       ├── layouts/
│       ├── routes/
│       └── utils/
├── server/         # Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validators/
├── README.md
├── package.json
└── .env
```

## Getting started

### 1. Install dependencies
```bash
npm run install-all
```

### 2. Configure environment
Copy the values from the root `.env` into `server/.env` (already scaffolded), and adjust `MONGO_URI` /
`JWT_SECRET` as needed. Make sure MongoDB is running locally, or point `MONGO_URI` at an Atlas cluster.

### 3. Seed sample stocks
```bash
cd server
npm run seed
```

### 4. Run the app (two terminals)
```bash
# Terminal 1
npm run server

# Terminal 2
npm run client
```
- Backend: http://localhost:5000
- Frontend: http://localhost:5173

### Demo accounts
After registering, the first account can be promoted to admin by setting `role: "admin"` directly in
the `users` collection — there's no public admin signup by design.

## Pages
Landing · Login · Register · Dashboard · Stocks · Stock Details · Portfolio · Watchlist ·
Transactions · Profile · Settings · Admin Dashboard · Admin Users · Admin Stocks · 404

## Notes
This is a simulator — all trading uses virtual funds (`walletBalance`) and stock prices are
generated/updated by a lightweight price-simulation service (`server/services/stockPriceService.js`)
rather than a live market feed. Swap in a real market data provider by replacing that service.
