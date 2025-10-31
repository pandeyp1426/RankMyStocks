import { Link } from "react-router-dom";
import { useState,useEffect } from "react";
import { Popup } from "../../Components/CreatePopUp/popup.jsx";
import { PortfolioName } from "../../Components/CreatePopUp/portfolioName.jsx";
import { NumSlider } from "../../Components/CreatePopUp/numSlider.jsx";
import { useSelector } from "react-redux";
import "./home.css";
import appPreview from "../../assets/img/logo.png"; // you can replace this with any preview image
import { NameCheck } from "../../Components/CreatePopUp/nameCheck.jsx"; 

export function Home() {
  const [buttonPopup, setButtonPopup] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [portfolios, setPortfolios] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [timeFrame, setTimeFrame] = useState("1D");
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated); 
  // ✅ Fetch all portfolios and calculate total
  useEffect(() => {
    async function fetchPortfolioSummary() {
      try {
        const response = await fetch("http://127.0.0.1:5002/api/portfolios");
        const data = await response.json();

        let totalValue = 0;
        let stockCount = 0;

        data.forEach((p) => {
          p.stocks.forEach((s) => {
            totalValue += parseFloat(s.price || 0);
            stockCount += 1;
          });
        });

        setTotalPortfolioValue(totalValue);
        setTotalStocks(stockCount);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    }

    fetchPortfolioSummary();
  }, []);

  function handleClick() {
    //if (isAuthenticated) {
      setButtonPopup(true);
    //} //else {
      //alert("Please log in first!");
    //}
  };

  return (
    <div className="home">
      <section className="hero-container">
        {/* LEFT SIDE */}
        <div className="hero-left">
          <h1 className="hero-title">RankMyStocks</h1>
          <h2 className="hero-subtitle">Invest Smarter, Rank Better</h2>
          <p className="hero-description">
            Build your portfolio step by step with our smart comparison system.
            Choose, rank, and analyze stocks interactively - then save your
            results and compare with others.
          </p>

          <button onClick={handleClick} className="hero-button">
            Create Portfolio
          </button>

          <Popup trigger={buttonPopup} setTrigger={setButtonPopup}>
            <h3 className="popup-title">Enter Portfolio Name</h3>
            <PortfolioName />
            <NumSlider />
            <NameCheck/>
          </Popup>
        </div>

        {/* RIGHT SIDE */}
        <div className="hero-right">
          <img
            src={appPreview}
            alt="App Preview"
            className="hero-image"
          />
          <div className="floating ball"></div>
          <div className="floating glow"></div>
        </div>
      </section>
       {/* ---------- MAIN PORTFOLIO SECTION ---------- */}
      <section className="main-portfolio">
        <div className="portfolio-card">
          <div className="portfolio-header">
            <h2>Portfolio</h2>
            <select
              className="timeframe-select"
              value={timeFrame}
              onChange={(e) => setTimeFrame(e.target.value)}
            >
              <option value="1D">1D</option>
              <option value="1W">1W</option>
              <option value="1M">1M</option>
              <option value="1Y">1Y</option>
              <option value="ALL">ALL</option>
            </select>
          </div>

          <h1 className="portfolio-value">
            ${totalPortfolioValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h1>
          <p className="portfolio-sub">
            # of Stocks: {totalStocks}
          </p>

          <div className="portfolio-chart">
            {/* Placeholder chart - replace with Recharts later */}
            <div className="chart-placeholder">Chart showing {timeFrame} data</div>
          </div>
        </div>
      </section>
    </div>
  );
}