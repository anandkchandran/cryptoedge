import React, { useState } from 'react';
import SvgChart from './SvgChart';
import { useTheme } from '../contexts/ThemeContext';
import { fmtAxis } from '../utils/format';
import { calcZigZag } from '../utils/zigzag';

const ZZ_COLOR     = '#e879f9';   // fuchsia — stands out from all existing lines
const ZZ_THRESHOLDS = [3, 5, 8, 10];

const CardWrap = ({ title, legend, children }) => {
  const { colors: C } = useTheme();
  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
      padding:      '12px 14px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>{title}</span>
        {legend && <span style={{ fontSize: 9, color: C.muted }}>{legend}</span>}
      </div>
      {children}
    </div>
  );
};

const Dot = ({ color }) => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, marginRight: 4 }} />
);

// ── Price Chart ───────────────────────────────────────────────────────────────
export function PriceChart({ data, candles }) {
  const { colors: C } = useTheme();
  const [zzOn,        setZzOn]        = useState(false);
  const [zzThreshold, setZzThreshold] = useState(5);

  if (!data.length) return null;

  // Compute ZigZag pivots when toggled on
  const pivots = zzOn && candles?.length ? calcZigZag(candles, zzThreshold) : [];

  // Render ZigZag as polyline segments inside the SvgChart clip group
  const zigzagOverlay = zzOn && pivots.length >= 2
    ? ({ xScale, yScale }) => {
        const points = pivots
          .map(p => `${xScale(p.index)},${yScale(p.price)}`)
          .join(' ');
        return (
          <g key="zigzag">
            <polyline
              points={points}
              stroke={ZZ_COLOR}
              strokeWidth={1.5}
              fill="none"
              strokeLinejoin="round"
              opacity={0.9}
            />
            {pivots.map((p, i) => (
              <circle
                key={i}
                cx={xScale(p.index)}
                cy={yScale(p.price)}
                r={p.tentative ? 2.5 : 3.5}
                fill={p.type === 'high' ? C.bear : C.bull}
                stroke={ZZ_COLOR}
                strokeWidth={1}
                opacity={p.tentative ? 0.55 : 1}
              />
            ))}
          </g>
        );
      }
    : null;

  return (
    <CardWrap
      title="Price · EMA · Bollinger Bands"
      legend={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>
            <Dot color={C.ema9}  />EMA9&nbsp;&nbsp;
            <Dot color={C.ema21} />EMA21&nbsp;&nbsp;
            <Dot color={C.ema50} />EMA50
          </span>

          {/* ZigZag toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <button
              onClick={() => setZzOn(v => !v)}
              style={{
                fontFamily:  "'Raleway', sans-serif",
                fontSize:     9,
                fontWeight:   700,
                padding:     '2px 8px',
                borderRadius: 4,
                border:       `1px solid ${zzOn ? ZZ_COLOR + '80' : C.border}`,
                background:   zzOn ? ZZ_COLOR + '20' : 'transparent',
                color:        zzOn ? ZZ_COLOR : C.muted,
                cursor:      'pointer',
                letterSpacing: 0.4,
                transition:  'all 0.15s',
              }}
            >
              ⚡ ZigZag
            </button>

            {/* Threshold selector — only shown when active */}
            {zzOn && (
              <div style={{ display: 'flex', gap: 3 }}>
                {ZZ_THRESHOLDS.map(t => (
                  <button
                    key={t}
                    onClick={() => setZzThreshold(t)}
                    style={{
                      fontFamily:  "'Raleway', sans-serif",
                      fontSize:     9,
                      fontWeight:   700,
                      padding:     '2px 6px',
                      borderRadius: 3,
                      border:      `1px solid ${zzThreshold === t ? ZZ_COLOR + '80' : C.border}`,
                      background:   zzThreshold === t ? ZZ_COLOR + '25' : 'transparent',
                      color:        zzThreshold === t ? ZZ_COLOR : C.muted,
                      cursor:      'pointer',
                    }}
                  >
                    {t}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      }
    >
      <SvgChart
        data={data}
        height={230}
        yFormatter={fmtAxis}
        clipId="price-clip"
        overlays={zigzagOverlay}
        series={[
          { key: 'bbUpper',  color: C.bb,    width: 1, dasharray: '4 3', label: 'BB Upper' },
          { key: 'bbLower',  color: C.bb,    width: 1, dasharray: '4 3', label: 'BB Lower' },
          { key: 'bbMiddle', color: C.grid,  width: 1, label: 'BB Mid' },
          { key: 'price',    color: C.price, width: 2, type: 'area', label: 'Price' },
          { key: 'e9',       color: C.ema9,  width: 1, label: 'EMA9' },
          { key: 'e21',      color: C.ema21, width: 1, label: 'EMA21' },
          { key: 'e50',      color: C.ema50, width: 1.5, label: 'EMA50' },
        ]}
      />
    </CardWrap>
  );
}

// ── RSI Chart ─────────────────────────────────────────────────────────────────
export function RSIChart({ data }) {
  const { colors: C } = useTheme();
  if (!data.length) return null;
  return (
    <CardWrap title="RSI (14) — Relative Strength Index">
      <SvgChart
        data={data}
        height={100}
        yDomain={[0, 100]}
        yFormatter={v => v.toFixed(0)}
        clipId="rsi-clip"
        refLines={[
          { value: 70, color: C.bear,   dasharray: '4 2', label: 'OB' },
          { value: 30, color: C.bull,   dasharray: '4 2', label: 'OS' },
          { value: 50, color: C.grid,   dasharray: '2 2' },
        ]}
        series={[
          { key: 'rsi', color: C.rsi, width: 1.5, type: 'area', label: 'RSI' },
        ]}
      />
    </CardWrap>
  );
}

// ── MACD Chart ────────────────────────────────────────────────────────────────
export function MACDChart({ data }) {
  const { colors: C } = useTheme();
  if (!data.length) return null;

  const allVals = data.flatMap(d => [d.macd, d.signal, d.hist]).filter(v => v != null && isFinite(v));
  if (!allVals.length) return null;
  const yMin = Math.min(...allVals) * 1.1;
  const yMax = Math.max(...allVals) * 1.1;

  return (
    <CardWrap
      title="MACD (12, 26, 9)"
      legend={
        <span>
          <Dot color={C.macd}   />MACD&nbsp;&nbsp;
          <Dot color={C.signal} />Signal
        </span>
      }
    >
      <SvgChart
        data={data}
        height={110}
        yDomain={[yMin, yMax]}
        yFormatter={v => v.toFixed(2)}
        clipId="macd-clip"
        refLines={[
          { value: 0, color: C.border, dasharray: '2 0' },
        ]}
        series={[
          {
            key:       'hist',
            type:      'bar',
            upColor:   `${C.bull}aa`,
            downColor: `${C.bear}aa`,
            label:     'Histogram',
          },
          { key: 'macd',   color: C.macd,   width: 1.5, label: 'MACD'   },
          { key: 'signal', color: C.signal,  width: 1.5, label: 'Signal' },
        ]}
      />
    </CardWrap>
  );
}
