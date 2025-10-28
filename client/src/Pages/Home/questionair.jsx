import { useSelector } from 'react-redux';
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./Questionair.css";

axios.defaults.withCredentials = true;


export function Questionair() {
  //Fetching values from store and assigning them for use
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const questionQTY = useSelector((state) => state.questionQTY.value);
  
  const [stock1, setStock1] = useState(null);
  const [stock2, setStock2] = useState(null);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const didFetchRef = useRef(false);

   // 👇 API URL comes from .env (client/.env)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";
  
  // fetch two unique random stocks
  const fetchTwoStocks = async () => {
    try {
      let data1, data2;

      do {
        data1 = await (await fetch(`${API_URL}/api/random-stock`)).json();
      } while (!data1 || !data1.ticker || data1.ticker === "Symbol");


      do {
        data2 = await (await fetch(`${API_URL}/api/random-stock`)).json();
      } while (!data2 || !data2.ticker || data2.ticker === data1.ticker || data2.ticker === "Symbol");

      
      console.log("Fetched stock1:", data1);
      console.log("Fetched stock2:", data2);
      
      setStock1(data1);
      setStock2(data2);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  async function fetchStockInfo(ticker) {
  const res = await fetch(`${API_URL}/get-stock-info?ticker=${ticker}`);
  const data = await res.json();
  return data.info;
}

useEffect(() => {
  async function loadInfo() {
    if (stock1 && stock1.ticker && !stock1.info) {
      const info = await fetchStockInfo(stock1.ticker);
      setStock1(prev => ({ ...prev, info }));
    }
    if (stock2 && stock2.ticker && !stock2.info) {
      const info = await fetchStockInfo(stock2.ticker);
      setStock2(prev => ({ ...prev, info }));
    }
  }

  loadInfo();
}, [stock1?.ticker, stock2?.ticker]);


  //function to send questionQTY and portfolio name to backend
  const sendQuestionQTY = async () => {
    try {
      const response = await axios.post(`${API_URL}/init`, {
        portfolioName: portfolioName,
        questionQTY: questionQTY
    },
    {
      withCredentials: true
    }
  );

    console.log("Successfully sent questionQTY:", response.data);
    return response.data;
  } catch (err) {
    console.error("Error sending questionQTY:", err);
  }
  };

  //function to get next pair from backend
  const getNextPair = async () => {
    try {
      const response = await axios.get(`${API_URL}/next`);
      return response.data;

    } catch (error) {
      if (error.response) {
        //server responsds with error status
        throw new Error(error.response.data.message || 'Failed to get next pair');
      } else if (error.request) {
        //request made but no response recived
        throw new Error('No response from server');
      } else {
        //somthing else happened
        throw new Error(error.message)
      }
    }
  };

 //function to get stock pair data from backend to display to users
const fetchStockData = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await axios.get(`${API_URL}/api/get-stock-data`, {
      withCredentials: true
    });
    
    const data = response.data;

    //set stock1 with data from flask session
    if(data.ticker1) {
      setStock1({
        ticker: data.ticker1,
        name: data.name1,
        price: data.price1,
        description: data.response1
      })
  }

    //set stock2 with data from flask session
    if(data.ticker2) {
      setStock2({
        ticker: data.ticker2,
        name: data.name2,
        price: data.price2,
        description: data.response2
      });
  }

  console.log("Fetched stock data:", data);

} catch (err) {
    console.error("Error fetching stock data from session:", err);
    setError(err.response?.data?.error || err.message);
} finally {
    setLoading(false);
  }
};


const sendStockPick = async (stock) => {
    try {
      const response = await axios.post(`${API_URL}/pick`, {
        stockPick: stock
    },
    {
      withCredentials: true
    }
  );

    console.log("Successfully sent stocPick:", response.data);
    return response.data;
  } catch (err) {
    console.error("Error sending stockPick:", err);
  }
  };


  // only run once on mount
  useEffect(() => {
    if (!didFetchRef.current) {
      sendQuestionQTY()
        .then(() => getNextPair())
        .then(() => fetchStockData())

      //fetchTwoStocks();
      didFetchRef.current = true;
    }
  }, [API_URL]);

  // when user picks a stock
  const handlePick = async (stock) => {
    setSelectedStocks([...selectedStocks, stock]);
    savePortfolio(stock); //save to backend

    try {
      await getNextPair(); //get next pair from backend
      await fetchStockData(); //fetch new stock data from backend
      await sendStockPick(stock); //sends the stock picked to the backend


    } catch (err) {
      console.error("Error getting next pair:", err);
      setError(err.message);
      //await fetchTwoStocks(); //fallback to 
    }


    //fetchTwoStocks(); // refresh new options
    //getNextPair(); //this will move to the next pair once user picks a stock
    //getNextPair //this will get the next pairs data from backend
    //pick(); //this will pick the stock and save it to the portfolio
  };

  // reroll without picking
  const handleReroll = () => {
    //fetchTwoStocks();
  };

  // Save portfolio to backend
  const savePortfolio = (chosenStock) => {
    const name = portfolioName || "Untitled Portfolio";

    fetch(`${API_URL}/api/portfolios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        stocks: [
          {
            ...chosenStock,
            price: chosenStock.price || 0,
          },
        ],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Portfolio saved:", data);
        alert(`Saved ${chosenStock.ticker} to portfolio: ${name}`);
      })
      .catch((err) => console.error("Error saving portfolio:", err));
  };

  return (
  <div className="questionair-page">
    <div className="questionair-wrapper">
      {/* LEFT MAIN BOX */}
      <div className="question-box">
        <div className="questionair-header">
          <h1>{portfolioName || "Your Portfolio"}</h1>
          <p>{questionQTY} Rounds</p>
          <h2>Which stock would you prefer?</h2>
        </div>

        <div className="stock-compare-container">
          {stock1 && (
            <div
              className="stock-card"
              onClick={() => handlePick(stock1)}
              role="button"
              tabIndex={0}
            >
              <button className="info-icon" title={stock1.description}>ⓘ</button>
              <h3 className="stock-ticker">{stock1.ticker}</h3>
              <p className="stock-name">{stock1.name}</p>
              <p className="stock-price">${Number(stock1.price).toFixed(2)}</p>
              <p className="stock-change positive">+2.34 (+1.35%)</p>
            </div>
          )}

          <div className="vs-text">VS</div>

          {stock2 && (
            <div
              className="stock-card"
              onClick={() => handlePick(stock2)}
              role="button"
              tabIndex={0}
            >
              <button className="info-icon" title={stock2.description}>ⓘ</button>
              <h3 className="stock-ticker">{stock2.ticker}</h3>
              <p className="stock-name">{stock2.name}</p>
              <p className="stock-price">${Number(stock2.price).toFixed(2)}</p>
              <p className="stock-change negative">-1.23 (-1.23%)</p>
            </div>
          )}
        </div>

        <button className="reroll-button" onClick={handleReroll}>
          Reroll Stocks
        </button>
      </div>

      {/* RIGHT PORTFOLIO BOX */}
      <div className="portfolio-box">
        <h2>💼 My Portfolio</h2>
        <div className="portfolio-info">
          <p>
            Total Stocks: <span>{selectedStocks.length}</span>
          </p>
          <p>
            Portfolio Value:{" "}
            <span>
              $
              {selectedStocks
                .reduce((sum, s) => sum + Number(s.price || 0), 0)
                .toFixed(2)}
            </span>
          </p>
          <p>
            Selections Made: <span>{selectedStocks.length}</span>
          </p>
        </div>

        <ul className="portfolio-list">
          {selectedStocks.map((s, i) => (
            <li key={i}>
              <div>
                <strong>{s.ticker}</strong>
                
              </div>
              <span className="portfolio-price">${Number(s.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

}
