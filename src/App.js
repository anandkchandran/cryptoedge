// ── All imports first (ESLint import/first rule) ─────────────────────────────
import React, { useState } from 'react';
import './App.css';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { SYMBOLS, TIMEFRAMES } from './constants';
import { useMarketData } from './hooks/useMarketData';

import Header              from './components/Header';
import TickerRow           from './components/TickerRow';
import { PriceChart, RSIChart, MACDChart } from './components/Charts';
import TradingViewWidget   from './components/TradingViewWidget';
import { SignalCard, SignalBreakdown, IndicatorValues, Disclaimer } from './components/SignalPanel';

import SurgingList         from './components/SurgingList';
import PaperTrading        from './components/PaperTrading';
import GeminiPanel         from './components/GeminiPanel';

// ── Spot / Futures toggle — displayed inside the chart column ─────────────────
function MarketToggle({ market, onChange, C }) {
  const isSpot    = market === 'spot';
  const isFutures = market === 'futures';
  return (
    <div style={{
      display:     'flex',
      alignItems:  'center',
      gap:          10,
      marginBottom: 8,
      padding:     '7px 12px',
      background:   C.card,
      border:       `1px solid ${C.border}`,
      borderRadius: 8,
    }}>
      <span style={{
        fontFamily:   "'Raleway', sans-serif",
        fontSize:      10,
        fontWeight:    700,
        color:         C.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginRight:   4,
      }}>
        Market
      </span>

      {/* SPOT button */}
      <button
        onClick={() => onChange('spot')}
        style={{
          fontFamily:   "'Raleway', sans-serif",
          fontWeight:    700,
          fontSize:      11,
          padding:      '4px 14px',
          borderRadius:  5,
          border:        `1px solid ${isSpot ? '#10d67a60' : C.border}`,
          background:    isSpot ? '#10d67a18' : 'transparent',
          color:         isSpot ? '#10d67a'   : C.muted,
          cursor:       'pointer',
          letterSpacing: 0.5,
          transition:   'all 0.15s',
        }}
      >
        ● Spot
      </button>

      {/* FUTURES button */}
      <button
        onClick={() => onChange('futures')}
        style={{
          fontFamily:   "'Raleway', sans-serif",
          fontWeight:    700,
          fontSize:      11,
          padding:      '4px 14px',
          borderRadius:  5,
          border:        `1px solid ${isFutures ? '#f9731660' : C.border}`,
          background:    isFutures ? '#f9731618' : 'transparent',
          color:         isFutures ? '#f97316'   : C.muted,
          cursor:       'pointer',
          letterSpacing: 0.5,
          transition:   'all 0.15s',
        }}
      >
        ◆ Futures
      </button>

      {/* Active label badge */}
      <span style={{
        marginLeft:    'auto',
        fontFamily:    "'Raleway', sans-serif",
        fontSize:       9,
        fontWeight:     700,
        textTransform:  'uppercase',
        letterSpacing:  1,
        color:          isSpot ? '#10d67a' : '#f97316',
        background:     isSpot ? '#10d67a12' : '#f9731612',
        border:         `1px solid ${isSpot ? '#10d67a30' : '#f9731630'}`,
        padding:       '2px 8px',
        borderRadius:   3,
      }}>
        {isSpot ? 'Spot' : 'Perp Futures'}
      </span>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
function AppInner() {
  const [symbol,    setSymbol]    = useState(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[3]); // 1h default
  const [view,      setView]      = useState('indicators');
  const [market,    setMarket]    = useState('spot');         // 'spot' | 'futures'

  const { colors: C } = useTheme();

  const {
    candles, chartData, ticker, inds, signal,
    loading, error, lastUpdate, refresh,
  } = useMarketData(symbol, timeframe, market);

  return (
    <div className="app" style={{ background: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <Header
        symbol={symbol}       timeframe={timeframe}
        view={view}           loading={loading}
        lastUpdate={lastUpdate}
        onSymbol={setSymbol}  onTimeframe={setTimeframe}
        onView={setView}      onRefresh={refresh}
      />

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background:   '#f8514918',
          border:       '1px solid #f8514940',
          margin:       '10px 14px 0',
          borderRadius:  6,
          padding:      '8px 14px',
          fontSize:      12,
          color:         C.bear,
          fontFamily:   "'Raleway', sans-serif",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── Loading splash ── */}
      {loading && !candles.length && (
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          flexDirection:  'column',
          gap:             12,
          height:          400,
          color:           C.muted,
        }}>
          <div className="spinner">◌</div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13 }}>
            Loading {symbol.label} {market === 'futures' ? 'Futures' : 'Spot'} — {timeframe.label} candles…
          </div>
        </div>
      )}

      {/* ── Main content — Skeleton .container (full-width) + .main-row ── */}
      {(!loading || candles.length > 0) && (
        <>
          <TickerRow ticker={ticker} symbol={symbol} market={market} />

          <div className="container">
            <div className="main-row">

              {/* Left: Surging list */}
              <div className="col-surge" style={{ borderRight: `1px solid ${C.border}` }}>
                <SurgingList currentSymbol={symbol} onSelect={setSymbol} />
              </div>

              {/* Centre: Charts — with Spot/Futures toggle at the top */}
              <div className="col-chart">
                <MarketToggle market={market} onChange={setMarket} C={C} />

                {view === 'tradingview'
                  ? <TradingViewWidget symbol={symbol} timeframe={timeframe} market={market} />
                  : (
                    <>
                      <PriceChart data={chartData} />
                      <RSIChart   data={chartData} />
                      <MACDChart  data={chartData} />
                    </>
                  )
                }
              </div>

              {/* Right: Signal */}
              <div className="col-signal">
                <SignalCard      signal={signal} market={market} />
                <SignalBreakdown signal={signal} />
                <IndicatorValues inds={inds} candles={candles} />
                <GeminiPanel
                  symbol={symbol} timeframe={timeframe}
                  ticker={ticker} inds={inds}
                  signal={signal} candles={candles}
                  market={market}
                />
                <PaperTrading ticker={ticker} symbol={symbol} />
                <Disclaimer      lastUpdate={lastUpdate} />
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppInner />
    </ThemeProvider>
  );
}
