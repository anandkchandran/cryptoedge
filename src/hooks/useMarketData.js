import { useState, useEffect, useCallback, useRef } from 'react';
import { calcEMA, calcRSI, calcMACD, calcBollingerBands, buildChartData } from '../utils/indicators';
import { computeSignal } from '../utils/signals';
import { CANDLE_LIMIT, REFRESH_INTERVAL } from '../constants';

// ── API base URLs ─────────────────────────────────────────────────────────────
const SPOT_BASE    = 'https://api.binance.com/api/v3';
const FUTURES_BASE = 'https://fapi.binance.com/fapi/v1';

function parseCandles(raw) {
  return raw.map(d => {
    const ts = new Date(d[0]);
    return {
      time:     ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      datetime: ts.toLocaleString([], {
        month: '2-digit', day: '2-digit',
        hour:  '2-digit', minute: '2-digit', hour12: false,
      }),
      open:   +d[1],
      high:   +d[2],
      low:    +d[3],
      close:  +d[4],
      volume: +d[5],
    };
  });
}

function computeIndicators(candles) {
  const prices = candles.map(c => c.close);
  return {
    e9:  calcEMA(prices, 9),
    e21: calcEMA(prices, 21),
    e50: calcEMA(prices, 50),
    rsi: calcRSI(prices, 14),
    macd: calcMACD(prices),
    bb:  calcBollingerBands(prices),
  };
}

export function useMarketData(symbol, timeframe, market = 'spot') {
  const [state, setState] = useState({
    candles:    [],
    chartData:  [],
    ticker:     null,
    inds:       null,
    signal:     null,
    loading:    true,
    error:      null,
    lastUpdate: null,
    market,
  });

  const timerRef  = useRef(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const base = market === 'futures' ? FUTURES_BASE : SPOT_BASE;

    try {
      const [kRes, tRes] = await Promise.all([
        fetch(`${base}/klines?symbol=${symbol.id}&interval=${timeframe.id}&limit=${CANDLE_LIMIT}`),
        fetch(`${base}/ticker/24hr?symbol=${symbol.id}`),
      ]);

      // Futures may not support all symbols — give a clear message
      if (!kRes.ok) {
        const errBody = await kRes.json().catch(() => ({}));
        const msg = errBody?.msg || `HTTP ${kRes.status}`;
        throw new Error(
          market === 'futures' && kRes.status === 400
            ? `${symbol.label} has no futures market on Binance (${msg})`
            : `Candle fetch failed: ${msg}`
        );
      }
      if (!tRes.ok) throw new Error(`Ticker fetch failed: HTTP ${tRes.status}`);

      const [kd, td] = await Promise.all([kRes.json(), tRes.json()]);

      if (!Array.isArray(kd) || kd.length < 60)
        throw new Error('Insufficient candle data');

      const candles   = parseCandles(kd);
      const inds      = computeIndicators(candles);
      const signal    = computeSignal(candles, inds);
      const chartData = buildChartData(candles, inds, 120);

      const ticker = {
        price:    +td.lastPrice,
        change:   +td.priceChangePercent,
        high24:   +td.highPrice,
        low24:    +td.lowPrice,
        volume:   +td.volume,
        trades:   +td.count,
        prevClose:+td.prevClosePrice,
      };

      if (!mountedRef.current) return;
      setState({ candles, chartData, ticker, inds, signal, loading: false, error: null, lastUpdate: new Date(), market });
    } catch (err) {
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch data',
      }));
    }
  }, [symbol, timeframe, market]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(timerRef.current);
    };
  }, [load]);

  return { ...state, refresh: load };
}
