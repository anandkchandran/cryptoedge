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
  const isGainer    = coin.change >= 0;
  const changeColor = isGainer ? C.bull : C.bear;

  return (
    <div
      onClick={() => onSelect({ label: coin.label, id: coin.id, tv: coin.isFutures ? coin.tvFutures : coin.tv })}
      style={{
        padding:       '9px 12px',
        cursor:        'pointer',
        borderLeft:    isActive ? `3px solid ${changeColor}` : '3px solid transparent',
        background:    isActive ? `${changeColor}12` : 'transparent',
        borderBottom:  `1px solid ${C.border}30`,
        transition:    'background 0.12s',
        touchAction:   'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${C.muted}12`; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Top row: rank + name + change% */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize:    10,
            color:       C.muted,
            minWidth:    18,
            fontWeight:  500,
          }}>
            #{coin.rank}
          </span>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize:    13,
            fontWeight:  800,
            color:       isActive ? changeColor : C.bright,
            letterSpacing: 0.3,
          }}>
            {coin.label.replace('/USDT', '')}
          </span>
          <span style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize:    9,
            color:       C.muted,
          }}>
            USDT
          </span>
        </div>
        <span className="mono" style={{
          fontSize:   13,
          fontWeight: 700,
          color:      changeColor,
        }}>
          {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
        </span>
      </div>

      {/* Bottom row: price + volume */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 24 }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
          ${fmtPrice(coin.price)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>Vol</span>
          <span className="mono" style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
            {fmtVol(coin.volume)}
          </span>
        </span>
      </div>
    </div>
  );
}

export default function SurgingList({ currentSymbol, onSelect }) {
  const { colors: C } = useTheme();
  const [marketFilter, setMarketFilter] = useState('spot');
  const { gainers, losers, loading, error, lastRefresh, refresh } = useSurgingCryptos(marketFilter);
  const [tab, setTab] = useState('gainers');

  const list = tab === 'gainers' ? gainers : losers;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.card }}>

      {/* ── Header ── */}
      <div style={{
        padding:      '10px 12px 0',
        borderBottom: `1px solid ${C.border}`,
        flexShrink:    0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{
            fontFamily:    "'Raleway', sans-serif",
            fontSize:       12,
            fontWeight:     800,
            color:          C.bright,
            textTransform:  'uppercase',
            letterSpacing:  1.2,
          }}>
            Markets
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            title="Refresh"
            style={{
              background: 'transparent', border: `1px solid ${C.border}`,
              borderRadius: 4, color: C.muted, fontSize: 13,
              padding: '1px 7px', cursor: 'pointer', lineHeight: 1.4,
            }}
          >
            ↻
          </button>
        </div>

        {/* Spot / Futures filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {[
            { id: 'spot',    label: '● Spot',    activeColor: '#10d67a' },
            { id: 'futures', label: '◆ Perp',    activeColor: '#f97316' },
          ].map(m => {
            const isActive = marketFilter === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMarketFilter(m.id)}
                style={{
                  flex:          1,
                  fontFamily:    "'Raleway', sans-serif",
                  fontSize:       10,
                  fontWeight:     700,
                  padding:       '4px 0',
                  borderRadius:   4,
                  border:         `1px solid ${isActive ? m.activeColor + '60' : C.border}`,
                  background:     isActive ? m.activeColor + '18' : 'transparent',
                  color:          isActive ? m.activeColor : C.muted,
                  cursor:        'pointer',
                  letterSpacing:  0.4,
                  textTransform:  'uppercase',
                  transition:    'all 0.15s',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Gainers / Losers tabs */}
        <div style={{ display: 'flex' }}>
          {[
            { id: 'gainers', label: '▲ Gainers', color: C.bull },
            { id: 'losers',  label: '▼ Losers',  color: C.bear },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex:          1,
                fontFamily:    "'Raleway', sans-serif",
                fontSize:       11,
                fontWeight:     700,
                padding:       '6px 0',
                border:        'none',
                borderBottom:  tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                background:    'transparent',
                color:         tab === t.id ? t.color : C.muted,
                cursor:        'pointer',
                letterSpacing:  0.5,
                textTransform:  'uppercase',
                transition:    'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {lastRefresh && (
          <div style={{
            fontFamily: "'Raleway', sans-serif",
            fontSize:    9,
            color:       C.muted,
            padding:    '4px 0 5px',
          }}>
            Updated <span className="mono">{lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ marginLeft: 6, opacity: 0.6 }}>· auto-refresh 1h</span>
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {error && (
          <div style={{
            padding: '10px 12px', fontSize: 11,
            fontFamily: "'Raleway', sans-serif", color: C.bear,
          }}>
            ⚠ {error}
          </div>
        )}
        {loading && !list.length && (
          <div style={{
            padding: '20px 12px', textAlign: 'center',
            fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted,
          }}>
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
