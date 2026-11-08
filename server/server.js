import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { TICKERS } from "./tickers.js";

const KEY = process.env.FINNHUB_API_KEY;
const PORT = process.env.PORT || 3001;
const BASE = "https://finnhub.io/api/v1";
const CACHE_FILE = new URL("./cache.json", import.meta.url);
const TTL = 12 * 60 * 60 * 1000; // refresh data every 12 hours
const QUOTE_TTL = 5 * 60 * 1000; // refresh prices every 5 minutes
const DELAY = 1200;              // free plan = 60 calls/min, we use ~50

if (!KEY || KEY === "your_key_here") {
  console.error("Missing FINNHUB_API_KEY. Copy server/.env.example to server/.env and add your key.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch {}

async function fh(path, params) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const url = `${BASE}${path}?${new URLSearchParams({ ...params, token: KEY })}`;
    const res = await fetch(url);
    if (res.status === 429) { await sleep(15000); continue; }
    if (!res.ok) throw new Error(`Finnhub ${res.status}`);
    return res.json();
  }
  throw new Error("Rate limited");
}

async function refreshSymbol(symbol) {
  const c = cache[symbol] || { symbol };
  if (!c.updated || Date.now() - c.updated > TTL) {
    const profile = await fh("/stock/profile2", { symbol });
    await sleep(DELAY);
    const metric = await fh("/stock/metric", { symbol, metric: "all" });
    await sleep(DELAY);
    Object.assign(c, {
      name: profile.name || symbol,
      logo: profile.logo || "",
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
    for (const s of TICKERS) {
      const c = cache[s];
      const fresh = c && c.quoteUpdated && Date.now() - c.quoteUpdated < QUOTE_TTL
        && Date.now() - c.updated < TTL;
      if (fresh) continue;
      try { await refreshSymbol(s); console.log("loaded", s); }
      catch (e) { console.error("failed", s, e.message); await sleep(DELAY); }
    }
    await sleep(30 * 1000);
  }
}

const app = express();
app.use(cors());

app.get("/api/stocks", (_req, res) => {
  const stocks = TICKERS.map((s) => cache[s]).filter((c) => c && c.quoteUpdated);
  res.json({ loaded: stocks.length, total: TICKERS.length, stocks });
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
