import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { INDEXES, ALL } from "./tickers.js";

const KEY = process.env.FINNHUB_API_KEY;
const PORT = process.env.PORT || 3001;
const BASE = "https://finnhub.io/api/v1";
const CACHE_FILE = new URL("./cache.json", import.meta.url);
const TTL = 7 * 24 * 60 * 60 * 1000;   // company details (logo, market cap, 52-week) refresh weekly
const QUOTE_TTL = 5 * 60 * 1000;       // prices refresh whenever a company's turn comes around
const RETRY_FAILED = 6 * 60 * 60 * 1000;
const DELAY = 1200;                    // free plan = 60 calls/min, we use ~50

if (!KEY || KEY === "your_key_here") {
  console.error("Missing FINNHUB_API_KEY. Copy server/.env.example to server/.env and add your key.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch {}
const failed = {};

async function fh(endpoint, params) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = `${BASE}${endpoint}?${new URLSearchParams({ ...params, token: KEY })}`;
    const res = await fetch(url);
    if (res.status === 429) { await sleep(15000); continue; }
    if (!res.ok) throw new Error(`Finnhub ${res.status}`);
    return res.json();
  }
  throw new Error("Rate limited");
}

const detailsFresh = (c) => c && c.updated && c.exchange !== undefined && Date.now() - c.updated < TTL;

async function refreshSymbol(symbol) {
  const c = cache[symbol] || { symbol };
  if (!detailsFresh(c)) {
    const profile = await fh("/stock/profile2", { symbol });
    if (!profile.name) throw new Error("No company profile");
    await sleep(DELAY);
    const metric = await fh("/stock/metric", { symbol, metric: "all" });
    await sleep(DELAY);
    Object.assign(c, {
      name: profile.name,
      logo: profile.logo || "",
      exchange: profile.exchange || "",
      marketCap: profile.marketCapitalization ?? null, // millions USD
      high52: metric.metric?.["52WeekHigh"] ?? null,
      low52: metric.metric?.["52WeekLow"] ?? null,
      updated: Date.now(),
    });
  }
  const q = await fh("/quote", { symbol });
  await sleep(DELAY);
  Object.assign(c, {
    price: q.c || null,          // current price
    change: q.d ?? null,         // change vs previous close
    changePct: q.dp ?? null,     // % change today
    prevClose: q.pc || null,
    quoteUpdated: Date.now(),
  });
  cache[symbol] = c;
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

async function refreshLoop() {
  while (true) {
    for (const s of ALL) {
      const c = cache[s];
      if (failed[s] && Date.now() - failed[s] < RETRY_FAILED) continue;
      if (detailsFresh(c) && c.quoteUpdated && Date.now() - c.quoteUpdated < QUOTE_TTL) continue;
      try { await refreshSymbol(s); console.log("loaded", s); }
      catch (e) { failed[s] = Date.now(); console.error("failed", s, e.message); await sleep(DELAY); }
    }
    await sleep(30 * 1000);
  }
}

// TradingView needs the exchange in front of the ticker, e.g. NASDAQ:AAPL or NYSE:JPM
function tvSymbol(c) {
  const ex = (c.exchange || "").toUpperCase();
  if (ex.includes("NASDAQ")) return `NASDAQ:${c.symbol}`;
  if (ex.includes("ARCA") || ex.includes("AMERICAN")) return `AMEX:${c.symbol}`;
  if (ex.includes("NEW YORK") || ex.includes("NYSE")) return `NYSE:${c.symbol}`;
  if (ex.includes("CBOE") || ex.includes("BATS")) return `CBOE:${c.symbol}`;
  return c.symbol;
}
const withTv = (c) => ({ ...c, tv: tvSymbol(c) });

const app = express();
app.use(cors());

// /api/stocks?index=nasdaq100  or  /api/stocks?index=sp500
app.get("/api/stocks", (req, res) => {
  const list = INDEXES[req.query.index] || INDEXES.nasdaq100;
  const stocks = list.map((s) => cache[s]).filter((c) => c && c.quoteUpdated).map(withTv);
  res.json({ loaded: stocks.length, total: list.length, stocks });
});

app.get("/api/stock/:symbol", (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  if (!ALL.includes(symbol)) return res.status(404).json({ error: "Unknown symbol" });
  res.json(cache[symbol] ? withTv(cache[symbol]) : { symbol, tv: symbol });
});

// In production, serve the built React website from this same server
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "../client/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  refreshLoop();
});
