import React, { useState, useRef, useEffect, useCallback } from 'react';
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: C.muted, fontFamily: "'Raleway', sans-serif" }}>Last refreshed:</span>
        <span className="mono" style={{ color: lastUpdate ? C.bright : C.muted, fontWeight: 500, fontSize: 11 }}>
          {lastUpdate ? fmtDateTime(lastUpdate) : '—'}
        </span>
      </div>
      <style>{`
        @keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
      `}</style>
    </div>
  );
}

// ── Symbol search with Binance validation ─────────────────────────────────────
function SymbolSearch({ symbol, onSymbol }) {
  const { colors: C } = useTheme();
  const [query,    setQuery]    = useState('');
  const [open,     setOpen]     = useState(false);
  const [checking, setChecking] = useState(false);
  const [badPair,  setBadPair]  = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        setBadPair(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter known symbols
  const q = query.trim().toUpperCase().replace('/', '');
  const filtered = SYMBOLS.filter(s =>
    s.id.includes(q) || s.label.toUpperCase().replace('/', '').includes(q)
  );

  // Try to validate an arbitrary pair against Binance
  const validateAndSelect = useCallback(async (raw) => {
    const cleaned = raw.trim().toUpperCase().replace('/', '').replace('-', '');
    if (!cleaned) return;

    // Check if it's already in the known list
    const known = SYMBOLS.find(s => s.id === cleaned);
    if (known) { onSymbol(known); setOpen(false); setQuery(''); return; }

    setChecking(true);
    setBadPair(false);
    try {
      const res  = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${cleaned}`);
      const data = await res.json();
      if (data.price) {
        // Valid pair — build a dynamic symbol object
        const base  = cleaned.replace(/USDT$|BUSD$|BTC$|ETH$|BNB$/, '');
        const quote = cleaned.slice(base.length);
        const label = `${base}/${quote}`;
        onSymbol({
          label,
          id:        cleaned,
          tv:        `BINANCE:${cleaned}`,
          tvFutures: `BINANCE:${cleaned}PERP`,
          dynamic:   true,
        });
        setOpen(false);
        setQuery('');
      } else {
        setBadPair(true);
      }
    } catch {
      setBadPair(true);
    } finally {
      setChecking(false);
    }
  }, [onSymbol]);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      if (filtered.length === 1) {
        onSymbol(filtered[0]);
        setOpen(false);
        setQuery('');
      } else if (query.trim()) {
        validateAndSelect(query);
      }
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setBadPair(false); }
  };

  const borderColor = badPair ? '#f85149' : open ? '#3b82f6' : C.border;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:           6,
        background:    C.bg,
        border:        `1px solid ${borderColor}`,
        borderRadius:  6,
        padding:      '4px 8px',
        minWidth:      140,
        transition:   'border-color 0.15s',
      }}>
        <span style={{ color: C.muted, fontSize: 11 }}>⌕</span>
        <input
          ref={inputRef}
          value={open ? query : ''}
          placeholder={symbol.label}
          onFocus={() => { setOpen(true); setBadPair(false); }}
          onChange={e => { setQuery(e.target.value); setBadPair(false); }}
          onKeyDown={handleKey}
          style={{
            background:  'transparent',
            border:       'none',
            outline:      'none',
            fontFamily:  "'Raleway', sans-serif",
            fontSize:     12,
            fontWeight:   open ? 400 : 700,
            color:        open ? C.text : C.bright,
            width:        110,
            cursor:      'text',
          }}
        />
        {checking && (
          <span style={{ fontSize: 10, color: '#3b82f6', animation: 'statusPulse 1s infinite' }}>…</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position:   'absolute',
          top:        '110%',
          left:        0,
          zIndex:      999,
          background:  C.card,
          border:      `1px solid ${C.border}`,
          borderRadius: 7,
          minWidth:    180,
          maxHeight:   280,
          overflowY:  'auto',
          boxShadow:  '0 8px 24px #00000060',
        }}>
          {/* Validation hint when typing something not in list */}
          {query && filtered.length === 0 && (
            <div style={{ padding: '8px 12px' }}>
              {badPair ? (
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: '#f85149' }}>
                  ✗ "{query.toUpperCase()}" not found on Binance
                </div>
              ) : (
                <div
                  onClick={() => validateAndSelect(query)}
                  style={{
                    fontFamily: "'Raleway', sans-serif", fontSize: 11, color: '#3b82f6',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13 }}>⊕</span>
                  Search "{query.toUpperCase()}" on Binance
                </div>
              )}
            </div>
          )}

          {/* Filtered known symbols */}
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => { onSymbol(s); setOpen(false); setQuery(''); }}
              style={{
                display:    'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding:   '7px 12px',
                cursor:    'pointer',
                background: s.id === symbol.id ? '#1e3a5f' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a2a40'}
              onMouseLeave={e => e.currentTarget.style.background = s.id === symbol.id ? '#1e3a5f' : 'transparent'}
            >
              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, fontWeight: 700, color: C.bright }}>
                {s.label}
              </span>
              {s.id === symbol.id && (
                <span style={{ fontSize: 9, color: '#10d67a' }}>✓</span>
              )}
            </div>
          ))}

          {/* Search Binance hint when list is showing */}
          {!query && (
            <div style={{
              padding: '6px 12px', borderTop: `1px solid ${C.border}`,
              fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted,
            }}>
              Type any pair (e.g. LINK/USDT) to search Binance
            </div>
          )}
        </div>
      )}
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
        style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}
      >
        {/* ── Brand ── */}
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

          {/* Symbol search */}
          <SymbolSearch symbol={symbol} onSymbol={onSymbol} />

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

          {/* Refresh */}
          <button className="button-accent" onClick={onRefresh} disabled={loading}>
            {loading ? '…' : '↻ Refresh'}
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
        </div>
      </header>

      <RefreshBar lastUpdate={lastUpdate} symbol={symbol} loading={loading} />
    </div>
  );
}
