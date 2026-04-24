import { useState, useEffect, useRef, useCallback } from 'react';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

const STABLECOIN_RE = /^(USDT|BUSD|USDC|DAI|TUSD|FDUSD|USDP|GUSD|FRAX|LUSD|EURC|USDD|SUSD)/i;
const LEVERAGE_RE   = /^(UP|DOWN|BEAR|BULL|3L|3S|5L|5S|2L|2S)(USDT|BUSD)$/i;
const JUNK_RE       = /^(BVND|NGN|TRY|BRL|RUB|EUR|GBP|AUD)/i;

function toRow(t, rank, isFutures) {
  const sym = t.symbol;
  return {
    rank,
    id:        sym,
    label:     sym.replace('USDT', '/USDT'),
    tv:        `BINANCE:${sym}`,
    tvFutures: `BINANCE:${sym}PERP`,
    price:     parseFloat(t.lastPrice),
    change:    parseFloat(t.priceChangePercent),
    volume:    parseFloat(t.quoteVolume),
    isFutures,
  };
}

function filterAndRank(tickers, isFutures) {
  const eligible = tickers.filter(t => {
    if (!t.symbol.endsWith('USDT'))   return false;
    if (STABLECOIN_RE.test(t.symbol)) return false;
    if (LEVERAGE_RE.test(t.symbol))   return false;
    if (JUNK_RE.test(t.symbol))       return false;
    if (parseFloat(t.quoteVolume) < (isFutures ? 5_000_000 : 1_000_000)) return false;
    return true;
  });

  const sorted   = [...eligible].sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent));
  const gainers  = sorted.slice(0, 20).map((t, i) => toRow(t, i + 1, isFutures));
  const losers   = sorted.slice(-20).reverse().map((t, i) => toRow(t, i + 1, isFutures));

  return { gainers, losers };
}

// market: 'spot' | 'futures'
export default function useSurgingCryptos(market = 'spot') {
  const [gainers,     setGainers]     = useState([]);
  const [losers,      setLosers]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const timerRef = useRef(null);

  const fetch24hr = useCallback(async () => {
    const isFutures = market === 'futures';
    const url = isFutures
      ? 'https://fapi.binance.com/fapi/v1/ticker/24hr'
      : 'https://api.binance.com/api/v3/ticker/24hr';

    try {
      setLoading(true);
      setError(null);
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const { gainers: g, losers: l } = filterAndRank(data, isFutures);
      setGainers(g);
      setLosers(l);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [market]);

  useEffect(() => {
    setGainers([]);
    setLosers([]);
    fetch24hr();
    timerRef.current = setInterval(fetch24hr, REFRESH_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetch24hr]);

  return { gainers, losers, loading, error, lastRefresh, refresh: fetch24hr };
}
