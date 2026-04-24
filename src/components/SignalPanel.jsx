import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice, fmtDateTime } from '../utils/format';

// ── Helpers ───────────────────────────────────────────────────────────────────
const sigColor = (type, C) =>
  type.includes('bull') ? C.bull :
  type.includes('bear') ? C.bear :
  C.neutral;

const sigBg = (type) =>
  type.includes('bull') ? '#10d67a12' :
  type.includes('bear') ? '#f8514912' :
  '#d4a01712';

const sigIcon = (type) =>
  type.includes('bull') ? '▲' :
  type.includes('bear') ? '▼' :
  '◆';

const priceDecimals = (price) =>
  price < 0.01 ? 6 : price < 1 ? 5 : price < 10 ? 4 : 2;

// ── Sub-components ────────────────────────────────────────────────────────────
// Shared Raleway style for section headings (Skeleton typography)
const sectionHeadStyle = {
  fontFamily:    "'Raleway', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  fontSize:       10,
  fontWeight:     700,
  textTransform:  'uppercase',
  letterSpacing:  1,
};

function Section({ title, children }) {
  const { colors: C } = useTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        ...sectionHeadStyle,
        color:         C.muted,
        marginBottom:  8,
        borderBottom:  `1px solid ${C.border}`,
        paddingBottom: 4,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, color }) {
  const { colors: C } = useTheme();
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        '5px 8px',
      marginBottom:   3,
      background:     C.bg,
      borderRadius:   5,
      border:         `1px solid ${color}22`,
    }}>
      {/* Raleway label */}
      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, color: C.text }}>{label}</span>
      {/* Roboto Mono value */}
      <span className="mono" style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

