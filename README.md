# Nasdaq 100 Explorer (React + Bootstrap + Node/Express + Finnhub)

## Setup (VS Code terminal, Node 18+ required)
1. Get a free API key at https://finnhub.io/dashboard
2. Copy `server/.env.example` to `server/.env` and paste your key.
3. Run:
       npm run install:all
       npm run dev
4. Open http://localhost:5173

The backend fetches data slowly (free plan = 60 calls/min), caches it in
`server/cache.json`, and refreshes every 12 hours. The first load takes ~4 minutes;
the table fills in as data arrives. Your API key never reaches the browser.

Edit `server/tickers.js` to change the company list.
