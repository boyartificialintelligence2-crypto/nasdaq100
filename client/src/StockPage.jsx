import { useEffect, useState } from "react";
import { NavBar } from "./App.jsx";

// TradingView's free chart library (no API key needed)
function loadTradingView() {
  return new Promise((resolve) => {
    if (window.TradingView) return resolve();
    let s = document.querySelector("script[data-tv]");
    if (!s) {
      s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.dataset.tv = "1";
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve());
  });
}

// style: "1" = candlesticks, "2" = line, "3" = area
function TVChart({ id, symbol, style, height, details }) {
  useEffect(() => {
    let cancelled = false;
    loadTradingView().then(() => {
      const el = document.getElementById(id);
      if (cancelled || !el || !window.TradingView) return;
      el.innerHTML = "";
      new window.TradingView.widget({
        container_id: id,
        width: "100%",
        height,
        symbol,
        interval: "D",
        timezone: "exchange",
        theme: "light",
        style,
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: false,
        withdateranges: true,      // 1D 5D 1M 3M 6M YTD 1Y 5Y All
        hide_side_toolbar: false,  // drawing tools on the left
        details,                   // key stats panel on the right
        save_image: true,
      });
    });
    return () => {
      cancelled = true;
      const el = document.getElementById(id);
      if (el) el.innerHTML = "";
    };
  }, [id, symbol, style, height, details]);

  return <div id={id} style={{ height, width: "100%" }} />;
}

export default function StockPage({ symbol }) {
  const [info, setInfo] = useState(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("both"); // "line" | "candles" | "both"
  const [vh, setVh] = useState(window.innerHeight);

  useEffect(() => {
    document.title = `${symbol} stock chart`;
    fetch(`/api/stock/${symbol}`).then((r) => r.json())
      .then((j) => setInfo(j))
      .catch(() => {})
      .finally(() => setReady(true));
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [symbol]);

  const tv = info?.tv || symbol;
  const up = info?.change >= 0;
  const fullH = Math.max(620, vh - 200);   // one big chart
  const halfH = 600;                        // two stacked charts

  return (
    <>
      <NavBar />

      <div className="container-fluid px-4 pb-5">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
          <div className="d-flex align-items-center gap-3">
            {info?.logo && <img src={info.logo} alt="" width="44" height="44" style={{ objectFit: "contain" }} />}
            <div>
              <h1 className="h3 mb-0">
                {info?.name || symbol} <span className="text-muted fs-5">{symbol}</span>
              </h1>
              {info?.price && (
                <div>
                  <span className="fs-4 fw-bold">${info.price.toFixed(2)}</span>{" "}
                  <span className={up ? "text-success" : "text-danger"}>
                    {up ? "▲" : "▼"} {Math.abs(info.changePct).toFixed(2)}% ({up ? "+" : "−"}{Math.abs(info.change).toFixed(2)}) today
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="btn-group">
            {[["line", "Line graph"], ["candles", "Candlestick"], ["both", "Both"]].map(([k, label]) => (
              <button key={k} className={"btn " + (view === k ? "btn-dark" : "btn-outline-dark")}
                      onClick={() => setView(k)}>{label}</button>
            ))}
          </div>
        </div>

        {!ready && <div className="text-center text-muted py-5">Loading chart…</div>}
        {ready && view === "line" && (
          <div className="card shadow-sm overflow-hidden">
            <TVChart key="line" id="tv-line" symbol={tv} style="2" height={fullH} details={true} />
          </div>
        )}
        {ready && view === "candles" && (
          <div className="card shadow-sm overflow-hidden">
            <TVChart key="candles" id="tv-candles" symbol={tv} style="1" height={fullH} details={true} />
          </div>
        )}
        {ready && view === "both" && (
          <>
            <h2 className="h6 text-muted">Line graph</h2>
            <div className="card shadow-sm overflow-hidden mb-4">
              <TVChart key="both-line" id="tv-both-line" symbol={tv} style="2" height={halfH} details={false} />
            </div>
            <h2 className="h6 text-muted">Candlestick</h2>
            <div className="card shadow-sm overflow-hidden">
              <TVChart key="both-candles" id="tv-both-candles" symbol={tv} style="1" height={halfH} details={false} />
            </div>
          </>
        )}

        <p className="text-end small mt-2 mb-0">
          <a href={`https://www.tradingview.com/symbols/${tv.replace(":", "-")}/`} rel="noopener nofollow" target="_blank">
            {symbol} stock chart
          </a>{" "}by TradingView
        </p>
      </div>
    </>
  );
}
