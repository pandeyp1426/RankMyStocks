import { useState } from "react";
import "./questionair.css";

export function Questionair() {
  const [stock1, setStock1] = useState(null);
  const [stock2, setStock2] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);

  const getRandomStock1 = () => {
    setLoading1(true);
    fetch("http://127.0.0.1:5000/api/random-stock")
      .then((res) => res.json())
      .then((data) => {
        setStock1(data);
        setLoading1(false);
      })
      .catch(() => setLoading1(false));
  };

  const getRandomStock2 = () => {
    setLoading2(true);
    fetch("http://127.0.0.1:5000/api/random-stock")
      .then((res) => res.json())
      .then((data) => {
        setStock2(data);
        setLoading2(false);
      })
      .catch(() => setLoading2(false));
  };

  return (
    <>
      <h1>Pick A Stock</h1>
      <div className="button-container">
        <button className="questionair-button" onClick={getRandomStock1}>
          {stock1
            ? `${stock1.name} (${stock1.ticker}) - $${Number(stock1.price).toFixed(
                2
              )}`
            : "Option 1"}
        </button>

        <button className="questionair-button" onClick={getRandomStock2}>
          {stock2
            ? `${stock2.name} (${stock2.ticker}) - $${Number(stock2.price).toFixed(
                2
              )}`
            : "Option 2"}
        </button>
      </div>

      <div>
        {loading1 && <p>Loading Option 1…</p>}
        {loading2 && <p>Loading Option 2…</p>}
      </div>
    </>
  );
}
