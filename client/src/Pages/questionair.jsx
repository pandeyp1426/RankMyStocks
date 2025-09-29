import React, { useState, useEffect } from "react";

export function Questionair() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchStockOptions() {
    setLoading(true);
    try {
      // call your backend twice to get two random stocks
      const fetchOne = () => fetch("/random-stock").then(r => r.json());
      const [s1, s2] = await Promise.all([fetchOne(), fetchOne()]);
      setOptions([
        { ticker: Object.keys(s1["Time Series (Daily)"] || {})[0] || "?", raw: s1 },
        { ticker: Object.keys(s2["Time Series (Daily)"] || {})[0] || "?", raw: s2 }
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // load when page mounts
  useEffect(() => {
    fetchStockOptions();
  }, []);

  return (
    <div className="text-center text-white p-6">
      <h1 className="text-4xl mb-6">Pick A Stock</h1>
      {loading && <p>Loading stock options…</p>}

      <div className="flex flex-col md:flex-row justify-center gap-6">
        {options.map((opt, i) => (
          <button
            key={i}
            className="questionair-button bg-gray-800 px-8 py-4 rounded-lg hover:bg-gray-700"
            onClick={() => alert(`You picked ${opt.ticker}`)}
          >
            {opt.ticker || `Option ${i + 1}`}
          </button>
        ))}
      </div>

      <button
        onClick={fetchStockOptions}
        className="mt-8 bg-green-600 px-6 py-2 rounded hover:bg-green-500"
      >
        Refresh Options
      </button>
    </div>
  );
}