import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Popup } from "../../Components/CreatePopUp/popup.jsx";
import { PortfolioName } from "../../Components/CreatePopUp/portfolioName.jsx";
import { NumSlider } from "../../Components/CreatePopUp/numSlider.jsx";
import { useSelector } from "react-redux";
import "./home.css";
import appPreview from "../../assets/img/logo.png";
import { NameCheck } from "../../Components/CreatePopUp/nameCheck.jsx"; 
import { StockSearch } from "../../Components/StockSearch/stockSearch.jsx";
import { PortfolioChart } from "../../Components/PortfolioChart/portfolioChart.jsx";

export function Home() {
  const [buttonPopup, setButtonPopup] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [portfolios, setPortfolios] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [timeFrame, setTimeFrame] = useState("1D");
  const [chartDelta, setChartDelta] = useState(null);
  const [chartPct, setChartPct] = useState(null);
  const [lineData, setLineData] = useState([]);
  const [candleData, setCandleData] = useState([]);
  const [allCandleData, setAllCandleData] = useState([]); // Store all fetched data
  const [chartLoading, setChartLoading] = useState(true);

  function handleClick() {
    setButtonPopup(true);
  }

  // Fetch portfolio summary
  useEffect(() => {
    async function fetchPortfolioSummary() {
      try {
        const response = await fetch("http://127.0.0.1:5002/api/portfolios");
        const data = await response.json();

        let totalValue = 0;
        let stockCount = 0;

        data.forEach((p) => {
          p.stocks?.forEach((s) => {
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

  // Aggregate candles by period (week or month)
  function aggregateCandlesByPeriod(data, periodDays) {
    if (!data || data.length === 0) return data;
    
    const grouped = {};
    
    data.forEach(candle => {
      const date = new Date(candle.x);
      let periodKey;
      
      if (periodDays === 1) {
        // Daily - no aggregation needed
        return;
      } else if (periodDays === 7) {
        // Weekly - group by week (starting Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        periodKey = weekStart.getTime();
      } else if (periodDays === 30) {
        // Monthly - group by month
        periodKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      } else {
        // For longer periods, group by month
        periodKey = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
      }
      
      if (!grouped[periodKey]) {
        grouped[periodKey] = {
          x: periodKey,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          first: true
        };
      } else {
        // Aggregate: keep first open, highest high, lowest low, last close
        grouped[periodKey].high = Math.max(grouped[periodKey].high, candle.high);
        grouped[periodKey].low = Math.min(grouped[periodKey].low, candle.low);
        grouped[periodKey].close = candle.close; // Last close in period
      }
    });
    
    return Object.values(grouped).sort((a, b) => a.x - b.x);
  }

  // Filter and aggregate data based on selected timeframe
  function filterAndAggregateByTimeframe(data, timeframe) {
    if (!data || !data.length) return [];

    const now = new Date();
    let startDate;
    let aggregateDays = 1;

    switch (timeframe) {
      case "1D":
        startDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
        aggregateDays = 1; // Show each day (hourly would need intraday data)
        break;
      case "1W":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        aggregateDays = 1; // Show daily candles
        break;
      case "1M":
        startDate = new Date();
        startDate.setMonth(now.getMonth() - 1);
        aggregateDays = 1; // Show daily candles
        break;
      case "1Y":
        startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 1);
        aggregateDays = 7; // Show weekly candles for better visibility
        break;
      case "ALL":
      default:
        startDate = new Date(0); // Beginning of time
        aggregateDays = 30; // Show monthly candles
        break;
    }

    // Filter by date range
    const filtered = data.filter(point => new Date(point.x) >= startDate);
    
    // Aggregate if needed
    if (aggregateDays > 1) {
      return aggregateCandlesByPeriod(filtered, aggregateDays);
    }
    
    return filtered;
  }

  // Fetch candle data for chart - only runs once on mount
  useEffect(() => {
    async function loadPortfolioCandles() {
      setChartLoading(true);
      const API_KEY = import.meta.env.VITE_ALPHA_API_KEY;
      if (!API_KEY) {
        setChartLoading(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:5002/api/portfolios");
        const portfolios = await res.json();
        if (!portfolios.length) {
          setChartLoading(false);
          return;
        }

        const tickers = portfolios.flatMap(p => p.stocks?.map(s => s.ticker) || []);
        const uniqueTickers = [...new Set(tickers)];

        const allStockData = [];

        for (const ticker of uniqueTickers) {
          try {
            const resp = await fetch(
              `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${API_KEY}`
            );
            const json = await resp.json();
            const series = json["Time Series (Daily)"];
            if (!series) continue;

            const ohlc = Object.entries(series).map(([date, values]) => ({
              x: new Date(date).getTime(),
              open: Number(values["1. open"]),
              high: Number(values["2. high"]),
              low: Number(values["3. low"]),
              close: Number(values["4. close"]),
            }));

            allStockData.push(ohlc);
          } catch (err) {
            console.error(`Error fetching data for ${ticker}:`, err);
          }
        }

        // Merge all stock data by averaging across stocks for each date
        const dateMap = {};
        allStockData.forEach(stockSeries => {
          stockSeries.forEach(point => {
            if (!dateMap[point.x]) {
              dateMap[point.x] = { 
                open: 0, 
                high: 0, 
                low: 0, 
                close: 0, 
                count: 0 
              };
            }
            dateMap[point.x].open += point.open;
            dateMap[point.x].high += point.high;
            dateMap[point.x].low += point.low;
            dateMap[point.x].close += point.close;
            dateMap[point.x].count += 1;
          });
        });

        const merged = Object.entries(dateMap)
          .map(([ts, vals]) => ({
            x: Number(ts),
            open: vals.open / vals.count,
            high: vals.high / vals.count,
            low: vals.low / vals.count,
            close: vals.close / vals.count,
          }))
          .sort((a, b) => a.x - b.x);

        // Store all data for client-side filtering
        setAllCandleData(merged);
        
        // Create line series for potential use
        const lineSeries = merged.map(point => ({ x: point.x, y: point.close }));
        setLineData(lineSeries);

      } catch (err) {
        console.error("Error loading portfolio candles:", err);
      } finally {
        setChartLoading(false);
      }
    }

    loadPortfolioCandles();
  }, []); // Only load once on mount

  // Update displayed data when timeframe changes or data loads
  useEffect(() => {
    if (allCandleData.length === 0) return;

    const filteredData = filterAndAggregateByTimeframe(allCandleData, timeFrame);
    setCandleData(filteredData);

    // Calculate delta and percentage based on filtered data
    if (filteredData.length > 1) {
      const first = filteredData[0].open;
      const last = filteredData[filteredData.length - 1].close;
      setChartDelta(last - first);
      setChartPct(first !== 0 ? ((last - first) / first) * 100 : 0);
    } else if (filteredData.length === 1) {
      // Only one data point
      setChartDelta(0);
      setChartPct(0);
    }
  }, [timeFrame, allCandleData]);

  return (
    <div className="home">
      <StockSearch />
      <section className="hero-container">
        <div className="hero-left">
          <h1 className="hero-title">RankMyStocks</h1>
          <h2 className="hero-subtitle">Invest Smarter, Rank Better</h2>
          <p className="hero-description">
            Build your portfolio step by step with our smart comparison system.
            Choose, rank, and analyze stocks interactively - then save your
            results and compare with others.
          </p>
          <button onClick={handleClick} className="hero-button">Create Portfolio</button>
          <Popup trigger={buttonPopup} setTrigger={setButtonPopup}>
            <h3 className="popup-title">Enter Portfolio Name</h3>
            <PortfolioName />
            <NumSlider />
            <NameCheck/>
          </Popup>
        </div>
        <div className="hero-right">
          <img src={appPreview} alt="App Preview" className="hero-image"/>
          <div className="floating ball"></div>
          <div className="floating glow"></div>
        </div>
      </section>

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
            ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>

          {chartDelta !== null && chartPct !== null && (
            <p
              className="portfolio-delta"
              style={{ color: chartDelta >= 0 ? "#00c27a" : "#ff5a5a" }}
            >
              {(chartDelta >= 0 ? "+" : "") + chartDelta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {" "}({chartPct.toFixed(2)}%)
            </p>
          )}

          <p className="portfolio-sub"># of Stocks: {totalStocks}</p>

          <div className="portfolio-chart">
            {chartLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                Loading chart data...
              </div>
            ) : candleData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                No data available for selected timeframe
              </div>
            ) : (
              <PortfolioChart candleData={candleData} />
            )}
          </div>

        </div>
      </section>
    </div>
  );
}