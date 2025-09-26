import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [stockData, setStockData] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/stock")
      .then((res) => res.json())
      .then((data) => setStockData(data))
      .catch((err) => console.error(err));
  }, []);

  if (!stockData) return <p>Loading…</p>;

  return (
    <div>
      <h1>Random Stock</h1>
      <pre>{JSON.stringify(stockData, null, 2)}</pre>
    </div>
  );
}

export default App;
