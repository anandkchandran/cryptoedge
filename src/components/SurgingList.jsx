import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import useSurgingCryptos from '../hooks/useSurgingCryptos';

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1)    return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(6);
}

function fmtVol(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`;
  return `$${(v / 1e3).toFixed(0)}K`;
}

export default function SurgingList({ currentSymbol, onSelect }) {
  const { colors: C } = useTheme();
  const { surging, loading, error, lastRefresh, refresh } = useSurgingCryptos();

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      background:    C.card,
      borderRight:   `1px solid ${C.border}`,
    }}>
      {/* Header */}
      <div style={{
        padding:      '10px 10px 8px',
        borderBottom: `1px solid ${C.border}`,
        background:   C.card,
        flexShrink:   0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, fontWeight: 700, color: C.bright, textTransform: 'uppercase', letterSpacing: 1 }}>
            🔥 Surging
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh list"
            style={{
              background: 'transparent',
              border:     'none',
              color:      C.muted,
              fontSize:   12,
              padding:    '1px 4px',
            }}
          >
            ↻
          </button>
        </div>
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>Top 20 by 24h gain</div>
        {lastRefresh && (
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginTop: 2 }}>
            ↻ <span className="mono">{lastRefresh.toLocaleTimeString()}</span> · auto 1h
          </div>
        )}
      </div>

      {/* List body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {error && (
          <div style={{ padding: '8px 10px', fontSize: 10, color: C.bear }}>
            ⚠ {error}
          </div>
        )}

        {loading && !surging.length && (
          <div style={{ padding: '16px 10px', textAlign: 'center', color: C.muted, fontSize: 10 }}>
            Loading…
          </div>
        )}

        {surging.map(coin => {
          const isActive = currentSymbol?.id === coin.id;
          const changeColor = coin.change >= 0 ? C.bull : C.bear;

          return (
            <div
              key={coin.id}
              onClick={() => onSelect({ label: coin.label, id: coin.id, tv: coin.tv })}
              style={{
                display:       'flex',
                flexDirection: 'column',
                padding:       '7px 10px',
                cursor:        'pointer',
                borderLeft:    isActive ? `3px solid ${C.bull}` : '3px solid transparent',
                background:    isActive ? `${C.bull}10` : 'transparent',
                borderBottom:  `1px solid ${C.border}22`,
                transition:    'background 0.12s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${C.muted}15`; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Row 1: rank + symbol + change */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 8, color: C.muted, minWidth: 14 }}>#{coin.rank}</span>
                  {/* Raleway for coin name */}
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, fontWeight: 700, color: isActive ? C.bull : C.bright }}>
                    {coin.label.replace('/USDT', '')}
                  </span>
                </div>
                {/* Mono for percentage change */}
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: changeColor }}>
                  {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                </span>
              </div>

              {/* Row 2: price + volume — both monospace */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span className="mono" style={{ fontSize: 9, color: C.text }}>${fmtPrice(coin.price)}</span>
                <span className="mono" style={{ fontSize: 8, color: C.muted }}>{fmtVol(coin.volume)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
