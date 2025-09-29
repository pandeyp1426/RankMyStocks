import { useState, useEffect } from "react";
import "./questionair.css";

export function Questionair() {
  const [stock1, setStock1] = useState(null);
  const [stock2, setStock2] = useState(null);
  const [selectedStocks, setSelectedStocks] = useState([]); // store picks

  // Fetch two random stocks and ensure they are different
  const fetchTwoStocks = async () => {
    try {
      let data1 = await (await fetch("http://127.0.0.1:5000/api/random-stock")).json();
      let data2;

      // Keep fetching until we get a different stock
      do {
        data2 = await (await fetch("http://127.0.0.1:5000/api/random-stock")).json();
      } while (data2.ticker === data1.ticker);

      setStock1(data1);
      setStock2(data2);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Run once on mount
  useEffect(() => {
    fetchTwoStocks();
  }, []);

  // Handle selection
  const handlePick = (stock) => {
    setSelectedStocks([...selectedStocks, stock]); // store the pick
    fetchTwoStocks(); // refresh both stocks
  };

  return (
    <div>
      <h1>Pick A Stock</h1>

      <div className="button-container">
        <button
          className="questionair-button"
          onClick={() => handlePick(stock1)}
          disabled={!stock1}
        >
          {stock1
            ? `${stock1.name} (${stock1.ticker}) - $${Number(stock1.price).toFixed(2)}`
            : "Option 1"}
        </button>

        <button
          className="questionair-button"
          onClick={() => handlePick(stock2)}
          disabled={!stock2}
        >
          {stock2
            ? `${stock2.name} (${stock2.ticker}) - $${Number(stock2.price).toFixed(2)}`
            : "Option 2"}
        </button>
      </div>

      <div className="selection-history">
        <h2>Selected Stocks:</h2>
        <ul>
          {selectedStocks.map((s, i) => (
            <li key={i}>
              {s.name} ({s.ticker}) - ${Number(s.price).toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
