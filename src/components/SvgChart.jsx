import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const PAD = { top: 12, right: 12, bottom: 26, left: 72 };

function useDimensions(ref) {
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(entries => {
      setWidth(Math.round(entries[0].contentRect.width));
    });
    obs.observe(ref.current);
    setWidth(ref.current.clientWidth || 600);
    return () => obs.disconnect();
  }, [ref]);
  return width;
}

function niceY(val, yMin, yMax, yRange, H) {
  if (yRange === 0) return H / 2;
  return H - ((val - yMin) / yRange) * H;
}

/**
 * SvgChart — fully custom SVG chart renderer
 *
 * Props:
 *  data        array of point objects
 *  height      number (SVG height in px)
 *  yDomain     [min, max] — if omitted, auto from data
 *  yFormatter  fn(value) → string for y-axis labels
 *  series      array of:
 *    { key, color, width, type: 'line'|'area'|'bar', dasharray,
 *      upColor, downColor }  (bar uses upColor/downColor)
 *  refLines    array of { value, color, dasharray, label }
 *  xKey        key for x-axis label (default 't')
 *  xLabelEvery how many points between x labels (auto if omitted)
 *  tooltip     boolean (default true)
 *  clipId      unique string for SVG clip path id
 */
export default function SvgChart({
  data = [],
  height = 200,
  yDomain: yDomainProp,
  yFormatter = v => v.toFixed(2),
  series = [],
  refLines = [],
  xKey = 't',
  tooltip = true,
  clipId = 'clip0',
  overlays = null,   // fn({ xScale, yScale, W, H }) → SVG elements (rendered inside clip group)
}) {
  const containerRef = useRef(null);
  const width = useDimensions(containerRef);
  const [hover, setHover] = useState(null);
  const { colors: COLORS } = useTheme();

  if (!data.length) {
    return <div ref={containerRef} style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.muted, fontSize: 11 }}>No data</div>;
  }

  const W = Math.max(width - PAD.left - PAD.right, 10);
  const H = Math.max(height - PAD.top - PAD.bottom, 10);

  // Y domain
  const allVals = data.flatMap(d => series.map(s => d[s.key])).filter(v => v != null && isFinite(v));
  let yMin = yDomainProp ? yDomainProp[0] : Math.min(...allVals);
  let yMax = yDomainProp ? yDomainProp[1] : Math.max(...allVals);
  if (yMin === yMax) { yMin -= 1; yMax += 1; }
  const yRange = yMax - yMin;

  const xScale = i => (data.length <= 1 ? W / 2 : (i / (data.length - 1)) * W);
  const yScale = v => niceY(v, yMin, yMax, yRange, H);

  // Y ticks (4-5 nice values)
  const numTicks = 4;
  const yTicks = Array.from({ length: numTicks + 1 }, (_, i) => yMin + (i / numTicks) * yRange);

  // X labels every N points
  const xEvery = Math.max(1, Math.floor(data.length / 6));
  const xLabelIndices = data.reduce((acc, _, i) => {
    if (i === 0 || i === data.length - 1 || i % xEvery === 0) acc.push(i);
    return acc;
  }, []);

  // Build line path (skips nulls)
  function linePath(key) {
    let d = '', started = false;
    data.forEach((pt, i) => {
      const v = pt[key];
      if (v == null || !isFinite(v)) { started = false; return; }
      const x = xScale(i), y = yScale(v);
      d += started ? ` L${x} ${y}` : `M${x} ${y}`;
      started = true;
    });
    return d;
  }

  // Build area path (filled to bottom)
  function areaPath(key) {
    const pts = [];
    data.forEach((pt, i) => {
      const v = pt[key];
      if (v == null || !isFinite(v)) return;
      pts.push([xScale(i), yScale(v)]);
    });
    if (!pts.length) return '';
    const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');
    return `${top} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z`;
  }

  // Hover detection
  const handleMouseMove = (e) => {
    if (!tooltip) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - PAD.left;
    const idx = Math.round((mouseX / W) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const hoverPt = hover !== null ? data[hover] : null;

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <svg
        width={width}
        height={height}
        style={{ display: 'block', userSelect: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0} y={0} width={W} height={H} />
          </clipPath>
          {series.filter(s => s.type === 'area').map(s => (
            <linearGradient key={s.key} id={`grad-${clipId}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={s.color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Grid + Y axis */}
          {yTicks.map((v, i) => {
            const y = yScale(v);
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={W} y2={y} stroke={COLORS.grid} strokeWidth={1} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={9} fill={COLORS.muted}>
                  {yFormatter(v)}
                </text>
              </g>
            );
          })}

          {/* Reference lines */}
          {refLines.map((rl, i) => {
            const y = yScale(rl.value);
            if (y < 0 || y > H) return null;
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={W} y2={y} stroke={rl.color} strokeWidth={1} strokeDasharray={rl.dasharray || '4 2'} />
                {rl.label && (
                  <text x={W + 4} y={y + 4} fontSize={8} fill={rl.color}>{rl.label}</text>
                )}
              </g>
            );
          })}

          {/* Clip group for series + overlays */}
          <g clipPath={`url(#${clipId})`}>
            {overlays && overlays({ xScale, yScale, W, H })}
            {series.map(s => {
              if (s.type === 'area') {
                return (
                  <g key={s.key}>
                    <path d={areaPath(s.key)} fill={`url(#grad-${clipId}-${s.key})`} />
                    <path d={linePath(s.key)} stroke={s.color} strokeWidth={s.width || 1.5} fill="none" />
                  </g>
                );
              }
              if (s.type === 'bar') {
                const barW = Math.max(1, W / data.length - 1);
                const zero = yScale(0);
                return (
                  <g key={s.key}>
                    {data.map((pt, i) => {
                      const v = pt[s.key];
                      if (v == null || !isFinite(v)) return null;
                      const x = xScale(i);
                      const top = yScale(v);
                      const barH = Math.abs(zero - top);
                      const fill = v >= 0
                        ? (s.upColor   || COLORS.bull)
                        : (s.downColor || COLORS.bear);
                      return (
                        <rect
                          key={i}
                          x={x - barW / 2}
                          y={v >= 0 ? top : zero}
                          width={barW}
                          height={Math.max(1, barH)}
                          fill={fill}
                          opacity={0.75}
                        />
                      );
                    })}
                  </g>
                );
              }
              // Default: line
              return (
                <path
                  key={s.key}
                  d={linePath(s.key)}
                  stroke={s.color}
                  strokeWidth={s.width || 1.5}
                  fill="none"
                  strokeDasharray={s.dasharray}
                />
              );
            })}
          </g>

          {/* Hover crosshair */}
          {hover !== null && (
            <g>
              <line
                x1={xScale(hover)} y1={0}
                x2={xScale(hover)} y2={H}
                stroke={COLORS.muted} strokeWidth={1} strokeDasharray="3 2"
              />
            </g>
          )}

          {/* X axis labels */}
          {xLabelIndices.map(i => (
            <text
              key={i}
              x={xScale(i)}
              y={H + 18}
              textAnchor="middle"
              fontSize={9}
              fill={COLORS.muted}
            >
              {data[i]?.[xKey]}
            </text>
          ))}

          {/* Axis borders */}
          <line x1={0} y1={0} x2={0} y2={H} stroke={COLORS.border} />
          <line x1={0} y1={H} x2={W} y2={H} stroke={COLORS.border} />
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && hoverPt && (
        <div style={{
          position:   'absolute',
          top:        8,
          left:       PAD.left + xScale(hover) + 12,
          background: COLORS.card,
          border:     `1px solid ${COLORS.border}`,
          borderRadius: 6,
          padding:    '6px 10px',
          fontSize:   10,
          color:      COLORS.text,
          pointerEvents: 'none',
          zIndex:     10,
          whiteSpace: 'nowrap',
          maxWidth:   180,
        }}>
          <div style={{ color: COLORS.muted, marginBottom: 3 }}>{hoverPt[xKey]}</div>
          {series.filter(s => s.type !== 'bar' || true).map(s => {
            const v = hoverPt[s.key];
            return v != null ? (
              <div key={s.key} style={{ color: s.color, marginBottom: 1 }}>
                {s.label || s.key}: {yFormatter(v)}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
