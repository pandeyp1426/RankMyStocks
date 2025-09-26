import { useState } from "react";
import "./App.css";

function App() {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);

  const getRandomStock = () => {
    setLoading(true);
    fetch("http://127.0.0.1:5000/api/random-stock")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        setStock(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  };

  return (
    <div className="app">
      <button onClick={getRandomStock}>Get Random Stock</button>

      {loading && <p>Loading…</p>}

      {stock && !loading && (
        <div>
          <h2>{stock.name} ({stock.ticker})</h2>
          <p>Price: ${stock.price}</p>
        </div>
      )}
    </div>
  );
}

export default App;
