import { useState } from "react";
import "./App.css";

function App() {
  const [stock1, setStock1] = useState(null);
  const [stock2, setStock2] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const fetchRandom = (setter, setLoading) => {
    setLoading(true);
    fetch("http://127.0.0.1:5000/api/random-stock")
      .then(res => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then(data => {
        setter(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  };

  return (
    <div>
      <div>
        <button onClick={() => fetchRandom(setStock1, setLoading1)}>
          Random Stock 1
        </button>
        {loading1 && <p>Loading…</p>}
        {stock1 && !loading1 && (
          <p>{stock1.name} ({stock1.ticker}): ${Number(stock1.price).toFixed(2)}</p>
        )}
      </div>

      <div>
        <button onClick={() => fetchRandom(setStock2, setLoading2)}>
          Random Stock 2
        </button>
        {loading2 && <p>Loading…</p>}
        {stock2 && !loading2 && (
          <p>{stock2.name} ({stock2.ticker}): ${Number(stock2.price).toFixed(2)}</p>
        )}
      </div>
    </div>
  );
}

export default App;
