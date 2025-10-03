import { useEffect, useState } from "react";

export function MyPortfolios() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

   // 👇 API URL comes from .env
  const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

  useEffect(() => {
    fetch(`${API_URL}/api/portfolios`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch portfolios");
        return res.json();
      })
      .then((data) => {
        setPortfolios(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_URL]);

  if (loading) return <p>Loading portfolios...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;

  return (
    <div className="px-8 py-6">
      <h1 className="text-3xl font-bold mb-6">📊 My Portfolios</h1>
      {portfolios.length === 0 ? (
        <p>No portfolios yet. Create one!</p>
      ) : (
        portfolios.map((p) => (
          <div
            key={p.id}
            className="mb-6 p-4 border border-gray-600 rounded-lg bg-gray-800"
          >
            <h2 className="text-xl font-semibold mb-2">{p.name}</h2>
            {p.stocks.length === 0 ? (
              <p className="text-gray-400">No stocks yet</p>
            ) : (
              <ul className="list-disc list-inside">
                {p.stocks.map((s, i) => (
                  <li key={i}>
                    {s.ticker} – ${s.price.toFixed(2)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}
