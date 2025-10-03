import { useSelector } from 'react-redux';
import { useState, useEffect, useRef } from "react";
import "./Questionair.css";

export function Questionair() {
  //Fetching values from store and assigning them for use
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const questionQTY = useSelector((state) => state.questionQTY.value);
  
  const [stock1, setStock1] = useState(null);
  const [stock2, setStock2] = useState(null);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const didFetchRef = useRef(false);

  const fetchTwoStocks = async () => {
    try {
      let data1, data2;

      // Fetch first stock
      do {
        data1 = await (await fetch("http://127.0.0.1:5000/api/random-stock")).json();
      } while (!data1 || !data1.ticker || !data1.price);

      // Fetch second stock, different from the first
      do {
        data2 = await (await fetch("http://127.0.0.1:5000/api/random-stock")).json();
      } while (!data2 || !data2.ticker || !data2.price || data2.ticker === data1.ticker);

      setStock1(data1);
      setStock2(data2);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (!didFetchRef.current) {
      fetchTwoStocks();
      didFetchRef.current = true;
    }
  }, []);

  const handlePick = (stock) => {
    setSelectedStocks([...selectedStocks, stock]);
    fetchTwoStocks();
  };

  const handleReroll = () => {
    fetchTwoStocks();
  };

  return (
    <div>
      <p>
      <h1>{ portfolioName }</h1>
      <h1> { questionQTY }  Total Questions </h1>
      <h1>Pick A Stock</h1>
      </p>

      <div className="button-container">
        <button
          className="questionair-button"
          onClick={() => handlePick(stock1)}
          disabled={!stock1}
        >
          {stock1 && (
            <>
              <div className="stock-name">{stock1.name}</div>
              <div className="stock-ticker">Ticker: {stock1.ticker}</div>
              <div className="stock-price">Price: ${Number(stock1.price).toFixed(2)}</div>
              <div className="stock-description">{stock1.description}</div>
            </>
          )}
        </button>

        <button
          className="questionair-button"
          onClick={() => handlePick(stock2)}
          disabled={!stock2}
        >
          {stock2 && (
            <>
              <div className="stock-name">{stock2.name}</div>
              <div className="stock-ticker">Ticker: {stock2.ticker}</div>
              <div className="stock-price">Price: ${Number(stock2.price).toFixed(2)}</div>
              <div className="stock-description">{stock2.description}</div>
            </>
          )}
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button className="reroll-button" onClick={handleReroll}>
          Reroll Stocks
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
