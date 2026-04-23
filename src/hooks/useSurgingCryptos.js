import { useState, useEffect, useRef, useCallback } from 'react';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Tokens to exclude from surging list
const STABLECOIN_RE = /^(USDT|BUSD|USDC|DAI|TUSD|FDUSD|USDP|GUSD|FRAX|LUSD|EURC|USDD|SUSD)/i;
const LEVERAGE_RE   = /^(UP|DOWN|BEAR|BULL|3L|3S|5L|5S|2L|2S)(USDT|BUSD)$/i;
const JUNK_RE       = /^(BVND|NGN|TRY|BRL|RUB|EUR|GBP|AUD)/i;

function filterAndSort(tickers) {
  return tickers
    .filter(t => {
      if (!t.symbol.endsWith('USDT'))   return false;
      if (STABLECOIN_RE.test(t.symbol)) return false;
      if (LEVERAGE_RE.test(t.symbol))   return false;
      if (JUNK_RE.test(t.symbol))       return false;
      if (parseFloat(t.quoteVolume) < 1_000_000) return false; // min $1M 24h volume
      return true;
    })
    .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
    .slice(0, 20)
    .map((t, i) => ({
      rank:    i + 1,
      id:      t.symbol,
      label:   t.symbol.replace('USDT', '/USDT'),
      tv:      `BINANCE:${t.symbol}`,
      price:   parseFloat(t.lastPrice),
      change:  parseFloat(t.priceChangePercent),
      volume:  parseFloat(t.quoteVolume),
    }));
}

export default function useSurgingCryptos() {
  const [surging,     setSurging]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const timerRef = useRef(null);

  const fetch24hr = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res  = await fetch('https://api.binance.com/api/v3/ticker/24hr');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSurging(filterAndSort(data));
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch24hr();
    timerRef.current = setInterval(fetch24hr, REFRESH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch24hr]);

  return { surging, loading, error, lastRefresh, refresh: fetch24hr };
}