// ── Signal Card ───────────────────────────────────────────────────────────────
export function SignalCard({ signal, market = 'spot' }) {
  const { colors: C } = useTheme();
  const marketColor = market === 'futures' ? '#f97316' : '#10d67a';
  const marketLabel = market === 'futures' ? 'Perp Futures' : 'Spot';

  if (!signal) {
    return (
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 10 }}>
        <div style={{ ...sectionHeadStyle, color: C.muted, marginBottom: 8 }}>AI Signal</div>
        <div style={{ fontFamily: "'Raleway', sans-serif", color: C.muted, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
          Analysing market data…
        </div>
      </div>
    );
  }

  const ac = signal.action === 'BUY' ? C.bull : signal.action === 'SELL' ? C.bear : C.neutral;
  const d  = priceDecimals(signal.entry);

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${ac}30`,
      borderRadius: 8,
      padding:      16,
      marginBottom: 10,
    }}>
      {/* Action + Confidence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          {/* AI Signal label + market badge on same row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ ...sectionHeadStyle, color: C.muted }}>AI Signal</div>
            <span style={{
              fontFamily:    "'Raleway', sans-serif",
              fontSize:       8,
              fontWeight:     700,
              textTransform:  'uppercase',
              letterSpacing:  0.8,
              color:          marketColor,
              background:     marketColor + '18',
              border:         `1px solid ${marketColor}40`,
              padding:        '1px 6px',
              borderRadius:   3,
            }}>
              {marketLabel}
            </span>
          </div>
          {/* Big action — Roboto Mono for impact */}
          <div className="mono" style={{ fontSize: 42, fontWeight: 700, color: ac, letterSpacing: 3, lineHeight: 1 }}>
            {signal.action}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...sectionHeadStyle, color: C.muted, marginBottom: 4 }}>Confidence</div>
          <div className="mono" style={{ fontSize: 30, fontWeight: 600, color: ac }}>{signal.confidence}%</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ background: C.grid, borderRadius: 3, height: 5, marginBottom: 16 }}>
        <div style={{
          width:      `${signal.confidence}%`,
          height:     '100%',
          background: ac,
          borderRadius: 3,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Strategy */}
      <Section title="Entry / Exit Strategy">
        <Row label="Entry"        value={`$${fmtPrice(signal.entry, d)}`}    color="#60a5fa" />
        <Row label="Target 1"    value={`$${fmtPrice(signal.target1, d)}`}   color={C.bull} />
        <Row label="Target 2"    value={`$${fmtPrice(signal.target2, d)}`}   color="#00c853" />
        <Row label="Stop Loss"   value={`$${fmtPrice(signal.stopLoss, d)}`}  color={C.bear} />
        <Row label="Risk:Reward" value={signal.rr}                           color="#a78bfa" />
        <Row label="ATR (14)"    value={`$${fmtPrice(signal.atr, d)}`}       color="#fbbf24" />
      </Section>

      {/* Score bar */}
      <Section title="Bull / Bear Score">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: C.bull, minWidth: 24 }}>Bull</span>
          <div style={{ flex: 1, background: C.grid, borderRadius: 3, height: 8, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position:   'absolute',
              left:       '50%',
              width:      `${Math.min(Math.abs(signal.score) / 2, 50)}%`,
              height:     '100%',
              background: signal.score >= 0 ? C.bull : C.bear,
              transform:  signal.score >= 0 ? 'none' : 'translateX(-100%)',
              borderRadius: 3,
            }} />
            <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.muted }} />
          </div>
          <span style={{ fontSize: 10, color: C.bear, minWidth: 24, textAlign: 'right' }}>Bear</span>
        </div>
        <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', marginTop: 4 }}>
          Score: {signal.score > 0 ? '+' : ''}{signal.score}
        </div>
      </Section>
    </div>
  );
}

// ── Signal Breakdown ──────────────────────────────────────────────────────────
export function SignalBreakdown({ signal }) {
  const { colors: C } = useTheme();
  if (!signal?.signals?.length) return null;

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
      padding:      14,
      marginBottom: 10,
    }}>
      <div style={{ ...sectionHeadStyle, color: C.muted, marginBottom: 10 }}>
        Signal Breakdown ({signal.signals.length} signals)
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
        {signal.signals.map((s, i) => (
          <div
            key={i}
            style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              padding:        '7px 10px',
              background:     sigBg(s.type),
              borderRadius:   5,
              borderLeft:     `3px solid ${sigColor(s.type, C)}`,
            }}
          >
            <div>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, fontWeight: 700, color: C.text, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>{s.indicator}</div>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, color: C.bright }}>{s.message}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginLeft: 10 }}>
              <span style={{ fontSize: 14, color: sigColor(s.type, C) }}>{sigIcon(s.type)}</span>
              <span style={{ fontSize: 9, color: sigColor(s.type, C), fontWeight: 600 }}>
                {s.points > 0 ? '+' : ''}{s.points}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Indicator Values ──────────────────────────────────────────────────────────
export function IndicatorValues({ inds, candles }) {
  const { colors: C } = useTheme();
  if (!inds || !candles.length) return null;
  const n = candles.length - 1;
  const p = candles[n].close;
  const d = priceDecimals(p);

  const items = [
    { label: 'RSI (14)',  value: inds.rsi[n]?.toFixed(1),            color: inds.rsi[n] > 70 ? C.bear : inds.rsi[n] < 30 ? C.bull : '#60a5fa' },
    { label: 'EMA 9',    value: `$${fmtPrice(inds.e9[n], d)}`,       color: C.ema9  },
    { label: 'EMA 21',   value: `$${fmtPrice(inds.e21[n], d)}`,      color: C.ema21 },
    { label: 'EMA 50',   value: `$${fmtPrice(inds.e50[n], d)}`,      color: C.ema50 },
    { label: 'MACD',     value: inds.macd.macdLine[n]?.toFixed(3),   color: C.macd  },
    { label: 'Signal',   value: inds.macd.signalLine[n]?.toFixed(3), color: C.signal},
    { label: 'BB Upper', value: `$${fmtPrice(inds.bb[n]?.upper, d)}`,color: C.muted },
    { label: 'BB Lower', value: `$${fmtPrice(inds.bb[n]?.lower, d)}`,color: C.muted },
  ];

  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
      padding:      14,
      marginBottom: 10,
    }}>
      <div style={{ ...sectionHeadStyle, color: C.muted, marginBottom: 10 }}>
        Current Readings
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {items.map(({ label, value, color }) => (
          <div key={label} style={{
            background:   C.bg,
            borderRadius: 5,
            padding:      '7px 10px',
            border:       `1px solid ${C.border}`,
          }}>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, fontWeight: 700, color: C.text, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
            <div className="mono" style={{ fontSize: 13, fontWeight: 600, color }}>{value ?? '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Disclaimer ────────────────────────────────────────────────────────────────
export function Disclaimer({ lastUpdate }) {
  const { colors: C } = useTheme();
  return (
    <div style={{
      background:   C.bg,
      border:       `1px solid ${C.border}`,
      borderRadius: 6,
      padding:      '10px 12px',
      color:        C.muted,
      lineHeight:   1.7,
    }}>
      <div style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize:    10,
        fontWeight:  600,
        marginBottom: 5,
        color:       C.bear,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
      }}>
        ⚠ Disclaimer
      </div>
      <p style={{
        fontFamily: "'Raleway', sans-serif",
        fontSize:    10,
        margin:      0,
        lineHeight:  1.7,
      }}>
        Educational purposes only — not financial advice. Crypto trading carries substantial risk of loss.
        Always perform your own due diligence before making any trade.
      </p>
      {lastUpdate && (
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9 }}>
            Source: Binance public API · Auto-refresh 30s
          </span>
          <span className="mono" style={{ fontSize: 9 }}>
            {fmtDateTime(lastUpdate)}
          </span>
        </div>
      )}
    </div>
  );
}
