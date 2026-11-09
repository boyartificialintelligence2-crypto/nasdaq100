import { useEffect } from "react";
import { NavBar } from "./App.jsx";

const INDICES = [
  {
    href: "/nasdaq100",
    title: "Nasdaq 100",
    badge: "100",
    color: "#0d99c6",
    ticker: "NDX",
    name: "Nasdaq-100 Index",
    count: "100 companies",
    text: "The largest non-financial companies on the Nasdaq exchange, led by technology giants like Apple, Microsoft and Nvidia.",
  },
  {
    href: "/sp500",
    title: "S&P 500",
    badge: "500",
    color: "#c8102e",
    ticker: "SPX",
    name: "S&P 500 Index",
    count: "About 500 companies",
    text: "500 of the largest US companies across every sector, from banks and healthcare to energy and consumer brands.",
  },
];

export default function HomePage() {
  useEffect(() => { document.title = "Market Explorer – US indices"; }, []);

  return (
    <div className="bg-light min-vh-100">
      <NavBar />

      <main className="container pb-5 pt-2">
        <h1 className="display-6 fw-bold mb-1" style={{ color: "#2962ff" }}>US indices</h1>
        <p className="text-secondary mb-4">
          Choose an index to see every company in it, with prices, 52-week highs and lows, market caps and charts.
        </p>

        <div className="row g-4">
          {INDICES.map((ix) => (
            <div className="col-12 col-md-6" key={ix.href}>
              <div className="card h-100 rounded-4 shadow-sm border-0">
                <div className="card-body p-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <span
                      className="rounded-circle d-inline-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0"
                      style={{ width: 52, height: 52, background: ix.color }}
                    >
                      {ix.badge}
                    </span>
                    <div>
                      <h2 className="h4 fw-bold mb-0">{ix.title}</h2>
                      <div className="small text-secondary">{ix.ticker} · {ix.name}</div>
                    </div>
                  </div>

                  <p className="text-secondary">{ix.text}</p>

                  <div className="d-flex justify-content-between align-items-center mt-4">
                    <span className="badge text-bg-secondary">{ix.count}</span>
                    <a href={ix.href} className="btn btn-primary stretched-link">Explore {ix.title} →</a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
