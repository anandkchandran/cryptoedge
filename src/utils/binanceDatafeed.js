/**
 * TradingView Charting Library — Binance datafeed
 * Implements the JS API required by the Charting Library.
 *
 * Docs: https://www.tradingview.com/charting-library-docs/latest/connecting_data/
 */

const SPOT_BASE    = 'https://api.binance.com/api/v3';
const FUTURES_BASE = 'https://fapi.binance.com/fapi/v1';

// TF label → Binance interval string
const TF_MAP = {
  '1':   '1m',  '3':  '3m',  '5':  '5m',  '15': '15m',
  '30':  '30m', '60': '1h',  '120':'2h',  '240':'4h',
  '360': '6h',  '480':'8h',  '720':'12h', 'D':  '1d',
  '1D':  '1d',  '3D': '3d',  'W':  '1w',  '1W': '1w',
};

// Binance interval → milliseconds per bar
const MS_PER_BAR = {
  '1m':  60_000,        '3m':  3*60_000,    '5m':   5*60_000,
  '15m': 15*60_000,     '30m': 30*60_000,   '1h':   3600_000,
  '2h':  2*3600_000,    '4h':  4*3600_000,  '6h':   6*3600_000,
  '8h':  8*3600_000,    '12h': 12*3600_000, '1d':   86400_000,
  '3d':  3*86400_000,   '1w':  7*86400_000,
};

async function fetchKlines(base, symbol, interval, from, to, limit = 1000) {
  const params = new URLSearchParams({
    symbol, interval, limit,
    startTime: from * 1000,
    endTime:   to   * 1000,
  });
  const res  = await fetch(`${base}/klines?${params}`);
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  return res.json();
}

function parseBars(raw) {
  return raw.map(d => ({
    time:   d[0] / 1000,
    open:   +d[1],
    high:   +d[2],
    low:    +d[3],
    close:  +d[4],
    volume: +d[5],
  }));
}

// ── Datafeed class ────────────────────────────────────────────────────────────
export class BinanceDatafeed {
  constructor(market = 'spot') {
    this.market      = market;
    this.base        = market === 'futures' ? FUTURES_BASE : SPOT_BASE;
    this._subs       = {}; // subscriberUID → interval handle
    this._lastBars   = {};
  }

  onReady(callback) {
    setTimeout(() => callback({
      supported_resolutions: ['1','3','5','15','30','60','120','240','360','480','720','1D','3D','1W'],
      exchanges: [{ value: 'BINANCE', name: 'Binance', desc: 'Binance' }],
      symbols_types: [{ name: 'crypto', value: 'crypto' }],
    }), 0);
  }

  searchSymbols(_userInput, _exchange, _symbolType, onResult) {
    // Minimal implementation — symbol picker is in our own header
    onResult([]);
  }

  resolveSymbol(symbolName, onResolved, onError) {
    // Normalise: accept both "BTCUSDT" and "BINANCE:BTCUSDT"
    const ticker = symbolName.replace(/^[^:]+:/, '');
    const isStable = ticker.endsWith('USDT') || ticker.endsWith('BUSD');

    setTimeout(() => onResolved({
      name:               ticker,
      full_name:          `BINANCE:${ticker}`,
      description:        ticker,
      type:               'crypto',
      session:            '24x7',
      timezone:           'Etc/UTC',
      ticker,
      exchange:           'BINANCE',
      minmov:             1,
      pricescale:         ticker.includes('BTC') ? 100 : 10000,
      has_intraday:       true,
      has_daily:          true,
      has_weekly_and_monthly: true,
      supported_resolutions: ['1','3','5','15','30','60','120','240','360','480','720','1D','3D','1W'],
      volume_precision:   2,
      data_status:        'streaming',
    }), 0);
  }

  async getBars(symbolInfo, resolution, periodParams, onHistory, onError) {
    const interval = TF_MAP[resolution] || '1h';
    const { from, to, firstDataRequest } = periodParams;

    try {
      const raw  = await fetchKlines(this.base, symbolInfo.ticker, interval, from, to);
      const bars = parseBars(raw);

      if (bars.length > 0) {
        this._lastBars[symbolInfo.ticker] = bars[bars.length - 1];
      }

      onHistory(bars, { noData: bars.length === 0 });
    } catch (err) {
      onError(err.message);
    }
  }

  subscribeBars(symbolInfo, resolution, onTick, subscriberUID) {
    const interval = TF_MAP[resolution] || '1h';
    const ms       = MS_PER_BAR[interval] || 60_000;
    const pollMs   = Math.min(ms / 2, 5_000); // poll at half bar duration, max 5s

    const poll = async () => {
      try {
        const now  = Math.floor(Date.now() / 1000);
        const raw  = await fetchKlines(this.base, symbolInfo.ticker, interval, now - ms * 2 / 1000, now + 60, 3);
        const bars = parseBars(raw);
        if (bars.length === 0) return;

        const latest = bars[bars.length - 1];
        const last   = this._lastBars[symbolInfo.ticker];

        if (!last || latest.time > last.time) {
          this._lastBars[symbolInfo.ticker] = latest;
          onTick(latest);
        } else if (latest.close !== last.close) {
          this._lastBars[symbolInfo.ticker] = { ...last, ...latest };
          onTick({ ...last, ...latest });
        }
      } catch {}
    };

    this._subs[subscriberUID] = setInterval(poll, pollMs);
    poll();
  }

  unsubscribeBars(subscriberUID) {
    clearInterval(this._subs[subscriberUID]);
    delete this._subs[subscriberUID];
  }
}
