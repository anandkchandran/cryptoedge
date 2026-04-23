import React, { useState } from 'react';
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

function CoinRow({ coin, isActive, onSelect, C }) {
  const isGainer     = coin.change >= 0;
  const changeColor  = isGainer ? C.bull : C.bear;
  const activeColor  = isGainer ? C.bull : C.bear;

  return (
    <div
      onClick={() => onSelect({ label: coin.label, id: coin.id, tv: coin.tv })}
      style={{
        display:       'flex',
        flexDirection: 'column',
        padding:       '7px 10px',
        cursor:        'pointer',
        borderLeft:    isActive ? `3px solid ${activeColor}` : '3px solid transparent',
        background:    isActive ? `${activeColor}10` : 'transparent',
        borderBottom:  `1px solid ${C.border}22`,
        transition:    'background 0.12s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${C.muted}15`; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 8, color: C.muted, minWidth: 14 }}>#{coin.rank}</span>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, fontWeight: 700, color: isActive ? activeColor : C.bright }}>
            {coin.label.replace('/USDT', '')}
          </span>
        </div>
        <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: changeColor }}>
          {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span className="mono" style={{ fontSize: 9, color: C.text }}>${fmtPrice(coin.price)}</span>
        <span className="mono" style={{ fontSize: 8, color: C.muted }}>{fmtVol(coin.volume)}</span>
      </div>
    </div>
  );
}

export default function SurgingList({ currentSymbol, onSelect }) {
  const { colors: C } = useTheme();
  const { gainers, losers, loading, error, lastRefresh, refresh } = useSurgingCryptos();
  const [tab, setTab] = useState('gainers'); // 'gainers' | 'losers'

  const list = tab === 'gainers' ? gainers : losers;

  const tabStyle = (active, color) => ({
    flex:          1,
    fontFamily:    "'Raleway', sans-serif",
    fontSize:      10,
    fontWeight:    700,
    padding:       '5px 0',
    border:        'none',
    borderBottom:  active ? `2px solid ${color}` : `2px solid transparent`,
    background:    'transparent',
    color:         active ? color : C.muted,
    cursor:        'pointer',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    transition:    'all 0.15s',
  });

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      height:        '100%',
      background:    C.card,
    }}>
      {/* Header */}
      <div style={{
        padding:      '10px 10px 0',
        borderBottom: `1px solid ${C.border}`,
        background:   C.card,
        flexShrink:   0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, fontWeight: 700, color: C.bright, textTransform: 'uppercase', letterSpacing: 1 }}>
            Markets
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh list"
            style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 12, padding: '1px 4px', cursor: 'pointer' }}
          >
            ↻
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          <button style={tabStyle(tab === 'gainers', C.bull)} onClick={() => setTab('gainers')}>
            ▲ Top Gainers
          </button>
          <button style={tabStyle(tab === 'losers', C.bear)} onClick={() => setTab('losers')}>
            ▼ Top Losers
          </button>
        </div>

        {lastRefresh && (
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, padding: '3px 0 4px' }}>
            ↻ <span className="mono">{lastRefresh.toLocaleTimeString()}</span> · auto 1h
          </div>
        )}
      </div>

      {/* List body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
        {error && (
          <div style={{ padding: '8px 10px', fontSize: 10, color: C.bear }}>⚠ {error}</div>
        )}
        {loading && !list.length && (
          <div style={{ padding: '16px 10px', textAlign: 'center', color: C.muted, fontSize: 10 }}>
            Loading…
          </div>
        )}
        {list.map(coin => (
          <CoinRow
            key={coin.id}
            coin={coin}
            isActive={currentSymbol?.id === coin.id}
            onSelect={onSelect}
            C={C}
          />
        ))}
      </div>
    </div>
  );
}
