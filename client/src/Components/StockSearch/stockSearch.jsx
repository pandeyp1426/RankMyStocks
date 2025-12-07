import { useEffect, useMemo, useState } from "react";
import { Popup } from "../CreatePopUp/popup.jsx";
import { apiUrl } from "../../api";
import "./stockSearch.css";

// StockSearch: lets users search by company name or ticker,
// then view a concise description of the selected stock.
export function StockSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { ticker, name, description, price }
  const [results, setResults] = useState([]); // typeahead suggestions
  const [showPopup, setShowPopup] = useState(false);

  // Debounced query for suggestions
  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    let active = true;
    async function run() {
      if (debouncedQuery.length < 2) {
        setResults([]);
        return;
      }
      try {
        const res = await fetch(
          apiUrl(`/search?q=${encodeURIComponent(debouncedQuery)}`)
        );
        const data = await res.json();
        if (!active) return;
        setResults(Array.isArray(data) ? data.slice(0, 8) : []);
      } catch {
        if (!active) return;
        // silently ignore suggestion errors
      }
    }
    const t = setTimeout(run, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [debouncedQuery]);

  async function fetchSnapshot(ticker) {
    const symbol = (ticker || "").trim().toUpperCase();
    if (!symbol) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(apiUrl(`/stock-info?ticker=${encodeURIComponent(symbol)}`));
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.error || "No data found.");
      }
      setResult(data);
      setShowPopup(true);
    } catch (e) {
      setError(e.message || "Failed to fetch ticker info.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setResults([]);
    fetchSnapshot(q);
  }

  async function handleSelect(item) {
    setQuery(item.ticker || "");
    setResults([]);
    fetchSnapshot(item.ticker);
  }

  // description fetch removed; using key statistics + initial overview instead

  return (
    <section className="stock-search">
      <div className="stock-search__card">
        <h2 className="stock-search__title">Search Stocks</h2>
        <p className="stock-search__subtitle">Search by ticker symbol</p>

        <form className="stock-search__input-row" onSubmit={handleSubmit}>
          <div className="stock-search__typeahead">
            <div className="stock-search__input-wrap">
              <span className="stock-search__icon" aria-hidden>🔎</span>
              <input
                type="text"
                className="stock-search__input"
                placeholder="Type a ticker, e.g., TSLA"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {results.length > 0 && (
              <ul className="stock-search__results">
                {results.map((item) => (
                  <li
                    key={`${item.ticker}-${item.name}`}
                    className="stock-search__result"
                    onClick={() => handleSelect(item)}
                  >
                    <span className="stock-search__result-name">{item.name}</span>
                    <span className="stock-search__result-ticker">{item.ticker}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" className="stock-search__btn hero-button">Search</button>
        </form>

        {loading && <div className="stock-search__status">Searching…</div>}
        {error && <div className="stock-search__error">{error}</div>}

        <Popup trigger={showPopup} setTrigger={setShowPopup}>
          {result ? (
            <div>
              <h3 className="stock-search__popup-title">{result.name || result.ticker}</h3>
              <div className="stock-search__popup-sub">
                <strong>{result.ticker}</strong>
                {" • "}
                {fmtPrice(result.price)}
                <span className={`stock-search__change-chip ${changeClass(result.change, result.changePercent)}`}>
                  {formatChange(result.change, result.changePercent)}
                </span>
              </div>
              <p className="stock-search__description" style={{ textAlign: "left" }}>
                {result.description || "No description available."}
              </p>

              <div className="key-stats">
                <h4>Key statistics</h4>
                <div className="key-stats-grid">
                  <div className="key-stat"><span className="label">Market cap</span><span className="value">{fmtMoney(result.marketCap, true)}</span></div>
                  <div className="key-stat"><span className="label">P/E ratio</span><span className="value">{fmtNum(result.peRatio)}</span></div>
                  <div className="key-stat"><span className="label">Dividend yield</span><span className="value">{fmtPct(result.dividendYield)}</span></div>
                  <div className="key-stat"><span className="label">Average volume</span><span className="value">{fmtCompact(result.avgVolume)}</span></div>
                  <div className="key-stat"><span className="label">High today</span><span className="value">{fmtMoney(result.high)}</span></div>
                  <div className="key-stat"><span className="label">Low today</span><span className="value">{fmtMoney(result.low)}</span></div>
                  <div className="key-stat"><span className="label">Open price</span><span className="value">{fmtMoney(result.open)}</span></div>
                  <div className="key-stat"><span className="label">Volume</span><span className="value">{fmtCompact(result.volume)}</span></div>
                  <div className="key-stat"><span className="label">52 Week high</span><span className="value">{fmtMoney(result.week52High)}</span></div>
                  <div className="key-stat"><span className="label">52 Week low</span><span className="value">{fmtMoney(result.week52Low)}</span></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="stock-search__status">No data loaded</div>
          )}
        </Popup>
      </div>
    </section>
  );
}

// formatting helpers used in stats display
function fmtMoney(n, abbreviate = false) {
  if (n == null) return "—";
  const val = Number(n);
  if (abbreviate) return "$" + fmtCompact(val);
  return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPrice(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) { if (n == null) return "—"; return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function fmtPct(n) { if (n == null || n === 0) return "—"; const pct = Number(n) * 100; return pct.toFixed(2) + "%"; }
function fmtCompact(n) { if (n == null) return "—"; return Number(n).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }); }
function formatChange(change, pct) {
  if (change == null && pct == null) return "—";
  const price = Number(change);
  const percent = Number(pct);
  const showPrice = !Number.isNaN(price);
  const showPct = !Number.isNaN(percent);
  const parts = [];
  if (showPrice) {
    const sign = price > 0 ? "+" : "";
    parts.push(`${sign}${price.toFixed(2)}`);
  }
  if (showPct) {
    const signPct = percent > 0 ? "+" : "";
    parts.push(`${signPct}${percent.toFixed(2)}%`);
  }
  if (!parts.length) return "—";
  return parts.join(" | ");
}
function changeClass(change, pct) {
  const val = !Number.isNaN(Number(change)) ? Number(change) : Number(pct);
  if (Number.isNaN(val)) return "neutral";
  if (val > 0) return "positive";
  if (val < 0) return "negative";
  return "neutral";
}
