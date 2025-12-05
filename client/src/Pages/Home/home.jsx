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
  const activeUserId = useSelector((state) => state.auth.userID);
  const [buttonPopup, setButtonPopup] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  const [portfolios, setPortfolios] = useState([]);
  const [totalStocks, setTotalStocks] = useState(0);
  const [timeFrame, setTimeFrame] = useState("1D");
  const [chartDelta, setChartDelta] = useState(null);
  const [chartPct, setChartPct] = useState(null);
  const [lineData, setLineData] = useState([]);
  const [candleData, setCandleData] = useState([]);
  const [allCandleData, setAllCandleData] = useState([]);
  const [intradayData, setIntradayData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [latestPrices, setLatestPrices] = useState({}); // Store latest price for each stock

  function handleClick() {
    setButtonPopup(true);
  }

  // Fetch portfolio summary
  useEffect(() => {
    async function fetchPortfolioSummary() {
      if (isLoading) return;
      
      if (!isAuthenticated || !activeUserId) {
        setTotalPortfolioValue(0);
        setTotalStocks(0);
        setPortfolios([]);
        return;
      }
      
      try {
        const response = await fetch(`http://127.0.0.1:5002/api/portfolios?userId=${encodeURIComponent(activeUserId)}`);
        const userPortfolios = await response.json();

        console.log("Active user ID:", activeUserId);
        console.log("User's portfolios:", userPortfolios);

        // Build ticker count map
        const tickerCount = {};
        userPortfolios.forEach((p) => {
          p.stocks?.forEach((s) => {
            const ticker = s.ticker;
            if (!tickerCount[ticker]) {
              tickerCount[ticker] = 0;
            }
            tickerCount[ticker] += 1;
          });
        });

        let stockCount = Object.values(tickerCount).reduce((a, b) => a + b, 0);

        // Calculate total value using latest prices from latestPrices state
        let totalValue = 0;
        Object.entries(tickerCount).forEach(([ticker, count]) => {
          const currentPrice = latestPrices[ticker] || 0;
          totalValue += currentPrice * count;
        });

        // If latestPrices is empty (still loading), use portfolio prices as fallback
        if (Object.keys(latestPrices).length === 0) {
          totalValue = 0;
          userPortfolios.forEach((p) => {
            p.stocks?.forEach((s) => {
              totalValue += parseFloat(s.price || 0);
            });
          });
        }

        setTotalPortfolioValue(totalValue);
        setTotalStocks(stockCount);
        setPortfolios(userPortfolios);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    }

    fetchPortfolioSummary();
  }, [isAuthenticated, isLoading, activeUserId, latestPrices]);

  // Aggregate candles by period (week or month)
  function aggregateCandlesByPeriod(data, periodDays) {
    if (!data || data.length === 0) return data;
    
    if (periodDays === 1) {
      return data;
    }
    
    const grouped = {};
    
    data.forEach(candle => {
      const date = new Date(candle.x);
      let periodKey;
      
      if (periodDays === 7) {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        periodKey = weekStart.getTime();
      } else {
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
        grouped[periodKey].high = Math.max(grouped[periodKey].high, candle.high);
        grouped[periodKey].low = Math.min(grouped[periodKey].low, candle.low);
        grouped[periodKey].close = candle.close;
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
        filtered = data.slice(-30);
        console.log("1D filter - taking last 30 points from intraday data");
        if (filtered.length > 0) {
          console.log("Earliest point:", new Date(filtered[0]?.x));
          console.log("Latest point:", new Date(filtered[filtered.length - 1]?.x));
        }
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

    filtered = data.filter(point => {
      const pointDate = new Date(point.x);
      return pointDate >= startDate;
    });
    
    console.log(`Filtered from ${data.length} to ${filtered.length} points for ${timeframe}`);
    
    if (aggregateDays > 1) {
      filtered = aggregateCandlesByPeriod(filtered, aggregateDays);
    }
    
    return filtered;
  }

  // Fetch candle data for chart - only runs once on mount
  useEffect(() => {
    async function loadPortfolioCandles() {
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
        const res = await fetch(`http://127.0.0.1:5002/api/portfolios?userId=${encodeURIComponent(activeUserId)}`);
        const userPortfolios = await res.json();
        
        console.log("Active user ID for chart:", activeUserId);
        console.log("User portfolios for chart:", userPortfolios.length);
        
        if (!userPortfolios.length) {
          console.log("No portfolios found for current user");
          setChartLoading(false);
          return;
        }

        const tickerCount = {};
        userPortfolios.forEach(p => {
          p.stocks?.forEach(s => {
            const ticker = s.ticker;
            if (!tickerCount[ticker]) {
              tickerCount[ticker] = 0;
            }
            tickerCount[ticker] += 1;
          });
        });

        const uniqueTickers = Object.keys(tickerCount);
        console.log("Tickers in portfolio (fantasy draft style):", tickerCount);
        console.log("Total unique stocks:", uniqueTickers.length);
        console.log("Total stock picks:", Object.values(tickerCount).reduce((a, b) => a + b, 0));

        const stockDataMap = {};
        const intradayDataMap = {};
        const latestPriceMap = {}; // Track latest price for each stock

        // First, get latest prices from your portfolio data (as fallback)
        userPortfolios.forEach(p => {
          p.stocks?.forEach(s => {
            if (s.ticker && s.price) {
              latestPriceMap[s.ticker] = parseFloat(s.price);
            }
          });
        });
        
        console.log("Initial prices from portfolio:", latestPriceMap);

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
              
              // Store the most recent close price (update if more recent than portfolio data)
              if (ohlc.length > 0) {
                const sortedOhlc = [...ohlc].sort((a, b) => b.x - a.x);
                latestPriceMap[ticker] = sortedOhlc[0].close;
              }
              
              console.log(`Fetched ${ohlc.length} daily data points for ${ticker}, latest: ${latestPriceMap[ticker]?.toFixed(2)}`);
            } else {
              console.warn(`No daily data for ${ticker}, using portfolio price: ${latestPriceMap[ticker]?.toFixed(2)}`);
              // Create a synthetic data point using portfolio price if no API data
              if (latestPriceMap[ticker]) {
                const now = Date.now();
                stockDataMap[ticker] = [{
                  x: now,
                  open: latestPriceMap[ticker],
                  high: latestPriceMap[ticker],
                  low: latestPriceMap[ticker],
                  close: latestPriceMap[ticker],
                }];
              }
            }

            await new Promise(resolve => setTimeout(resolve, 1));

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
              
              // Update latest price if intraday has more recent data
              if (intraday.length > 0) {
                const sortedIntraday = [...intraday].sort((a, b) => b.x - a.x);
                latestPriceMap[ticker] = sortedIntraday[0].close;
              }
              
              console.log(`Fetched ${intraday.length} intraday data points for ${ticker}`);
            } else {
              console.warn(`No intraday data for ${ticker}`);
              // Create synthetic intraday point using latest price
              if (latestPriceMap[ticker]) {
                const now = Date.now();
                intradayDataMap[ticker] = [{
                  x: now,
                  open: latestPriceMap[ticker],
                  high: latestPriceMap[ticker],
                  low: latestPriceMap[ticker],
                  close: latestPriceMap[ticker],
                }];
              }
            }

            await new Promise(resolve => setTimeout(resolve, 1));

          } catch (err) {
            console.error(`Error fetching data for ${ticker}:`, err);
            // Even on error, ensure we have a fallback price
            if (!latestPriceMap[ticker]) {
              console.error(`No price available for ${ticker} - this stock will be excluded from charts`);
            }
          }
        }

        // Store latest prices
        setLatestPrices(latestPriceMap);
        console.log("Latest prices:", latestPriceMap);

        if (Object.keys(stockDataMap).length === 0) {
          console.error("No stock data fetched");
          setChartLoading(false);
          return;
        }

        // Calculate total portfolio value for each timestamp (daily)
        // Get all unique timestamps first
        const allDailyTimestamps = new Set();
        Object.values(stockDataMap).forEach(ohlcArray => {
          ohlcArray.forEach(point => allDailyTimestamps.add(point.x));
        });

        const sortedDailyTimestamps = Array.from(allDailyTimestamps).sort((a, b) => a - b);
        
        // For each timestamp, calculate portfolio value using latest available price
        const dateMap = {};
        const lastKnownDailyPrice = {}; // Track last known price for each stock
        
        sortedDailyTimestamps.forEach(timestamp => {
          dateMap[timestamp] = { open: 0, high: 0, low: 0, close: 0 };
          
          Object.entries(tickerCount).forEach(([ticker, count]) => {
            // Find the data point for this stock at this timestamp
            const stockData = stockDataMap[ticker];
            const dataPoint = stockData?.find(p => p.x === timestamp);
            
            if (dataPoint) {
              // Stock traded at this time, use actual values
              lastKnownDailyPrice[ticker] = dataPoint.close;
              dateMap[timestamp].open += dataPoint.open * count;
              dateMap[timestamp].high += dataPoint.high * count;
              dateMap[timestamp].low += dataPoint.low * count;
              dateMap[timestamp].close += dataPoint.close * count;
            } else {
              // Stock didn't trade, use last known price or latest price
              const priceToUse = lastKnownDailyPrice[ticker] || latestPriceMap[ticker] || 0;
              dateMap[timestamp].open += priceToUse * count;
              dateMap[timestamp].high += priceToUse * count;
              dateMap[timestamp].low += priceToUse * count;
              dateMap[timestamp].close += priceToUse * count;
            }
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
        // Get all unique timestamps first
        const allTimestamps = new Set();
        Object.values(intradayDataMap).forEach(ohlcArray => {
          ohlcArray.forEach(point => allTimestamps.add(point.x));
        });

        const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);
        
        // For each timestamp, calculate portfolio value using latest available price
        const intradayMap = {};
        const lastKnownPrice = {}; // Track last known price for each stock
        
        sortedTimestamps.forEach(timestamp => {
          intradayMap[timestamp] = { open: 0, high: 0, low: 0, close: 0 };
          
          Object.entries(tickerCount).forEach(([ticker, count]) => {
            // Find the data point for this stock at this timestamp
            const stockData = intradayDataMap[ticker];
            const dataPoint = stockData?.find(p => p.x === timestamp);
            
            if (dataPoint) {
              // Stock traded at this time, use actual values
              lastKnownPrice[ticker] = dataPoint.close;
              intradayMap[timestamp].open += dataPoint.open * count;
              intradayMap[timestamp].high += dataPoint.high * count;
              intradayMap[timestamp].low += dataPoint.low * count;
              intradayMap[timestamp].close += dataPoint.close * count;
            } else {
              // Stock didn't trade, use last known price or latest price
              const priceToUse = lastKnownPrice[ticker] || latestPriceMap[ticker] || 0;
              intradayMap[timestamp].open += priceToUse * count;
              intradayMap[timestamp].high += priceToUse * count;
              intradayMap[timestamp].low += priceToUse * count;
              intradayMap[timestamp].close += priceToUse * count;
            }
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
        
        const lineSeries = merged.map(point => ({ x: point.x, y: point.close }));
        setLineData(lineSeries);

      } catch (err) {
        console.error("Error loading portfolio candles:", err);
      } finally {
        setChartLoading(false);
      }
    }

    loadPortfolioCandles();
  }, [isAuthenticated, isLoading, activeUserId]);

  // Update displayed data when timeframe changes or data loads
  useEffect(() => {
    console.log("=== Timeframe change to:", timeFrame);
    console.log("Daily data length:", allCandleData.length);
    console.log("Intraday data length:", intradayData.length);
    
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

    if (filteredData.length > 1) {
      const first = filteredData[0].open;
      const last = filteredData[filteredData.length - 1].close;
      setChartDelta(last - first);
      setChartPct(first !== 0 ? ((last - first) / first) * 100 : 0);
    } else if (filteredData.length === 1) {
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