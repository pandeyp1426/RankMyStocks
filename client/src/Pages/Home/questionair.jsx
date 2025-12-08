import { useSelector } from 'react-redux';
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import axios from "axios";
import "./questionair.css";
import { apiUrl } from "../../api";

axios.defaults.withCredentials = true;


export function Questionair() {
  //Fetching values from store and assigning them for use
  const portfolioName = useSelector((state) => state.portfolio.portfolioName);
  const questionQTY = useSelector((state) => state.questionQTY.value);
  const activeUserId = useSelector((state) => state.auth.userID);
  const { isAuthenticated, user, loginWithRedirect } = useAuth0();
  const answers = useSelector(state => state.questionnaire.answers);


  
  const [stock1, setStock1] = useState(null);
  const [stock2, setStock2] = useState(null);
  const [selectedStocks, setSelectedStocks] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const didFetchRef = useRef(false);


  // Resolve the current user id from Redux or Auth0
  const resolvedUserId = activeUserId || user?.sub || null;

  // Require a user id before allowing portfolio saves; trigger login if needed.
  function requireUserId() {
    if (resolvedUserId) return resolvedUserId;
    setError("Please log in before saving portfolios.");
    if (!isAuthenticated && loginWithRedirect) {
      loginWithRedirect();
    }
    return null;
  }
  

  async function fetchStockInfo(ticker) {
    try {
      const res = await fetch(apiUrl(`/stock-info?ticker=${encodeURIComponent(ticker)}`));
      if (!res.ok) {
        throw new Error(`Stock info lookup failed (${res.status})`);
      }
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch stock info:", err);
      return null;
    }
  }

useEffect(() => {
  async function loadInfo() {
    if (stock1 && stock1.ticker && !stock1.info) {
      const info = await fetchStockInfo(stock1.ticker);
      if (info) setStock1(prev => ({ ...prev, info }));
    }
    if (stock2 && stock2.ticker && !stock2.info) {
      const info = await fetchStockInfo(stock2.ticker);
      if (info) setStock2(prev => ({ ...prev, info }));
    }
  }

  loadInfo();
}, [stock1?.ticker, stock2?.ticker]);


  //function to send questionQTY, portfolio name, and other questionnaire answers to backend
  const sendQuestionQTY = async () => {
    try {
      const response = await axios.post(apiUrl("/init"), {
        portfolioName: portfolioName,
        questionQTY: questionQTY,
        answers: answers,
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
      const response = await axios.get(apiUrl("/next"));
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
    const response = await axios.get(apiUrl("/get-stock-data"), {
      withCredentials: true
    });
    
    const data = response.data;

    //set stock1 with data from flask session
    if(data.ticker1) {
      setStock1({
        ticker: data.ticker1,
        name: data.name1,
        price: data.price1,
        description: data.response1,
        change: data.change1,
        changePercent: data.changePercent1
      });
  }

    //set stock2 with data from flask session
    if(data.ticker2) {
      setStock2({
        ticker: data.ticker2,
        name: data.name2,
        price: data.price2,
        description: data.response2,
        change: data.change2,
        changePercent: data.changePercent2
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
      const response = await axios.post(apiUrl("/pick"), {
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
  }, []);

  // when user picks a stock
  const handlePick = async (stock) => {
    const userId = requireUserId();
    if (!userId) return;

    // stop if already completed
    if (isComplete || selectedStocks.length >= Number(questionQTY || 0)) {
      setIsComplete(true);
      return;
    }

    const newSelected = [...selectedStocks, stock];
    setSelectedStocks(newSelected);

    // If we've reached the configured number of rounds, mark complete and save once
    if (newSelected.length >= Number(questionQTY || 0)) {
      setIsComplete(true);
      setStock1(null);
      setStock2(null);
      await savePortfolio(newSelected);
      return;
    }

    try {
      await getNextPair(); //get next pair from backend
      await fetchStockData(); //fetch new stock data from backend
      await sendStockPick(stock); //sends the stock picked to the backend
    } catch (err) {
      console.error("Error getting next pair:", err);
      setError(err.message);
    }
  };

  const reroll = async () => {
    try {
      await axios.post(apiUrl("/reroll"), {
        withCredentials: true,
        reroll: true
      });
      console.log('Reroll successful');
    } catch (error) {
      console.error('Error calling reroll:', error);
    }
  };


  // reroll without picking
  const handleReroll = async () => {
    if (isComplete) return;
    await reroll();
    await getNextPair();
    await fetchStockData();
  };

  const formatChangeClass = (stock) => {
    const change = Number(stock?.change ?? stock?.changePercent);
    if (Number.isNaN(change)) return "neutral";
    return change >= 0 ? "positive" : "negative";
  };

  const formatChange = (stock) => {
    const change = Number(stock?.change);
    const pct = Number(stock?.changePercent);
    const parts = [];
    if (!Number.isNaN(change)) {
      const sign = change > 0 ? "+" : "";
      parts.push(`${sign}${change.toFixed(2)}`);
    }
    if (!Number.isNaN(pct)) {
      const signPct = pct > 0 ? "+" : "";
      parts.push(`${signPct}${pct.toFixed(2)}%`);
    }
    return parts.length ? parts.join(" | ") : "—";
  };

  // Save portfolio to backend
  const savePortfolio = async (stocksToSave = []) => {
    const userId = requireUserId();
    if (!userId) return;
    if (!Array.isArray(stocksToSave) || stocksToSave.length === 0) {
      setError("No stocks selected to save.");
      return;
    }

    const name = portfolioName || "Untitled Portfolio";
    const description = `Auto-created from ${stocksToSave.length} questionnaire picks`;
    const stocksPayload = stocksToSave.map((s) => ({
      ticker: s.ticker,
      price: s.price || 0,
      quantity: s.quantity || 1,
      transactionType: "BUY",
    }));

    try {
      const res = await fetch(apiUrl("/portfolios"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          userId,
          stocks: stocksPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        throw new Error(data?.message || data?.error || `Failed to save portfolio (${res.status})`);
      }
      console.log("Portfolio saved:", data);
    } catch (err) {
      console.error("Error saving portfolio:", err);
      setError(err.message || "Error saving portfolio");
    }
  };

  return (
  <div className="questionair-page">
    <div className="questionair-wrapper">
      {/* LEFT MAIN BOX */}
      <div className="question-box">
        <div className="questionair-header">
          <h1>{portfolioName || "Your Portfolio"}</h1>
          <p>{questionQTY} Rounds</p>
          <p>Rounds Left: {Math.max(0, Number(questionQTY || 0) - selectedStocks.length)}</p>
          <h2>Which stock would you prefer?</h2>
        </div>

        {!isComplete && (
        <div className="stock-compare-container">
              {stock1 && (
                <div
                  className="stock-card"
                  onClick={() => !isComplete && handlePick(stock1)}
                  role="button"
                  tabIndex={0}
            >
              <button className="info-icon" title={stock1.description}>ⓘ</button>
              <h3 className="stock-ticker">{stock1.ticker}</h3>
              <p className="stock-name">{stock1.name}</p>
              <p className="stock-price">${Number(stock1.price || 0).toFixed(2)}</p>
              <p className={`stock-change ${formatChangeClass(stock1)}`}>{formatChange(stock1)}</p>
            </div>
          )}

              <div className="vs-text">VS</div>

              {stock2 && (
                <div
                  className="stock-card"
                  onClick={() => !isComplete && handlePick(stock2)}
                  role="button"
                  tabIndex={0}
                >
                  <button className="info-icon" title={stock2.description}>ⓘ</button>
                  <h3 className="stock-ticker">{stock2.ticker}</h3>
                  <p className="stock-name">{stock2.name}</p>
                  <p className="stock-price">${Number(stock2.price || 0).toFixed(2)}</p>
                  <p className={`stock-change ${formatChangeClass(stock2)}`}>{formatChange(stock2)}</p>
                </div>
              )}
            </div>
        )}

        {isComplete ? (
          <div className="complete-box">
            <div className="complete-icon">✓</div>
            <h3>All rounds completed</h3>
            <p className="complete-subtitle">
              Your picks are locked in and saved under <strong>{portfolioName || "Your Portfolio"}</strong>.
            </p>
            <div className="complete-summary">
              <div>
                <span>Rounds played</span>
                <strong>{questionQTY}</strong>
              </div>
              <div>
                <span>Stocks saved</span>
                <strong>{selectedStocks.length}</strong>
              </div>
            </div>
            <Link to="/myPortfolios" className="complete-btn" style={{textDecoration:'none'}}>
              View My Portfolios
            </Link>
          </div>
        ) : (
          <button className="reroll-button" onClick={handleReroll}>
            Reroll Stocks
          </button>
        )}
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
