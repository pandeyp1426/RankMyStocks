import { Link } from "react-router-dom";
import { useState,useEffect } from "react";
import { Popup } from "../../Components/CreatePopUp/popup.jsx";
import { PortfolioName } from "../../Components/CreatePopUp/portfolioName.jsx";
import { NumSlider } from "../../Components/CreatePopUp/numSlider.jsx";

import "./home.css";
import appPreview from "../../assets/img/logo.png"; // you can replace this with any preview image
import { NameCheck } from "../../Components/CreatePopUp/nameCheck.jsx"; 
import { StockSearch } from "../../Components/StockSearch/stockSearch.jsx";
import { PortfolioChart } from "../../Components/PortfolioChart/portfolioChart.jsx";

export function Home() {
  const [buttonPopup, setButtonPopup] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [portfolios, setPortfolios] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [timeFrame, setTimeFrame] = useState("1D");
  // Live chart cursor values to show under title
  const [chartDelta, setChartDelta] = useState(null);
  const [chartPct, setChartPct] = useState(null);
  const [lineData, setLineData] = useState([]);
  const [candleData, setCandleData] = useState([]);

  // ✅ Fetch all portfolios and calculate total
  useEffect(() => {
    async function fetchPortfolioSummary() {
      try {
        const response = await fetch("http://127.0.0.1:5001/api/portfolios");
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

  // Load performance series for selected range and compute header delta
  useEffect(() => {
    let active = true;
    async function loadSeries() {
      try {
        const res = await fetch(`http://127.0.0.1:5001/api/portfolio-performance?range=${encodeURIComponent(timeFrame)}`);
        const json = await res.json();
        if (!active) return;
        const series = Array.isArray(json.series) ? json.series : [];
        const ldata = series.map((d) => ({ x: d.ts, y: Number(d.value) || 0 }));
        setLineData(ldata);
        // derive simple OHLC groups (optional): computed in chart if not passed
        if (ldata.length > 0) {
          const first = ldata[0].y;
          const last = ldata[ldata.length - 1].y;
          const delta = last - first;
          const pct = first !== 0 ? (delta / first) * 100 : 0;
          setChartDelta(delta);
          setChartPct(pct);
        } else {
          setChartDelta(null);
          setChartPct(null);
        }
      } catch (e) {
        // ignore silently for now
      }
    }
    loadSeries();
    return () => {
      active = false;
    };
  }, [timeFrame]);

  function nameCheck() {}

  return (
    <div className="home">
      {/* Search bar positioned at top of Home, just under navbar via page-content spacing */}
      <StockSearch />
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

          <button
            onClick={() => setButtonPopup(true)}
            className="hero-button"
          >
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
          {chartDelta !== null && chartPct !== null && (
            <p
              className="portfolio-delta"
              style={{ color: (chartDelta ?? 0) >= 0 ? "#00c27a" : "#ff5a5a" }}
            >
              {(chartDelta >= 0 ? "+" : "") + (chartDelta || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {" "}({(chartPct || 0).toFixed(2)}%)
            </p>
          )}
          <p className="portfolio-sub">
            # of Stocks: {totalStocks}
          </p>

          <div className="portfolio-chart">
            <PortfolioChart lineData={lineData} candleData={candleData} />
          </div>
        </div>
      </section>
      {/* Search bar moved back to the top; removed duplicate here */}
    </div>
  );
}
