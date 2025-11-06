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
      } else {
        setError(data?.error || "No data found.");
      }
    } catch {
      setError("Failed to fetch ticker info.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDescription(item) {
    setSelected(item);
    setDescription("");
    setDescLoading(true);
    setError("");
    try {
      const res = await fetch(
        `http://127.0.0.1:5002/api/stock-description?ticker=${encodeURIComponent(
          item.ticker
        )}`
      );
      const data = await res.json();
      if (data && data.description) {
        setDescription(data.description);
      } else if (data && data.error) {
        setError(data.error);
      } else {
        setError("No description available.");
      }
    } catch (e) {
      setError("Failed to load description.");
    } finally {
      setDescLoading(false);
    }
  }

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
            </div>
          ) : (
            <div className="stock-search__status">No data loaded</div>
          )}
        </Popup>
      </div>
    </section>
  );
}
