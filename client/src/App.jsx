import { useEffect, useMemo, useState } from "react";

const fmtCap = (m) => {
  if (m == null) return "—";
  if (m >= 1e6) return `$${(m / 1e6).toFixed(2)}T`;
  if (m >= 1e3) return `$${(m / 1e3).toFixed(1)}B`;
  return `$${m.toFixed(0)}M`;
};
const fmtPrice = (p) => (p == null ? "—" : `$${p.toFixed(2)}`);

export function NavBar({ active }) {
  const link = (href, label, key) => (
    <a href={href} className={"nav-link" + (active === key ? " active fw-semibold" : "")}>{label}</a>
  );
  return (
    <nav className="navbar navbar-expand navbar-dark bg-dark mb-4">
      <div className="container">
        <a className="navbar-brand fw-semibold" href="/">📈 Market Explorer</a>
        <div className="navbar-nav ms-auto">
          {link("/nasdaq100", "Nasdaq 100", "nasdaq100")}
          {link("/sp500", "S&P 500", "sp500")}
        </div>
      </div>
    </nav>
  );
}

export default function App({ index = "nasdaq100", title = "Nasdaq 100" }) {
  const [data, setData] = useState({ stocks: [], loaded: 0, total: 100 });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState({ key: "marketCap", dir: "desc" });

  useEffect(() => {
    document.title = `${title} companies`;
    let timer;
    const load = async () => {
      try {
        const res = await fetch(`/api/stocks?index=${index}`);
        const json = await res.json();
        setData(json);
        setError("");
        if (json.loaded < json.total) timer = setTimeout(load, 8000);
      } catch {
        setError("Cannot reach the backend. Is the server running on port 3001?");
        timer = setTimeout(load, 8000);
      }
    };
    load();
    return () => clearTimeout(timer);
  }, [index, title]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.stocks.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      const x = a[key] ?? -Infinity, y = b[key] ?? -Infinity;
      const r = typeof x === "string" ? x.localeCompare(y) : x - y;
      return dir === "asc" ? r : -r;
    });
  }, [data, query, sort]);

  const th = (key, label, right) => (
    <th role="button" className={right ? "text-end" : ""}
        onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}>
      {label} {sort.key === key ? (sort.dir === "asc" ? "▲" : "▼") : ""}
    </th>
  );

  const pct = Math.round((data.loaded / data.total) * 100);

  return (
    <>
      <NavBar active={index} />

      <div className="container pb-5">
        <h1 className="h3 mb-3">{title} companies</h1>

        <div className="row g-3 align-items-center mb-3">
          <div className="col-md-6">
            <input className="form-control" placeholder="Search by ticker or company…"
                   value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="col-md-6 text-md-end text-muted small">
            {rows.length} companies shown
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {data.loaded < data.total && !error && (
          <div className="alert alert-info">
            Loading data from Finnhub. The free plan is rate-limited, so the first load can take a while
            {index === "sp500" ? " (30 minutes or more for the S&P 500)" : ""}. Companies appear as they arrive.
            <div className="progress mt-2" style={{ height: 8 }}>
              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${pct}%` }} />
            </div>
            <div className="small mt-1">{data.loaded} / {data.total} loaded</div>
          </div>
        )}

        <div className="table-responsive shadow-sm rounded">
          <table className="table table-hover align-middle mb-0 bg-white">
            <thead className="table-light">
              <tr>
                <th style={{ width: 56 }}>Logo</th>
                {th("symbol", "Ticker")}
                {th("name", "Company")}
                {th("price", "Price", true)}
                {th("changePct", "Today", true)}
                {th("high52", "52-Week High", true)}
                {th("low52", "52-Week Low", true)}
                {th("marketCap", "Market Cap", true)}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.symbol} style={{ cursor: "pointer" }}
                    onClick={() => window.open(`/stock/${s.symbol}`, "_blank", "noopener")}>
                  <td>
                    {s.logo ? (
                      <img src={s.logo} alt={s.symbol} width="36" height="36"
                           style={{ objectFit: "contain" }}
                           onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                    ) : (
                      <span className="badge bg-secondary">{s.symbol[0]}</span>
                    )}
                  </td>
                  <td className="fw-bold">{s.symbol}</td>
                  <td>
                    <a href={`/stock/${s.symbol}`} target="_blank" rel="noopener noreferrer"
                       onClick={(e) => e.stopPropagation()}
                       className="link-dark link-underline-opacity-0 link-underline-opacity-100-hover">
                      {s.name}
                    </a>
                  </td>
                  <td className="text-end fw-bold">{fmtPrice(s.price)}</td>
                  <td className={"text-end " + (s.change > 0 ? "text-success" : s.change < 0 ? "text-danger" : "")}>
                    {s.change == null ? "—" : `${s.change > 0 ? "+" : ""}${s.change.toFixed(2)} (${s.changePct > 0 ? "+" : ""}${s.changePct.toFixed(2)}%)`}
                  </td>
                  <td className="text-end text-success">{fmtPrice(s.high52)}</td>
                  <td className="text-end text-danger">{fmtPrice(s.low52)}</td>
                  <td className="text-end fw-semibold">{fmtCap(s.marketCap)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan="8" className="text-center text-muted py-4">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
