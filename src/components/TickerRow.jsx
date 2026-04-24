import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice, fmtVolume, fmtPct } from '../utils/format';

export default function TickerRow({ ticker, symbol, market }) {
  const { colors: C } = useTheme();
  if (!ticker) return null;

  const up  = ticker.change >= 0;
  const pc  = up ? C.bull : C.bear;
  const d   = ticker.price < 0.01 ? 6 : ticker.price < 1 ? 5 : ticker.price < 10 ? 4 : 2;
  const marketLabel = market === 'futures' ? 'Perp' : 'Spot';

  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:            0,
      padding:       '0 14px',
      background:     C.card,
      borderBottom:  `1px solid ${C.border}`,
      overflowX:     'auto',
      flexWrap:      'nowrap',
    }}>

      {/* ── Symbol + market badge ── */}
      <div style={{
        padding:      '12px 18px 12px 4px',
        borderRight:  `1px solid ${C.border}`,
        marginRight:   18,
        flexShrink:    0,
      }}>
        <div style={{
          fontFamily:   "'Raleway', sans-serif",
          fontSize:      18,
          fontWeight:    800,
          color:         C.bright,
          letterSpacing: 0.5,
          lineHeight:    1,
          marginBottom:  4,
        }}>
          {symbol.label}
        </div>
        <span style={{
          fontFamily:    "'Raleway', sans-serif",
          fontSize:       9,
          fontWeight:     700,
          textTransform:  'uppercase',
          letterSpacing:  1,
          color:          market === 'futures' ? '#f97316' : '#10d67a',
          background:     market === 'futures' ? '#f9731618' : '#10d67a18',
          border:         `1px solid ${market === 'futures' ? '#f9731640' : '#10d67a40'}`,
          padding:       '2px 7px',
          borderRadius:   3,
        }}>
          {marketLabel}
        </span>
      </div>

      {/* ── Price — hero element ── */}
      <div style={{ paddingRight: 24, borderRight: `1px solid ${C.border}`, marginRight: 18, flexShrink: 0 }}>
        <div style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize:    10,
          fontWeight:  600,
          color:       C.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom:  3,
        }}>
          Price
        </div>
        <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: pc, lineHeight: 1 }}>
          ${fmtPrice(ticker.price, d)}
        </div>
      </div>

      {/* ── Change ── */}
      <Stat
        label="24h Change"
        value={fmtPct(ticker.change)}
        color={pc}
        badge={up ? '▲' : '▼'}
        C={C}
      />

      {/* ── High / Low ── */}
      <Stat label="24h High" value={`$${fmtPrice(ticker.high24, d)}`} color="#60a5fa" C={C} />
      <Stat label="24h Low"  value={`$${fmtPrice(ticker.low24, d)}`}  color="#60a5fa" C={C} />

      {/* ── Volume ── */}
      <Stat
        label={`Volume (${symbol.label.split('/')[1] || 'USDT'})`}
        value={fmtVolume(ticker.volume)}
        color="#a78bfa"
        C={C}
      />

      {/* ── Trades ── */}
      <Stat label="Trades 24h" value={fmtVolume(ticker.trades)} color="#fbbf24" C={C} />
    </div>
  );
}

function Stat({ label, value, color, badge, C }) {
  return (
    <div style={{
      padding:      '12px 20px 12px 0',
      marginRight:   20,
      flexShrink:    0,
    }}>
      <div style={{
        fontFamily:    "'Raleway', sans-serif",
        fontSize:       10,
        fontWeight:     600,
        color:          C.muted,
        textTransform:  'uppercase',
        letterSpacing:  0.8,
        marginBottom:   4,
      }}>
        {label}
      </div>
      <div className="mono" style={{
        fontSize:   17,
        fontWeight: 700,
        color,
        lineHeight: 1,
        display:    'flex',
        alignItems: 'center',
        gap:         4,
      }}>
        {badge && <span style={{ fontSize: 11 }}>{badge}</span>}
        {value}
      </div>
    </div>
  );
}
