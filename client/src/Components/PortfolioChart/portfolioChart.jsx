import { useEffect, useMemo, useRef, useState } from "react";
import "./portfolioChart.css";

// Navigable SVG line chart with smooth curve and hover tooltip
export function PortfolioChart({ lineData = [], color = "#00c27a", onCursorChange }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null); // { x, y, idx }

  const parsed = useMemo(() => {
    return Array.isArray(lineData)
      ? lineData
          .filter((d) => d && d.x != null && d.y != null)
          .map((d) => ({ x: new Date(d.x), y: Number(d.y) || 0 }))
      : [];
  }, [lineData]);

  // Dimensions via viewBox; scales adjust accordingly
  const width = 1000;
  const height = 400;
  const padding = { top: 20, right: 16, bottom: 30, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xMin = parsed[0]?.x ?? new Date();
  const xMax = parsed[parsed.length - 1]?.x ?? new Date();
  const yVals = parsed.map((d) => d.y);
  const rawMin = yVals.length ? Math.min(...yVals) : 0;
  const rawMax = yVals.length ? Math.max(...yVals) : 1;
  const pad = (rawMax - rawMin) * 0.07; // 7% padding top/bottom
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;

  function xScale(x) {
    const a = xMin.getTime();
    const b = xMax.getTime();
    const t = (x.getTime() - a) / (b - a || 1);
    return padding.left + t * innerW;
  }
  function yScale(y) {
    const t = (y - yMin) / ((yMax - yMin) || 1);
    return padding.top + innerH - t * innerH;
  }

  // Smooth path (Catmull–Rom to Bezier)
  const points = useMemo(
    () => parsed.map((d) => [xScale(d.x), yScale(d.y)]),
    [parsed]
  );

  function toSmoothPath(pts) {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
    const p = pts.map(([x, y]) => [x, y]);
    p.unshift(p[0]);
    p.push(p[p.length - 1]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < p.length - 2; i++) {
      const [p0x, p0y] = p[i - 1];
      const [p1x, p1y] = p[i];
      const [p2x, p2y] = p[i + 1];
      const [p3x, p3y] = p[i + 2];
      const cp1x = p1x + (p2x - p0x) / 6;
      const cp1y = p1y + (p2y - p0y) / 6;
      const cp2x = p2x - (p3x - p1x) / 6;
      const cp2y = p2y - (p3y - p1y) / 6;
      d += ` C${cp1x},${cp1y},${cp2x},${cp2y},${p2x},${p2y}`;
    }
    return d;
  }

  const path = useMemo(() => toSmoothPath(points), [points]);
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const top = path;
    const [firstX] = points[0];
    const [lastX] = points[points.length - 1];
    const bottom = ` L${lastX},${yScale(yMin)} L${firstX},${yScale(yMin)} Z`;
    return top + bottom;
  }, [points, path, yMin]);

  // Hover helpers
  function findClosestIdx(clientX) {
    if (!svgRef.current || parsed.length === 0) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = clientX - rect.left - padding.left;
    const px = parsed.map((d) => xScale(d.x))
      .map((x) => x - padding.left);
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < px.length; i++) {
      const dist = Math.abs(px[i] - mx);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    }
    return best;
  }

  function onMouseMove(e) {
    const idx = findClosestIdx(e.clientX);
    if (idx == null) return;
    const d = parsed[idx];
    const h = { x: xScale(d.x), y: yScale(d.y), idx };
    setHover(h);
    if (onCursorChange) {
      const first = parsed[0]?.y ?? 0;
      const delta = d.y - first;
      const pct = first !== 0 ? (delta / first) * 100 : 0;
      onCursorChange({ value: d.y, delta, pct });
    }
  }

  function onLeave() {
    setHover(null);
  }

  if (!parsed.length) {
    return <div className="chart-status">No data yet</div>;
  }

  return (
    <div className="portfolio-chart-inner">
      <svg
        ref={svgRef}
        className="portfolio-chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={onMouseMove}
        onMouseLeave={onLeave}
        role="img"
        aria-label="Portfolio performance chart"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* baseline */}
        <line
          x1={padding.left}
          y1={yScale(yMin)}
          x2={padding.left + innerW}
          y2={yScale(yMin)}
          stroke="#e6e6e6"
        />

        {/* area and line */}
        <path d={areaPath} fill="url(#chartFill)" />
        <path d={path} fill="none" stroke={color} strokeWidth="3.5" />

        {/* hover elements */}
        {hover && (
          <>
            <line
              x1={hover.x}
              y1={padding.top}
              x2={hover.x}
              y2={padding.top + innerH}
              stroke="#cfefff"
              strokeDasharray="4,4"
            />
            <circle cx={hover.x} cy={hover.y} r="4" fill={color} stroke="#fff" />
          </>
        )}
      </svg>

      {/* tooltip */}
      {hover && parsed[hover.idx] && (
        <div className="chart-tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="chart-tooltip__value">
            ${parsed[hover.idx].y.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="chart-tooltip__time">{parsed[hover.idx].x.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}
