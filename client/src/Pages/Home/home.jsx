import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Popup } from "../../Components/CreatePopUp/popup.jsx";
import { PortfolioName } from "../../Components/CreatePopUp/portfolioName.jsx";
import { NumSlider } from "../../Components/CreatePopUp/numSlider.jsx";
import { useSelector } from "react-redux";
import { useAuth0 } from "@auth0/auth0-react";
import "./home.css";
import appPreview from "../../assets/img/logo.png";
import { NameCheck } from "../../Components/CreatePopUp/nameCheck.jsx"; 
import { StockSearch } from "../../Components/StockSearch/stockSearch.jsx";
import { PortfolioChart } from "../../Components/PortfolioChart/portfolioChart.jsx";

export function Home() {
  const { isAuthenticated, isLoading } = useAuth0();
  const activeUserId = useSelector((state) => state.auth.userID); // Get user ID from Redux
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
  const [intradayData, setIntradayData] = useState([]); // Store intraday data for 1D
  const [chartLoading, setChartLoading] = useState(true);

  function handleClick() {
    setButtonPopup(true);
  }

  // Fetch portfolio summary
  useEffect(() => {
    async function fetchPortfolioSummary() {
      // Wait for Auth0 to load
      if (isLoading) return;
      
      if (!isAuthenticated || !activeUserId) {
        setTotalPortfolioValue(0);
        setTotalStocks(0);
        setPortfolios([]);
        return;
      }
      
      try {
        // Fetch portfolios with userId query parameter (same as myPortfolios.jsx)
        const response = await fetch(`http://127.0.0.1:5002/api/portfolios?userId=${encodeURIComponent(activeUserId)}`);
        const userPortfolios = await response.json();

        console.log("Active user ID:", activeUserId);
        console.log("User's portfolios:", userPortfolios);

        let totalValue = 0;
        let stockCount = 0;

        userPortfolios.forEach((p) => {
          p.stocks?.forEach((s) => {
            totalValue += parseFloat(s.price || 0);
            stockCount += 1;
          });
        });

        setTotalPortfolioValue(totalValue);
        setTotalStocks(stockCount);
        setPortfolios(userPortfolios);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    }

    fetchPortfolioSummary();
  }, [isAuthenticated, isLoading, activeUserId]);

  // Aggregate candles by period (week or month)
  function aggregateCandlesByPeriod(data, periodDays) {
    if (!data || data.length === 0) return data;
    
    // If daily, return as-is
    if (periodDays === 1) {
      return data;
    }
    
    const grouped = {};
    
    data.forEach(candle => {
      const date = new Date(candle.x);
      let periodKey;
      
      if (periodDays === 7) {
        // Weekly - group by week (starting Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        periodKey = weekStart.getTime();
      } else {
        // Monthly - group by month
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
    if (!data || !data.length) {
      console.log("No data to filter");
      return [];
    }

    const now = new Date();
    let startDate;
    let aggregateDays = 1;
    let filtered = [];

    switch (timeframe) {
      case "1D":
        // For 1D with intraday data, just take the most recent 100 points
        // This ensures we always show data even if timezone is off
        filtered = data.slice(-100); // Last 100 intraday points
        console.log("1D filter - taking last 100 points from intraday data");
        console.log("Earliest point:", new Date(filtered[0]?.x));
        console.log("Latest point:", new Date(filtered[filtered.length - 1]?.x));
        return filtered;
      case "1W":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        aggregateDays = 1;
        break;
      case "1M":
        startDate = new Date();
        startDate.setMonth(now.getMonth() - 1);
        aggregateDays = 1;
        break;
      case "1Y":
        startDate = new Date();
        startDate.setFullYear(now.getFullYear() - 1);
        aggregateDays = 7;
        break;
      case "ALL":
      default:
        startDate = new Date(0);
        aggregateDays = 30;
        break;
    }

    // Filter by date range (for non-1D timeframes)
    filtered = data.filter(point => {
      const pointDate = new Date(point.x);
      return pointDate >= startDate;
    });
    
    console.log(`Filtered from ${data.length} to ${filtered.length} points for ${timeframe}`);
    
    // Aggregate if needed
    if (aggregateDays > 1) {
      filtered = aggregateCandlesByPeriod(filtered, aggregateDays);
    }
    
    return filtered;
  }

  // Fetch candle data for chart - only runs once on mount
  useEffect(() => {
    async function loadPortfolioCandles() {
      // Wait for Auth0 to load
      if (isLoading) {
        return;
      }
      
      if (!isAuthenticated || !activeUserId) {
        setChartLoading(false);
        return;
      }
      
      setChartLoading(true);
      const API_KEY = import.meta.env.VITE_ALPHA_API_KEY;
      if (!API_KEY) {
        console.error("API key not found");
        setChartLoading(false);
        return;
      }

      try {
        // Fetch portfolios with userId query parameter (same as myPortfolios.jsx)
        const res = await fetch(`http://127.0.0.1:5002/api/portfolios?userId=${encodeURIComponent(activeUserId)}`);
        const userPortfolios = await res.json();
        
        console.log("Active user ID for chart:", activeUserId);
        console.log("User portfolios for chart:", userPortfolios.length);
        
        if (!userPortfolios.length) {
          console.log("No portfolios found for current user");
          setChartLoading(false);
          return;
        }

        // Build a map of ticker -> count (how many times it appears across user's portfolios)
        // Since this is fantasy draft style, each stock = 1 unit regardless of price
        const tickerCount = {};
        userPortfolios.forEach(p => {
          p.stocks?.forEach(s => {
            const ticker = s.ticker;
            if (!tickerCount[ticker]) {
              tickerCount[ticker] = 0;
            }
            tickerCount[ticker] += 1; // Count each occurrence
          });
        });

        const uniqueTickers = Object.keys(tickerCount);
        console.log("Tickers in portfolio (fantasy draft style):", tickerCount);
        console.log("Total unique stocks:", uniqueTickers.length);
        console.log("Total stock picks:", Object.values(tickerCount).reduce((a, b) => a + b, 0));

        const stockDataMap = {}; // ticker -> array of OHLC data
        const intradayDataMap = {}; // ticker -> array of intraday data

        // Fetch both daily and intraday data
        for (const ticker of uniqueTickers) {
          try {
            // Fetch daily data for longer timeframes
            const dailyResp = await fetch(
              `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${ticker}&apikey=${API_KEY}`
            );
            const dailyJson = await dailyResp.json();
            const dailySeries = dailyJson["Time Series (Daily)"];
            
            if (dailySeries) {
              const ohlc = Object.entries(dailySeries).map(([date, values]) => ({
                x: new Date(date).getTime(),
                open: Number(values["1. open"]),
                high: Number(values["2. high"]),
                low: Number(values["3. low"]),
                close: Number(values["4. close"]),
              }));
              stockDataMap[ticker] = ohlc;
              console.log(`Fetched ${ohlc.length} daily data points for ${ticker}`);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch intraday data for 1D view
            const intradayResp = await fetch(
              `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${ticker}&interval=5min&apikey=${API_KEY}`
            );
            const intradayJson = await intradayResp.json();
            const intradaySeries = intradayJson["Time Series (5min)"];
            
            if (intradaySeries) {
              const intraday = Object.entries(intradaySeries).map(([datetime, values]) => ({
                x: new Date(datetime).getTime(),
                open: Number(values["1. open"]),
                high: Number(values["2. high"]),
                low: Number(values["3. low"]),
                close: Number(values["4. close"]),
              }));
              intradayDataMap[ticker] = intraday;
              console.log(`Fetched ${intraday.length} intraday data points for ${ticker}`);
            }

            // Another delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (err) {
            console.error(`Error fetching data for ${ticker}:`, err);
          }
        }

        if (Object.keys(stockDataMap).length === 0) {
          console.error("No stock data fetched");
          setChartLoading(false);
          return;
        }

        // Calculate total portfolio value for each timestamp (daily)
        // Sum up all stock prices (each stock counts once per pick)
        const dateMap = {};
        Object.entries(stockDataMap).forEach(([ticker, ohlcArray]) => {
          const count = tickerCount[ticker]; // How many times this stock was picked
          ohlcArray.forEach(point => {
            if (!dateMap[point.x]) {
              dateMap[point.x] = { 
                open: 0, 
                high: 0, 
                low: 0, 
                close: 0
              };
            }
            // Add the stock price for each time it was picked
            dateMap[point.x].open += point.open * count;
            dateMap[point.x].high += point.high * count;
            dateMap[point.x].low += point.low * count;
            dateMap[point.x].close += point.close * count;
          });
        });

        const merged = Object.entries(dateMap)
          .map(([ts, vals]) => ({
            x: Number(ts),
            open: vals.open,
            high: vals.high,
            low: vals.low,
            close: vals.close,
          }))
          .sort((a, b) => a.x - b.x);

        console.log("Merged daily portfolio value points:", merged.length);
        if (merged.length > 0) {
          console.log("Sample portfolio values:", {
            first: merged[0].close.toFixed(2),
            last: merged[merged.length - 1].close.toFixed(2)
          });
        }
        
        // Calculate total portfolio value for each timestamp (intraday)
        const intradayMap = {};
        Object.entries(intradayDataMap).forEach(([ticker, ohlcArray]) => {
          const count = tickerCount[ticker];
          ohlcArray.forEach(point => {
            if (!intradayMap[point.x]) {
              intradayMap[point.x] = { 
                open: 0, 
                high: 0, 
                low: 0, 
                close: 0
              };
            }
            intradayMap[point.x].open += point.open * count;
            intradayMap[point.x].high += point.high * count;
            intradayMap[point.x].low += point.low * count;
            intradayMap[point.x].close += point.close * count;
          });
        });

        const mergedIntraday = Object.entries(intradayMap)
          .map(([ts, vals]) => ({
            x: Number(ts),
            open: vals.open,
            high: vals.high,
            low: vals.low,
            close: vals.close,
          }))
          .sort((a, b) => a.x - b.x);

        console.log("Merged intraday portfolio value points:", mergedIntraday.length);
        if (mergedIntraday.length > 0) {
          console.log("Sample intraday values:", {
            first: mergedIntraday[0].close.toFixed(2),
            last: mergedIntraday[mergedIntraday.length - 1].close.toFixed(2)
          });
        }
        
        // Store both datasets
        setAllCandleData(merged);
        setIntradayData(mergedIntraday);
        
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
  }, [isAuthenticated, isLoading, activeUserId]); // Re-run when auth state or user ID changes

  // Update displayed data when timeframe changes or data loads
  useEffect(() => {
    console.log("=== Timeframe change to:", timeFrame);
    console.log("Daily data length:", allCandleData.length);
    console.log("Intraday data length:", intradayData.length);
    
    // Use intraday data for 1D, otherwise use daily data
    const dataToFilter = timeFrame === "1D" ? intradayData : allCandleData;
    
    if (dataToFilter.length === 0) {
      console.log("No candle data available yet for timeframe:", timeFrame);
      setCandleData([]);
      return;
    }

    console.log("Data to filter:", dataToFilter.slice(0, 3));
    const filteredData = filterAndAggregateByTimeframe(dataToFilter, timeFrame);
    console.log("Filtered data points:", filteredData.length);
    console.log("First few filtered:", filteredData.slice(0, 3));
    
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
    } else {
      setChartDelta(null);
      setChartPct(null);
    }
  }, [timeFrame, allCandleData, intradayData]);

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
                Login to view your portfolio chart.
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