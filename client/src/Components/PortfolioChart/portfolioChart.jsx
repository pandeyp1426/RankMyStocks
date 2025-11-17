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
  const [chartType, setChartType] = useState("candle"); // "candle" or "line"

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

  const yVals = parsed.flatMap(d => [d.high, d.low]);
  const yMin = Math.min(...yVals) * 0.98;
  const yMax = Math.max(...yVals) * 1.02;

  const xMin = parsed[0].x;
  const xMax = parsed[parsed.length - 1].x;

  // Improved x-scale with proper spacing from edges
  const xScale = (x, index) => {
    const totalCandles = parsed.length;
    const spacing = innerW / (totalCandles + 1);
    return padding.left + spacing * (index + 1);
  };

  const yScale = y => padding.top + innerH - ((y - yMin) / (yMax - yMin)) * innerH;

  // Better candle width calculation
  const spacing = innerW / (parsed.length + 1);
  const candleWidth = Math.min(Math.max(spacing * 0.6, 2), 20);

  // Line path for line chart
  const linePath = useMemo(() => {
    if (parsed.length === 0) return "";
    const points = parsed.map((d, i) => {
      const x = xScale(d.x, i);
      const y = yScale(d.close);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    return points;
  }, [parsed, innerW, innerH]);

  // Area path for line chart (with gradient fill)
  const areaPath = useMemo(() => {
    if (parsed.length === 0) return "";
    const topPoints = parsed.map((d, i) => {
      const x = xScale(d.x, i);
      const y = yScale(d.close);
      return `${x} ${y}`;
    }).join(' L ');
    
    const bottomPoints = `L ${xScale(parsed[parsed.length - 1].x, parsed.length - 1)} ${height - padding.bottom} L ${xScale(parsed[0].x, 0)} ${height - padding.bottom} Z`;
    return `M ${topPoints} ${bottomPoints}`;
  }, [parsed, innerW, innerH]);

  // Hover
  function findClosestIdx(clientX) {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    parsed.forEach((d, i) => {
      const dist = Math.abs(xScale(d.x, i) - mx);
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
    const d = parsed[idx];
    setHover({ ...d, xPos: xScale(d.x, idx), idx });
  };

  const onLeave = () => setHover(null);

  return (
    <div className="portfolio-chart-wrapper" style={{ position: "relative", width: "100%", height: "100%" }}>
      <div className="portfolio-chart-inner" style={{ position: "relative", width: "100%", height: "450px" }}>
        <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }} onMouseMove={onMouseMove} onMouseLeave={onLeave}>
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
                stroke="#f0f0f0" 
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
            stroke="#ddd" 
            strokeWidth="2"
          />

          {/* Chart content based on type */}
          {chartType === "candle" ? (
            // Candle chart
            <>
              {parsed.map((d, i) => {
                const x = xScale(d.x, i);
                const yOpen = yScale(d.open);
                const yClose = yScale(d.close);
                const yHigh = yScale(d.high);
                const yLow = yScale(d.low);
                const color = d.close >= d.open ? candleColorUp : candleColorDown;
                const top = Math.min(yOpen, yClose);
                const bottom = Math.max(yOpen, yClose);
                const bodyHeight = Math.max(bottom - top, 1);
                
                return (
                  <g key={i}>
                    <line 
                      x1={x} 
                      y1={yHigh} 
                      x2={x} 
                      y2={yLow} 
                      stroke={color} 
                      strokeWidth="1.5"
                    />
                    <rect 
                      x={x - candleWidth / 2} 
                      y={top} 
                      width={candleWidth} 
                      height={bodyHeight} 
                      fill={color}
                      stroke={color}
                      strokeWidth="0.5"
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
              {parsed.map((d, i) => {
                const x = xScale(d.x, i);
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

          {/* X-axis labels (dates) */}
          {parsed.map((d, i) => {
            const labelInterval = Math.max(Math.ceil(parsed.length / 8), 1);
            if (i % labelInterval !== 0 && i !== parsed.length - 1) return null;
            const x = xScale(d.x, i);
            return (
              <text 
                key={`x-${i}`} 
                x={x} 
                y={height - padding.bottom + 20} 
                textAnchor="middle" 
                fontSize="11" 
                fill="#666"
                fontFamily="sans-serif"
              >
                {d.x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            );
          })}

          {/* Hover line */}
          {hover && (
            <>
              <line 
                x1={hover.xPos} 
                y1={padding.top} 
                x2={hover.xPos} 
                y2={height - padding.bottom} 
                stroke="#999" 
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
              position: "absolute", 
              left: Math.min(hover.xPos + 15, width - 150), 
              top: 10, 
              background: "rgba(255, 255, 255, 0.95)", 
              border: "1px solid #ccc", 
              borderRadius: 8, 
              padding: "8px 12px", 
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              fontFamily: "sans-serif",
              pointerEvents: "none",
              zIndex: 10
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 4, color: "#333" }}>
              {hover.x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {chartType === "candle" ? (
              <>
                <div style={{ color: "#555" }}>Open: ${hover.open.toFixed(2)}</div>
                <div style={{ color: "#555" }}>High: ${hover.high.toFixed(2)}</div>
                <div style={{ color: "#555" }}>Low: ${hover.low.toFixed(2)}</div>
                <div style={{ color: "#555" }}>Close: ${hover.close.toFixed(2)}</div>
              </>
            ) : (
              <div style={{ color: "#555" }}>Price: ${hover.close.toFixed(2)}</div>
            )}
          </div>
        )}
      </div>

      {/* Chart type toggle buttons */}
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        gap: "8px", 
        marginTop: "16px",
        paddingBottom: "8px"
      }}>
        <button
          onClick={() => setChartType("candle")}
          style={{
            padding: "8px 20px",
            border: chartType === "candle" ? "2px solid #00c27a" : "2px solid #ddd",
            borderRadius: "6px",
            background: chartType === "candle" ? "#00c27a" : "#fff",
            color: chartType === "candle" ? "#fff" : "#666",
            fontWeight: chartType === "candle" ? "600" : "400",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "sans-serif"
          }}
          onMouseEnter={(e) => {
            if (chartType !== "candle") {
              e.target.style.borderColor = "#00c27a";
              e.target.style.color = "#00c27a";
            }
          }}
          onMouseLeave={(e) => {
            if (chartType !== "candle") {
              e.target.style.borderColor = "#ddd";
              e.target.style.color = "#666";
            }
          }}
        >
          Candle Chart
        </button>
        <button
          onClick={() => setChartType("line")}
          style={{
            padding: "8px 20px",
            border: chartType === "line" ? "2px solid #00c27a" : "2px solid #ddd",
            borderRadius: "6px",
            background: chartType === "line" ? "#00c27a" : "#fff",
            color: chartType === "line" ? "#fff" : "#666",
            fontWeight: chartType === "line" ? "600" : "400",
            fontSize: "13px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "sans-serif"
          }}
          onMouseEnter={(e) => {
            if (chartType !== "line") {
              e.target.style.borderColor = "#00c27a";
              e.target.style.color = "#00c27a";
            }
          }}
          onMouseLeave={(e) => {
            if (chartType !== "line") {
              e.target.style.borderColor = "#ddd";
              e.target.style.color = "#666";
            }
          }}
        >
          Line Chart
        </button>
      </div>
    </div>
  );
}