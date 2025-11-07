import { useEffect, useMemo, useState } from "react";
import { Popup } from "../CreatePopUp/popup.jsx";
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
  const [stats, setStats] = useState(null);

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
          `http://127.0.0.1:5002/api/search?q=${encodeURIComponent(debouncedQuery)}`
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

  async function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`http://127.0.0.1:5002/api/random-stock?ticker=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data && !data.error) {
        setResult(data);
        setShowPopup(true);
        try {
          const sres = await fetch(`http://127.0.0.1:5002/api/stock-stats?ticker=${encodeURIComponent(data.ticker)}`);
          const sdata = await sres.json();
          setStats(!sdata.error ? sdata : null);
        } catch {}
      } else {
        setError(data?.error || "No data found.");
      }
    } catch (e) {
      setError("Failed to fetch ticker info.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(item) {
    setQuery(item.ticker);
    setResults([]);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `http://127.0.0.1:5002/api/random-stock?ticker=${encodeURIComponent(item.ticker)}`
      );
      const data = await res.json();
      if (data && !data.error) {
        setResult(data);
        setShowPopup(true);
        try {
          const sres = await fetch(`http://127.0.0.1:5002/api/stock-stats?ticker=${encodeURIComponent(item.ticker)}`);
          const sdata = await sres.json();
          setStats(!sdata.error ? sdata : null);
        } catch {}
      } else {
        setError(data?.error || "No data found.");
      }
    } catch {
      setError("Failed to fetch ticker info.");
    } finally {
      setLoading(false);
    }
  }

  // description fetch removed; using key statistics + initial overview instead

  return (
    <section className="stock-search">
      <div className="stock-search__card">
        <h2 className="stock-search__title">Search Stocks</h2>
        <p className="stock-search__subtitle">Search by ticker symbol</p>

        <form className="stock-search__input-row" onSubmit={handleSubmit}>
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
          <button type="submit" className="stock-search__btn hero-button">Search</button>
        </form>

        {loading && <div className="stock-search__status">Searching…</div>}
        {error && <div className="stock-search__error">{error}</div>}

        {results.length > 0 && (
          <ul className="stock-search__results">
            {results.map((item) => (
              <li
                key={item.ticker}
                className="stock-search__result"
                onClick={() => handleSelect(item)}
              >
                <span className="stock-search__result-name">{item.name}</span>
                <span className="stock-search__result-ticker">{item.ticker}</span>
              </li>
            ))}
          </ul>
        )}

        <Popup trigger={showPopup} setTrigger={setShowPopup}>
          {result ? (
            <div>
              <h3 className="stock-search__popup-title">{result.name || result.ticker}</h3>
              <div className="stock-search__popup-sub">
                <strong>{result.ticker}</strong>
                {" • "}
                ${Number(result.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="stock-search__description" style={{ textAlign: "left" }}>
                {result.description || "No description available."}
              </p>

              {stats && (
                <div className="key-stats">
                  <h4>Key statistics</h4>
                  <div className="key-stats-grid">
                    <div className="key-stat"><span className="label">Market cap</span><span className="value">{fmtMoney(stats.marketCap, true)}</span></div>
                    <div className="key-stat"><span className="label">P/E ratio</span><span className="value">{fmtNum(stats.peRatio)}</span></div>
                    <div className="key-stat"><span className="label">Dividend yield</span><span className="value">{fmtPct(stats.dividendYield)}</span></div>
                    <div className="key-stat"><span className="label">Average volume</span><span className="value">{fmtCompact(stats.avgVolume)}</span></div>
                    <div className="key-stat"><span className="label">High today</span><span className="value">{fmtMoney(stats.high)}</span></div>
                    <div className="key-stat"><span className="label">Low today</span><span className="value">{fmtMoney(stats.low)}</span></div>
                    <div className="key-stat"><span className="label">Open price</span><span className="value">{fmtMoney(stats.open)}</span></div>
                    <div className="key-stat"><span className="label">Volume</span><span className="value">{fmtCompact(stats.volume)}</span></div>
                    <div className="key-stat"><span className="label">52 Week high</span><span className="value">{fmtMoney(stats.week52High)}</span></div>
                    <div className="key-stat"><span className="label">52 Week low</span><span className="value">{fmtMoney(stats.week52Low)}</span></div>
                  </div>
                </div>
              )}
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
function fmtNum(n) { if (n == null) return "—"; return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function fmtPct(n) { if (n == null || n === 0) return "—"; const pct = Number(n) * 100; return pct.toFixed(2) + "%"; }
function fmtCompact(n) { if (n == null) return "—"; return Number(n).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }); }
