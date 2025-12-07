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
import { apiUrl } from "../../api";

const CHART_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const formatRelative = (ts) => {
  if (!ts) return "not updated";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
};

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
  const [chartUpdatedAt, setChartUpdatedAt] = useState(null);
  const [chartRefreshToken, setChartRefreshToken] = useState(0);
  const [latestPrices, setLatestPrices] = useState({});
  const [chartError, setChartError] = useState("");

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
        setChartUpdatedAt(null);
        setChartError("");
        return;
      }
      
      try {
        const response = await fetch(apiUrl(`/portfolios?userId=${encodeURIComponent(activeUserId)}`));
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
    if (periodDays === 1) return data;

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
          first: true,
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
  function filterAndAggregateByTimeframe(data, timeframe, isIntraday = false) {
    if (!data || !data.length) {
      return [];
    }

    const now = new Date();
    let startDate;
    let aggregateDays = 1;
    let filtered = [];

    switch (timeframe) {
      case "1D": {
        const end = now;
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        filtered = data.filter((point) => {
          const pointDate = new Date(point.x);
          return pointDate >= startDate && pointDate <= end;
        });
        return filtered.slice(-300);
      }
      case "1W": {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        aggregateDays = 1;
        break;
      }
      case "1M": {
        startDate = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
        aggregateDays = 1;
        break;
      }
      case "1Y": {
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        aggregateDays = 30;
        break;
      }
      case "ALL":
      default: {
        startDate = new Date(0);
        aggregateDays = 30;
        break;
      }
    }

    filtered = data.filter(point => new Date(point.x) >= startDate);

    if (aggregateDays > 1) {
      filtered = aggregateCandlesByPeriod(filtered, aggregateDays);
    }

    return filtered;
  }

  // Fetch candle data for chart
  useEffect(() => {
    const cacheKey = activeUserId ? `portfolioChart_${activeUserId}` : null;

    const tryLoadCache = () => {
      if (!cacheKey || typeof window === "undefined") return false;
      try {
        const raw = window.localStorage.getItem(cacheKey);
        if (!raw) return false;
        const parsedCache = JSON.parse(raw);
        if (!parsedCache?.fetchedAt || (Date.now() - parsedCache.fetchedAt) > CHART_CACHE_TTL_MS) {
          return false;
        }
        setLatestPrices(parsedCache.latestPrices || {});
        setAllCandleData(parsedCache.allCandleData || []);
        setIntradayData(parsedCache.intradayData || []);
        setChartUpdatedAt(parsedCache.fetchedAt);
        
        // Set portfolio value from cache if available
        if (parsedCache.latestValue && !isNaN(parsedCache.latestValue)) {
          setTotalPortfolioValue(parsedCache.latestValue);
        }
        
        setChartLoading(false);
        return true;
      } catch (err) {
        console.warn("Unable to read chart cache", err);
        return false;
      }
    };

    const saveCache = (payload) => {
      if (!cacheKey || typeof window === "undefined") return;
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch (err) {
        console.warn("Unable to write chart cache", err);
      }
    };

    async function fetchChartData() {
      if (isLoading) return;
      if (!isAuthenticated || !activeUserId) {
        setChartLoading(false);
        return;
      }

      setChartLoading(true);
      setChartError("");

      try {
        const ts = Date.now();
        const resp = await fetch(apiUrl(`/portfolio-chart?userId=${encodeURIComponent(activeUserId)}&skipCache=1&ts=${ts}`));
        if (!resp.ok) {
          throw new Error(`Chart request failed: ${resp.status}`);
        }
        const payload = await resp.json();
        const intraday = Array.isArray(payload.intraday) ? payload.intraday : [];
        const daily = Array.isArray(payload.daily) ? payload.daily : [];
        
        if (payload.latestValue && !Number.isNaN(payload.latestValue)) {
          setTotalPortfolioValue(payload.latestValue);
        }

        if (!intraday.length && !daily.length) {
          setChartError(payload.error || "No chart data yet. Refresh in a minute.");
        }

        setAllCandleData(daily);
        setIntradayData(intraday);
        setLineData(daily.map(point => ({ x: point.x, y: point.close })));
        const fetchedAt = Date.now();
        setChartUpdatedAt(fetchedAt);

        if (daily.length || intraday.length) {
          saveCache({
            fetchedAt,
            latestPrices: payload.latestPrices || {},
            allCandleData: daily,
            intradayData: intraday,
            latestValue: payload.latestValue || null,
          });
          
          // Update latestPrices state
          if (payload.latestPrices) {
            setLatestPrices(payload.latestPrices);
          }
        }
      } catch (err) {
        console.error("Error loading portfolio candles:", err);
        setChartError("Unable to load chart data right now.");
        // fallback to cache if available
        tryLoadCache();
      } finally {
        setChartLoading(false);
      }
    }

    // Always fetch fresh; cache is only used as a fallback
    fetchChartData();
  }, [isAuthenticated, isLoading, activeUserId, chartRefreshToken]);

  // Update displayed data when timeframe changes or data loads
  useEffect(() => {
    const dataToFilter = timeFrame === "1D" ? intradayData : allCandleData;

    if (dataToFilter.length === 0) {
      setCandleData([]);
      return;
    }

    const filteredData = filterAndAggregateByTimeframe(dataToFilter, timeFrame, timeFrame === "1D");
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

  const handleChartRefresh = () => {
    const cacheKey = activeUserId ? `portfolioChart_${activeUserId}` : null;
    if (cacheKey && typeof window !== "undefined") {
      window.localStorage.removeItem(cacheKey);
    }
    setChartLoading(true);
    setChartRefreshToken(Date.now());
  };

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
            <div className="chart-actions">
              <span className="chart-updated">Updated {formatRelative(chartUpdatedAt)}</span>
              <button
                className="chart-refresh-btn"
                onClick={handleChartRefresh}
                disabled={chartLoading}
              >
                {chartLoading ? "Refreshing..." : "Refresh data"}
              </button>
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
            ) : chartError ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#d14343', fontWeight: 600 }}>
                {chartError}
              </div>
            ) : candleData.length < 2 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                Not enough price points yet. Try Refresh in a minute.
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
