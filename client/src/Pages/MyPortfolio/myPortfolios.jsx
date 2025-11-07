import { useEffect, useState } from "react";
import "./myPortfolios.css";
import { Popup } from "../../Components/CreatePopUp/popup.jsx";
import deleteIcon from "../../assets/img/delete.png";

// Converts any date format to a safe numeric timestamp
function toTimestamp(dateString) {
  if (!dateString) return 0;
  try {
    const normalized = dateString.replace(" ", "T");
    const ts = new Date(normalized).getTime();
    return isNaN(ts) ? 0 : ts;
  } catch {
    return 0;
  }
}

export function MyPortfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [sortOption, setSortOption] = useState("date");
  const [ascending, setAscending] = useState(false); // false = descending (LIFO)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState(null);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [activePortfolio, setActivePortfolio] = useState(null);
  const [activeStock, setActiveStock] = useState(null);
  const [stockStats, setStockStats] = useState(null);
  const [digest, setDigest] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const activeStockCount = activePortfolio?.stocks?.length || 0;
  const enableStockScroll = activeStockCount > 5;


  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5002";

  // Fetch portfolios from backend
  useEffect(() => {
    fetch(`${API_URL}/api/portfolios`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch portfolios");
        return res.json();
      })
      .then((data) => {
        // Default: sort by newest first (LIFO)
        const sorted = sortPortfolios(data, "date", false);
        setPortfolios(data);
        setFiltered(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_URL]);

  // Sort portfolios by selected option
  function sortPortfolios(list, option, asc) {
    const sorted = [...list];

    switch (option) {
      case "value":
        sorted.sort((a, b) => {
          const valueA =
            a.stocks?.reduce((acc, s) => acc + (s.price || 0), 0) || 0;
          const valueB =
            b.stocks?.reduce((acc, s) => acc + (s.price || 0), 0) || 0;
          return asc ? valueA - valueB : valueB - valueA;
        });
        break;

      case "alphabet":
        sorted.sort((a, b) =>
          asc
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name)
        );
        break;

      case "date":
      default:
        sorted.sort((a, b) =>
          asc
            ? toTimestamp(a.created_at) - toTimestamp(b.created_at)
            : toTimestamp(b.created_at) - toTimestamp(a.created_at)
        );
        break;
    }

    return sorted;
  }

  function openPortfolio(p) {
    setActivePortfolio(p);
    setActiveStock(null);
    setStockStats(null);
    setDigest(null);
    setShowPortfolio(true);
  }

  async function loadStockDetails(ticker) {
    setLoadingDetails(true);
    setActiveStock({ ticker });
    setStockStats(null);
    setDigest(null);
    try {
      const [sres, dres] = await Promise.all([
        fetch(`${API_URL}/api/stock-stats?ticker=${encodeURIComponent(ticker)}`),
        fetch(`${API_URL}/api/daily-digest?ticker=${encodeURIComponent(ticker)}`)
      ]);
      const sdata = await sres.json();
      const ddata = await dres.json();
      setStockStats(!sdata.error ? sdata : null);
      setDigest(!ddata.error ? ddata : null);
    } catch (e) {
      // ignore
    } finally {
      setLoadingDetails(false);
    }
  }

  // Handle dropdown change
  function handleSortChange(e) {
    const option = e.target.value;
    setSortOption(option);
    setFiltered(sortPortfolios(portfolios, option, ascending));
  }

  // Toggle ascending / descending order
  function toggleOrder() {
    const newAsc = !ascending;
    setAscending(newAsc);
    setFiltered(sortPortfolios(portfolios, sortOption, newAsc));
  }
  // Handle portfolio deletion
  async function handleDelete(id) {
  try {
    const res = await fetch(`${API_URL}/api/delete-portfolio/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (res.ok) {
      setPortfolios((prev) => prev.filter((p) => p.id !== id));
      setFiltered((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert(data.error || "Failed to delete portfolio");
    }
  } catch (err) {
    console.error("Error deleting portfolio:", err);
    alert("An error occurred while deleting");
  }
}


  // --- Render UI ---
  if (loading) return <p className="loading-text">Loading portfolios...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;

  return (
    <div className="my-portfolios-page">
      {/* Header with Title + Sort Options */}
      <div className="page-header">
        <h1 className="page-title">📊 My Portfolios</h1>

        <div className="sort-controls">
          <select
            className="sort-dropdown"
            value={sortOption}
            onChange={handleSortChange}
          >
            <option value="date">Sort by Date</option>
            <option value="value">Sort by Portfolio Value</option>
            <option value="alphabet">Sort by Alphabet</option>
          </select>

          <button className="order-toggle" onClick={toggleOrder}>
            {ascending ? "🔼" : "🔽"}
          </button>
        </div>
      </div>

      {/* Portfolios Grid */}
      {filtered.length === 0 ? (
        <p className="no-portfolios">No portfolios yet. Create one!</p>
      ) : (
        <div className="portfolios-grid">
          {filtered.map((p) => {
            const totalValue = p.stocks
              ? p.stocks.reduce((acc, s) => acc + (s.price || 0), 0).toFixed(2)
              : "0.00";

            const shouldScroll = p.stocks && p.stocks.length > 4;

            return (
              <div
                key={p.id}
                className="portfolio-card"
                onClick={(e) => {
                  if ((e.target.closest && e.target.closest('.delete-btn')) || e.target.classList.contains('delete-btn')) return;
                  openPortfolio(p);
                }}
              >
                <div className="portfolio-header">
                   <h2>{p.name}</h2>
                    <button className="delete-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setShowConfirm(true);
                      setPortfolioToDelete(p.id);
                    }}
                    title="Delete portfolio"
                    >
                     <img src={deleteIcon} alt="Delete" className="trash-icon" />
                     </button>
                     </div>
                <div className="portfolio-summary">
                  <p>
                    <strong>Total Stocks:</strong> {p.stocks?.length || 0}
                  </p>
                  <p>
                    <strong>Portfolio Value:</strong> ${totalValue}
                  </p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {p.created_at
                      ? new Date(toTimestamp(p.created_at)).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>

                <div
                  className={`stock-list-container ${
                    shouldScroll ? "scrollable" : ""
                  }`}
                >
                  {p.stocks && p.stocks.length > 0 ? (
                    <ul className="stock-list">
                      {p.stocks.map((s, i) => (
                        <li key={i} className="stock-item">
                          <span className="ticker">{s.ticker}</span>
                          <span className="price">${s.price.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="no-stocks">No stocks yet</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showConfirm && (
        <div
          className="confirm-overlay"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="confirm-box"
            onClick={(e) => e.stopPropagation()}
          >
            <p>Are you sure you want to delete this portfolio?</p>
            <div className="confirm-buttons">
              <button
                className="confirm-yes"
                onClick={() => {
                  if (portfolioToDelete == null) return;
                  handleDelete(portfolioToDelete);
                  setShowConfirm(false);
                }}
              >
                Yes, Delete
              </button>
              <button
                className="confirm-cancel"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <Popup trigger={showPortfolio} setTrigger={setShowPortfolio}>
        {activePortfolio ? (
          <div className="portfolio-modal">
            <div className="pm-left">
              <h3 className="pm-title">{activePortfolio.name}</h3>
              <div className={`pm-stock-pane ${enableStockScroll ? "pm-stock-pane--scroll" : ""}`}>
                <ul className="pm-stock-list">
                  {(activePortfolio.stocks || []).map((s, i) => (
                    <li key={i} className="pm-stock-item" onClick={() => loadStockDetails(s.ticker)}>
                      <span>{s.ticker}</span>
                      <span className="pm-price">${Number(s.price || 0).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="pm-right">
              {!activeStock && <p className="pm-hint">Select a stock to see Key Insights and Daily Digest.</p>}
              {loadingDetails && <p className="pm-hint">Loading details…</p>}
              {stockStats && (
                <div className="pm-stats">
                  <h4>Key Insights</h4>
                  <div className="pm-grid">
                    <div><span className="label">Market cap</span><span className="value">{fmtMoney(stockStats.marketCap, true)}</span></div>
                    <div><span className="label">P/E ratio</span><span className="value">{fmtNum(stockStats.peRatio)}</span></div>
                    <div><span className="label">Dividend yield</span><span className="value">{fmtPct(stockStats.dividendYield)}</span></div>
                    <div><span className="label">Open</span><span className="value">{fmtMoney(stockStats.open)}</span></div>
                    <div><span className="label">High</span><span className="value">{fmtMoney(stockStats.high)}</span></div>
                    <div><span className="label">Low</span><span className="value">{fmtMoney(stockStats.low)}</span></div>
                    <div><span className="label">52w High</span><span className="value">{fmtMoney(stockStats.week52High)}</span></div>
                    <div><span className="label">52w Low</span><span className="value">{fmtMoney(stockStats.week52Low)}</span></div>
                    <div><span className="label">Avg volume</span><span className="value">{fmtCompact(stockStats.avgVolume)}</span></div>
                    <div><span className="label">Volume</span><span className="value">{fmtCompact(stockStats.volume)}</span></div>
                  </div>
                </div>
              )}
              {digest && (
                <div className="pm-digest">
                  <h4>Daily Digest</h4>
                  <p className="digest-text">{digest.summary}</p>
                  {digest.sources && digest.sources.length > 0 && (
                    <ul className="sources">
                      {digest.sources.slice(0, 3).map((src, i) => (
                        <li key={i}><a href={src.url} target="_blank" rel="noreferrer">{src.title}</a></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="pm-hint">Loading…</p>
        )}
      </Popup>
    </div>
  );
}

// formatting helpers
function fmtMoney(n, abbreviate = false) {
  if (n == null) return "—";
  const val = Number(n);
  if (abbreviate) return "$" + fmtCompact(val);
  return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n) { if (n == null) return "—"; return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 }); }
function fmtPct(n) { if (n == null || n === 0) return "—"; const pct = Number(n) * 100; return pct.toFixed(2) + "%"; }
function fmtCompact(n) { if (n == null) return "—"; return Number(n).toLocaleString(undefined, { notation: 'compact', maximumFractionDigits: 2 }); }
