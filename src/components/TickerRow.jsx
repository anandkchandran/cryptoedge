import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice, fmtVolume, fmtPct } from '../utils/format';

function StatCard({ label, value, color, sub }) {
  const { colors: C } = useTheme();
  return (
    <div style={{
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
      padding:      '10px 14px',
      minWidth:     110,
      flex:         '1 1 110px',
    }}>
      {/* Raleway label — Skeleton typography */}
      <div style={{
        fontFamily:    "'Raleway', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        fontSize:       10,
        fontWeight:     600,
        color:          C.muted,
        marginBottom:   4,
        textTransform:  'uppercase',
        letterSpacing:  0.8,
      }}>
        {label}
      </div>
      {/* Roboto Mono value — numeric data */}
      <div className="mono" style={{ fontSize: 15, fontWeight: 600, color }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize:   10,
          color:      C.muted,
          marginTop:  2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function TickerRow({ ticker, symbol }) {
  const { colors: C } = useTheme();
  if (!ticker) return null;
  const up = ticker.change >= 0;
  const pc = up ? C.bull : C.bear;
  const d  = ticker.price < 1 ? 5 : ticker.price < 10 ? 4 : 2;

  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 14px', flexWrap: 'wrap' }}>
      <StatCard label="Price"        value={`$${fmtPrice(ticker.price, d)}`}  color={pc} />
      <StatCard label="24h Change"   value={fmtPct(ticker.change)}            color={pc} />
      <StatCard label="24h High"     value={`$${fmtPrice(ticker.high24, d)}`} color="#60a5fa" />
      <StatCard label="24h Low"      value={`$${fmtPrice(ticker.low24, d)}`}  color="#60a5fa" />
      <StatCard label="Volume"       value={fmtVolume(ticker.volume)}         color="#a78bfa" sub={symbol.label} />
      <StatCard label="Trades (24h)" value={fmtVolume(ticker.trades)}         color="#fbbf24" />
    </div>
  );
}
