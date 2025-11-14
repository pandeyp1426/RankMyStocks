import { useEffect, useMemo, useState } from "react";
import "./portfolioRankings.css";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5002";
const SORT_MODES = [
  { id: "value", label: "Top Value" },
  { id: "stocks", label: "Most Stocks" },
  { id: "change", label: "% Change" },
];

function normalizeChange(value, asc) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return asc ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
}

export function PortfolioRankings() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortMode, setSortMode] = useState("value");
  const [ascending, setAscending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/api/portfolio-leaderboard`);
        const data = await res.json();
        if (!ignore) {
          if (!res.ok || data?.error) {
            throw new Error(data?.message || data?.error || "Failed to load leaderboard");
          }
          setLeaderboard(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!ignore) setError(err.message || "Failed to load leaderboard");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [API_URL]);

  const sorted = useMemo(() => {
    const list = [...leaderboard];
    list.sort((a, b) => {
      switch (sortMode) {
        case "stocks":
          return ascending ? a.stockCount - b.stockCount : b.stockCount - a.stockCount;
        case "change": {
          const normalizedA = normalizeChange(a.changePct, ascending);
          const normalizedB = normalizeChange(b.changePct, ascending);
          return ascending ? normalizedA - normalizedB : normalizedB - normalizedA;
        }
        case "value":
        default:
          return ascending
            ? (a.currentValue || 0) - (b.currentValue || 0)
            : (b.currentValue || 0) - (a.currentValue || 0);
      }
    });
    return list;
  }, [leaderboard, sortMode, ascending]);

  const totalAssets = sorted.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalHoldings = sorted.reduce((sum, p) => sum + (p.stockCount || 0), 0);
  const isChangeSort = sortMode === "change";
  const directionText = ascending ? "lowest -> highest" : "highest -> lowest";

  if (loading) {
    return (
      <section className="rankings-page">
        <div className="rankings-card filler">Loading leaderboard...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rankings-page">
        <div className="rankings-card filler error">
          Failed to load leaderboard. Please check your connection and try again.
        </div>
      </section>
    );
  }

  return (
    <section className="rankings-page">
      <header className="rankings-hero">
        <div>
          <p className="eyebrow">Live Leaderboard</p>
          <h1>Top Performing Portfolios</h1>
          <p className="lede">
            Track which community portfolios hold the most value and the broadest holdings.
          </p>
        </div>
        <div className="hero-metrics">
          <div>
            <span>Total Assets</span>
            <strong>{fmtMoney(totalAssets)}</strong>
          </div>
          <div>
            <span>Total Holdings</span>
            <strong>{totalHoldings}</strong>
          </div>
          <div>
            <span>Portfolios Tracked</span>
            <strong>{sorted.length}</strong>
          </div>
        </div>
      </header>

      <div className="rankings-toolbar">
        <div className="sort-pills">
          {SORT_MODES.map((mode) => (
            <button
              key={mode.id}
              className={`sort-pill ${sortMode === mode.id ? "active" : ""}`}
              onClick={() => setSortMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <button
          className="order-toggle"
          onClick={() => setAscending((prev) => !prev)}
          aria-label={`Toggle sort order (currently ${ascending ? "ascending" : "descending"})`}
          title={`Sort ${ascending ? "ascending" : "descending"}`}
        >
          <span aria-hidden="true">{ascending ? "↑" : "↓"}</span>
        </button>
      </div>
      {isChangeSort && (
        <p className="ranking-note">
          <span className="note-accent" aria-hidden="true"></span>
          <strong>Ranking portfolios by percentage change.</strong> Displaying {directionText}.
        </p>
      )}

      <div className="leaderboard">
        {sorted.map((item, index) => (
          <article key={item.id} className={`leaderboard-row ${index < 3 ? `top-${index + 1}` : ""}`}>
            <div className="rank-badge">#{index + 1}</div>
            <div className="leaderboard-name">
              <h3>{item.name || "Unnamed Portfolio"}</h3>
              <span>{item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}</span>
            </div>
            <div className="leaderboard-metrics">
              <div>
                <span>Total Value</span>
                <strong>{fmtMoney(item.currentValue)}</strong>
              </div>
              <div>
                <span>Invested</span>
                <strong>{fmtMoney(item.investedValue)}</strong>
              </div>
              <div>
                <span>Holdings</span>
                <strong>{item.stockCount || 0}</strong>
              </div>
              <div>
                <span>Change</span>
                <strong className={changeClass(item.changePct)}>{formatChange(item.changePct)}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function fmtMoney(value) {
  if (value == null) return "-";
  return "$" + value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatChange(value) {
  if (typeof value !== "number") return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
}

function changeClass(value) {
  if (typeof value !== "number") return "change-neutral";
  if (value > 0) return "change-positive";
  if (value < 0) return "change-negative";
  return "change-neutral";
}
