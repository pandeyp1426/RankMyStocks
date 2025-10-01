import React, { useState, useEffect } from "react";

export function Questionair() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchStockOptions() {
    setLoading(true);
    try {
      const fetchOne = () =>
        fetch("http://127.0.0.1:5000/api/random-stock").then((r) => r.json());
      const [s1, s2] = await Promise.all([fetchOne(), fetchOne()]);

      setOptions([
        { ticker: s1.ticker, price: s1.price, name: s1.name },
        { ticker: s2.ticker, price: s2.price, name: s2.name },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStockOptions();
  }, []);

  const savePortfolio = (chosenStock) => {
    const portfolioName = prompt("Enter a portfolio name:");
    if (!portfolioName) return;

    fetch("http://127.0.0.1:5000/api/portfolios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: portfolioName,
        stocks: [chosenStock],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        alert("Portfolio created! ID: " + data.portfolio_id);
      })
      .catch((err) => console.error("Error creating portfolio:", err));
  };

  return (
    <div className="text-center text-white p-6">
      <h1 className="text-4xl mb-6">Pick A Stock</h1>
      {loading && <p>Loading stock options…</p>}

      <div className="flex flex-col md:flex-row justify-center gap-6">
        {options.map((opt, i) => (
          <button
            key={i}
            className="questionair-button bg-gray-800 px-8 py-4 rounded-lg hover:bg-gray-700"
            onClick={() => savePortfolio(opt)}
          >
            {opt.name} ({opt.ticker}) – ${opt.price?.toFixed(2)}
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
