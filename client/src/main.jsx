import React from "react";
import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import App from "./App.jsx";
import HomePage from "./HomePage.jsx";
import StockPage from "./StockPage.jsx";

// Which page to show depends on the address:
//   /             -> home page (US indices)
//   /nasdaq100    -> Nasdaq 100 table
//   /sp500        -> S&P 500 table
//   /stock/AAPL   -> chart page for one company
const path = window.location.pathname;
const stock = path.match(/^\/stock\/([A-Za-z.]+)/);

let page;
if (stock) page = <StockPage symbol={stock[1].toUpperCase()} />;
else if (/^\/nasdaq100\/?$/i.test(path)) page = <App index="nasdaq100" title="Nasdaq 100" />;
else if (/^\/sp500\/?$/i.test(path)) page = <App index="sp500" title="S&P 500" />;
else page = <HomePage />;

createRoot(document.getElementById("root")).render(page);
