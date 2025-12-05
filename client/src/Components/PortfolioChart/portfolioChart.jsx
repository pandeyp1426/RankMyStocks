import { useEffect, useMemo, useRef, useState } from "react";
import "./portfolioChart.css";

export function PortfolioChart({
  candleData = [],
  width = 1000,
  height = 500,
  candleColorUp = "#00c27a",
  candleColorDown = "#ff4d4f",
}) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [chartType, setChartType] = useState("line"); // "candle" or "line"
  const isLight = typeof document !== "undefined" && document.body.classList.contains("theme-light");
  const gridColor = isLight ? "#d7deff" : "rgba(255, 255, 255, 0.08)";
  const axisColor = isLight ? "#cbd5e1" : "rgba(255, 255, 255, 0.16)";
  const labelColor = isLight ? "#475569" : "#c7d2fe";
  const tooltipBg = isLight ? "#ffffff" : "#0f172a";
  const tooltipText = isLight ? "#0f172a" : "#e5e7eb";

  const parsed = useMemo(() => {
    return Array.isArray(candleData)
      ? candleData
          .filter(d => d && d.x != null && d.open != null && d.high != null && d.low != null && d.close != null)
          .map(d => ({
            x: new Date(d.x),
            open: Number(d.open),
            high: Number(d.high),
            low: Number(d.low),
            close: Number(d.close),
          }))
          .sort((a, b) => a.x - b.x)
      : [];
  }, [candleData]);

  // Adjusted padding - removed left padding for y-axis
  const padding = { top: 30, right: 30, bottom: 50, left: 20 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (!parsed.length) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "#555" }}>
        No data available
      </div>
    );
  }

  const rawMin = parsed[0]?.x;
  const rawMax = parsed[parsed.length - 1]?.x;
  const isIntradayRange = rawMin && rawMax ? ((rawMax - rawMin) < 36 * 60 * 60 * 1000) : false;

  // For intraday, only show trading hours (9:30 AM - 4 PM ET)
  const plotData = useMemo(() => {
    if (!parsed.length || !isIntradayRange) return parsed;
    
    // Filter to only show data during market hours
    const tradingHoursData = parsed.filter(d => {
      const hour = d.x.getHours();
      const minute = d.x.getMinutes();
      const timeInMinutes = hour * 60 + minute;
      
      // Market hours: 9:30 AM (570 minutes) to 4:00 PM (960 minutes)
      return timeInMinutes >= 570 && timeInMinutes <= 960;
    });
    
    return tradingHoursData.length ? tradingHoursData : parsed;
  }, [parsed, isIntradayRange]);

  const yVals = plotData.flatMap(d => [d.high, d.low]);
  const yMin = Math.min(...yVals) * 0.98;
  const yMax = Math.max(...yVals) * 1.02;

  const domainMin = useMemo(() => {
    if (!parsed.length) return rawMin;
    if (!isIntradayRange) return rawMin;
    // For intraday, start at 9:30 AM
    const start = new Date(rawMin);
    start.setHours(9, 30, 0, 0);
    return start;
  }, [parsed, rawMin, isIntradayRange]);

  const domainMax = useMemo(() => {
    if (!parsed.length) return rawMax;
    if (!isIntradayRange) return rawMax;
    // For intraday, end at 4:00 PM
    const end = new Date(rawMax);
    end.setHours(16, 0, 0, 0);
    return end;
  }, [parsed, rawMax, isIntradayRange]);

  const xMin = domainMin;
  const xMax = domainMax;
  const xSpanMs = xMax - xMin;

  const xScale = (xMs) => {
    const span = Math.max(xSpanMs, 1);
    return padding.left + ((xMs - xMin.getTime()) / span) * innerW;
  };

  const yScale = y => padding.top + innerH - ((y - yMin) / (yMax - yMin)) * innerH;

  // Better candle width calculation for visibility
  const numCandles = plotData.length;
  const totalSpace = innerW * 0.98;
  const spacing = totalSpace / Math.max(numCandles, 1);
  
  // Adjust based on density - more candles = wider fill ratio
  let fillRatio;
  if (numCandles > 100) {
    fillRatio = 0.95; // Fill 95% of space for very dense data
  } else if (numCandles > 50) {
    fillRatio = 0.85; // Fill 85% for dense data
  } else {
    fillRatio = 0.6; // Original 60% for normal data
  }
  
  const candleWidth = Math.max(spacing * fillRatio, 2); // Minimum 2px

  // Line path for line chart
  const linePath = useMemo(() => {
    if (plotData.length === 0) return "";
    const points = plotData.map((d, i) => {
      const x = xScale(d.x.getTime());
      const y = yScale(d.close);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    return points;
  }, [plotData, innerW, innerH, xSpanMs]);

  // Area path for line chart (with gradient fill)
  const areaPath = useMemo(() => {
    if (plotData.length === 0) return "";
    const topPoints = plotData.map((d, i) => {
      const x = xScale(d.x.getTime());
      const y = yScale(d.close);
      return `${x} ${y}`;
    }).join(' L ');

    const bottomPoints = `L ${xScale(plotData[plotData.length - 1].x.getTime())} ${height - padding.bottom} L ${xScale(plotData[0].x.getTime())} ${height - padding.bottom} Z`;
    return `M ${topPoints} ${bottomPoints}`;
  }, [plotData, innerW, innerH, xSpanMs]);

  // Hover
  function findClosestIdx(clientX) {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    const data = chartType === "candle" ? plotData : plotData;
    data.forEach((d, i) => {
      const dist = Math.abs(xScale(d.x.getTime()) - mx);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    return best;
  }

  const onMouseMove = e => {
    const idx = findClosestIdx(e.clientX);
    if (idx == null) return;
    const data = plotData;
    const d = data[idx];
    setHover({ ...d, xPos: xScale(d.x.getTime()), idx });
  };

  const onLeave = () => setHover(null);

  return (
    <div className="portfolio-chart-shell">
      <div className="portfolio-chart-inner">
        <svg
          ref={svgRef}
          className="portfolio-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          onMouseMove={onMouseMove}
          onMouseLeave={onLeave}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = padding.top + innerH - t * innerH;
            return (
              <line 
                key={t} 
                x1={padding.left} 
                y1={y} 
                x2={padding.left + innerW} 
                y2={y} 
                stroke={gridColor}
                strokeWidth="1"
              />
            );
          })}

          {/* X-axis line */}
          <line 
            x1={padding.left} 
            y1={height - padding.bottom} 
            x2={width - padding.right} 
            y2={height - padding.bottom} 
            stroke={axisColor}
            strokeWidth="2"
          />

          {/* Chart content based on type */}
          {chartType === "candle" ? (
            // Candle chart
            <>
              {plotData.map((d, i) => {
                const x = xScale(d.x.getTime());
                const yOpen = yScale(d.open);
                const yClose = yScale(d.close);
                const yHigh = yScale(d.high);
                const yLow = yScale(d.low);
                const color = d.close >= d.open ? candleColorUp : candleColorDown;
                const top = Math.min(yOpen, yClose);
                const bottom = Math.max(yOpen, yClose);
                const bodyHeight = Math.max(bottom - top, 3); // Minimum 3px for visibility
                
                return (
                  <g key={i}>
                    <line 
                      x1={x} 
                      y1={yHigh} 
                      x2={x} 
                      y2={yLow} 
                      stroke={color} 
                      strokeWidth="2"
                    />
                    <rect 
                      x={x - candleWidth / 2} 
                      y={top} 
                      width={candleWidth} 
                      height={bodyHeight} 
                      fill={color}
                      stroke={color}
                      strokeWidth="1"
                    />
                  </g>
                );
              })}
            </>
          ) : (
            // Line chart
            <>
              <defs>
                <linearGradient id="lineGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={candleColorUp} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={candleColorUp} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path 
                d={areaPath} 
                fill="url(#lineGradient)" 
              />
              <path 
                d={linePath} 
                fill="none" 
                stroke={candleColorUp} 
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {plotData.map((d, i) => {
                const x = xScale(d.x.getTime());
                const y = yScale(d.close);
                return (
                  <circle 
                    key={i} 
                    cx={x} 
                    cy={y} 
                    r="3" 
                    fill={candleColorUp}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                );
              })}
            </>
          )}

          {/* X-axis labels (dates/times) */}
          {(() => {
            if (isIntradayRange) {
              const ticks = [];
              // Show labels from 9:30 AM to 4 PM
              const start = new Date(xMin);
              start.setHours(9, 30, 0, 0);
              const end = new Date(xMax);
              end.setHours(16, 0, 0, 0);
              
              // Create hourly ticks during trading hours
              for (let t = start.getTime(); t <= end.getTime(); t += 60 * 60 * 1000) {
                ticks.push(new Date(t));
              }
              
              return ticks.map((d, i) => (
                <text
                  key={`x-${i}`}
                  x={xScale(d.getTime())}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill={labelColor}
                  fontFamily="sans-serif"
                >
                  {d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}
                </text>
              ));
            }
            const labelInterval = Math.max(Math.ceil(plotData.length / 8), 1);
            const isLongRange = xSpanMs > 90 * 24 * 60 * 60 * 1000; // > ~3 months
            return plotData.map((d, i) => {
              if (i % labelInterval !== 0 && i !== plotData.length - 1) return null;
              const x = xScale(d.x.getTime());
              const label = isLongRange
                ? d.x.toLocaleDateString("en-US", { month: "short" })
                : d.x.toLocaleDateString("en-US", { month: "short", day: "numeric" });
              return (
                <text 
                  key={`x-${i}`} 
                  x={x} 
                  y={height - padding.bottom + 20} 
                  textAnchor="middle" 
                  fontSize="11" 
                  fill={labelColor}
                  fontFamily="sans-serif"
                >
                  {label}
                </text>
              );
            });
          })()}

          {/* Hover line */}
          {hover && (
            <>
              <line 
                x1={hover.xPos} 
                y1={padding.top} 
                x2={hover.xPos} 
                y2={height - padding.bottom} 
                stroke={axisColor}
                strokeWidth="1"
                strokeDasharray="4,4" 
              />
              {/* Hover dot for line chart */}
              {chartType === "line" && (
                <circle 
                  cx={hover.xPos} 
                  cy={yScale(hover.close)} 
                  r="5" 
                  fill={candleColorUp}
                  stroke="#fff"
                  strokeWidth="2"
                />
              )}
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div 
            className="chart-tooltip" 
            style={{ 
              left: Math.min(hover.xPos + 15, width - 150), 
              top: 12, 
              background: tooltipBg, 
              color: tooltipText,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 4, color: tooltipText }}>
              {isIntradayRange 
                ? hover.x.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                : hover.x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              }
            </div>
            {chartType === "candle" ? (
              <>
                <div style={{ color: tooltipText }}>Open: ${hover.open.toFixed(2)}</div>
                <div style={{ color: tooltipText }}>High: ${hover.high.toFixed(2)}</div>
                <div style={{ color: tooltipText }}>Low: ${hover.low.toFixed(2)}</div>
                <div style={{ color: tooltipText }}>Close: ${hover.close.toFixed(2)}</div>
              </>
            ) : (
              <div style={{ color: tooltipText }}>Price: ${hover.close.toFixed(2)}</div>
            )}
          </div>
        )}
      </div>

      {/* Chart type toggle buttons */}
      <div className="chart-toggle-group">
        <button
          onClick={() => setChartType("candle")}
          className={`chart-toggle-btn ${chartType === "candle" ? "is-active" : ""}`}
        >
          Candle Chart
        </button>
        <button
          onClick={() => setChartType("line")}
          className={`chart-toggle-btn ${chartType === "line" ? "is-active" : ""}`}
        >
          Line Chart
        </button>
      </div>
    </div>
  );
}