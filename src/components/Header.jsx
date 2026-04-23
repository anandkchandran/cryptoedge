import React from 'react';
import { SYMBOLS, TIMEFRAMES } from '../constants';
import { fmtDateTime } from '../utils/format';
import { useTheme } from '../contexts/ThemeContext';

// ── Last-refreshed status bar ─────────────────────────────────────────────────
export function RefreshBar({ lastUpdate, symbol, loading }) {
  const { colors: C } = useTheme();
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '5px 16px',
      background:     C.bg,
      borderBottom:   `1px solid ${C.border}`,
      fontSize:       11,
    }}>
      {/* Left: live pulse + symbol */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display:      'inline-block',
          width:        7, height: 7,
          borderRadius: '50%',
          background:   loading ? '#fbbf24' : '#10d67a',
          boxShadow:    loading ? '0 0 6px #fbbf2480' : '0 0 6px #10d67a80',
          animation:    'statusPulse 2s ease-in-out infinite',
          flexShrink:   0,
        }} />
        <span style={{
          fontFamily:  "'Raleway', sans-serif",
          fontWeight:  600,
          color:       C.muted,
          letterSpacing: 0.4,
        }}>
          {loading ? 'Fetching data…' : `${symbol?.label} — Market data live`}
        </span>
      </div>

      {/* Right: last refreshed timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: C.muted, fontFamily: "'Raleway', sans-serif" }}>
          Last refreshed:
        </span>
        <span className="mono" style={{
          color:      lastUpdate ? C.bright : C.muted,
          fontWeight: 500,
          fontSize:   11,
        }}>
          {lastUpdate ? fmtDateTime(lastUpdate) : '—'}
        </span>
      </div>

      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

// ── Main header ───────────────────────────────────────────────────────────────
export default function Header({ symbol, timeframe, view, loading, lastUpdate, onSymbol, onTimeframe, onView, onRefresh }) {
  const { colors: C, theme, toggleTheme } = useTheme();

  return (
    <div className="app-header-wrapper" style={{ background: C.card }}>
      <header
        className="app-header"
        style={{
          background:   C.card,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {/* ── Brand — Skeleton Raleway heading ── */}
        <div className="brand">
          <span className="brand-name">◈ CryptoEdge Pro</span>
          <span style={{
            fontSize: 9, fontFamily: "'Raleway', sans-serif", fontWeight: 700,
            color: '#10d67a', background: '#10d67a18',
            border: '1px solid #10d67a40', padding: '1px 6px', borderRadius: 3,
            letterSpacing: 1, textTransform: 'uppercase',
          }}>Live</span>
        </div>

        {/* ── Controls ── */}
        <div className="controls">

          {/* Symbol — Skeleton select style */}
          <select
            value={symbol.id}
            onChange={e => onSymbol(SYMBOLS.find(s => s.id === e.target.value))}
          >
            {SYMBOLS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>

          {/* Timeframe group */}
          <div style={{
            display: 'flex', gap: 2,
            background: C.bg, borderRadius: 6, padding: 2,
            border: `1px solid ${C.border}`,
          }}>
            {TIMEFRAMES.map(t => (
              <button
                key={t.id}
                onClick={() => onTimeframe(t)}
                style={{
                  padding: '3px 9px', borderRadius: 4, border: 'none',
                  fontFamily: "'Raleway', sans-serif", fontWeight: timeframe.id === t.id ? 700 : 400,
                  background: timeframe.id === t.id
                    ? (theme === 'dark' ? '#1e3a5f' : '#dbeafe')
                    : 'transparent',
                  color: timeframe.id === t.id ? '#60a5fa' : C.muted,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2,
            background: C.bg, borderRadius: 6, padding: 2,
            border: `1px solid ${C.border}`,
          }}>
            {[
              { id: 'indicators',  label: 'Indicators' },
              { id: 'tradingview', label: 'TradingView' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => onView(v.id)}
                style={{
                  padding: '3px 9px', borderRadius: 4, border: 'none',
                  fontFamily: "'Raleway', sans-serif", fontWeight: view === v.id ? 700 : 400,
                  background: view === v.id
                    ? (theme === 'dark' ? '#1e3a5f' : '#dbeafe')
                    : 'transparent',
                  color: view === v.id ? '#60a5fa' : C.muted,
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Refresh — Skeleton .button-accent */}
          <button
            className="button-accent"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? '…' : '↻ Refresh'}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </div>
      </header>

      {/* ── Last-refreshed bar below the main header ── */}
      <RefreshBar lastUpdate={lastUpdate} symbol={symbol} loading={loading} />
    </div>
  );
}
