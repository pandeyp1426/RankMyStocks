import { useEffect, useState } from "react";
import "./myPortfolios.css";

export function MyPortfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

  useEffect(() => {
    fetch(`${API_URL}/api/portfolios`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch portfolios");
        return res.json();
      })
      .then((data) => {
        // Sort newest first — handles missing or invalid dates gracefully
         const sorted = [...data].sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at) : 0;
          const dateB = b.created_at ? new Date(b.created_at) : 0;
          return dateB - dateA;
        });
          
        setPortfolios(sorted);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_URL]);

  if (loading) return <p className="loading-text">Loading portfolios...</p>;
  if (error) return <p className="error-text">Error: {error}</p>;

  return (
    <div className="my-portfolios-page">
      <h1 className="page-title">📊 My Portfolios</h1>

      {portfolios.length === 0 ? (
        <p className="no-portfolios">No portfolios yet. Create one!</p>
      ) : (
        <div className="portfolios-grid">
          {portfolios.map((p) => {
            const totalValue = p.stocks
              ? p.stocks.reduce((acc, s) => acc + (s.price || 0), 0).toFixed(2)
              : "0.00";

            const shouldScroll = p.stocks && p.stocks.length > 4;

            return (
              <div key={p.id} className="portfolio-card">
                <div className="portfolio-header">
                  <h2>{p.name}</h2>
                </div>

                <div className="portfolio-summary">
                  <p><strong>Total Stocks:</strong> {p.stocks?.length || 0}</p>
                  <p><strong>Portfolio Value:</strong> ${totalValue}</p>
                  <p>
                    <strong>Created:</strong>{" "}
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString()
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
    </div>
  );
}
