export const SYMBOLS = [
  { label: 'BTC/USDT',   id: 'BTCUSDT',   tv: 'BINANCE:BTCUSDT',   tvFutures: 'BINANCE:BTCUSDTPERP'   },
  { label: 'ETH/USDT',   id: 'ETHUSDT',   tv: 'BINANCE:ETHUSDT',   tvFutures: 'BINANCE:ETHUSDTPERP'   },
  { label: 'SOL/USDT',   id: 'SOLUSDT',   tv: 'BINANCE:SOLUSDT',   tvFutures: 'BINANCE:SOLUSDTPERP'   },
  { label: 'SUI/USDT',   id: 'SUIUSDT',   tv: 'BINANCE:SUIUSDT',   tvFutures: 'BINANCE:SUIUSDTPERP'   },
  { label: 'PENGU/USDT', id: 'PENGUUSDT', tv: 'BINANCE:PENGUUSDT', tvFutures: null                    },
  { label: 'BNB/USDT',   id: 'BNBUSDT',   tv: 'BINANCE:BNBUSDT',   tvFutures: 'BINANCE:BNBUSDTPERP'   },
  { label: 'XRP/USDT',   id: 'XRPUSDT',   tv: 'BINANCE:XRPUSDT',   tvFutures: 'BINANCE:XRPUSDTPERP'   },
  { label: 'ADA/USDT',   id: 'ADAUSDT',   tv: 'BINANCE:ADAUSDT',   tvFutures: 'BINANCE:ADAUSDTPERP'   },
  { label: 'DOGE/USDT',  id: 'DOGEUSDT',  tv: 'BINANCE:DOGEUSDT',  tvFutures: 'BINANCE:DOGEUSDTPERP'  },
  { label: 'AVAX/USDT',  id: 'AVAXUSDT',  tv: 'BINANCE:AVAXUSDT',  tvFutures: 'BINANCE:AVAXUSDTPERP'  },
  { label: 'MATIC/USDT', id: 'MATICUSDT', tv: 'BINANCE:MATICUSDT', tvFutures: 'BINANCE:MATICUSDTPERP' },
  { label: 'DOT/USDT',   id: 'DOTUSDT',   tv: 'BINANCE:DOTUSDT',   tvFutures: 'BINANCE:DOTUSDTPERP'   },
  { label: 'DASH/USDT',  id: 'DASHUSDT',  tv: 'BINANCE:DASHUSDT',  tvFutures: 'BINANCE:DASHUSDTPERP'  },
];

export const TIMEFRAMES = [
  { label: '1m',  id: '1m',  tv: '1'   },
  { label: '5m',  id: '5m',  tv: '5'   },
  { label: '15m', id: '15m', tv: '15'  },
  { label: '1h',  id: '1h',  tv: '60'  },
  { label: '4h',  id: '4h',  tv: '240' },
  { label: '1D',  id: '1d',  tv: 'D'   },
];

export const COLORS = {
  bg:       '#0b0f1a',
  card:     '#101520',
  border:   '#1c2740',
  muted:    '#3a5270',
  text:     '#b8cce0',
  bright:   '#ddeeff',
  price:    '#3b82f6',
  ema9:     '#fbbf24',
  ema21:    '#f97316',
  ema50:    '#a78bfa',
  bb:       '#2a4060',
  rsi:      '#f97316',
  macd:     '#3b82f6',
  signal:   '#f85149',
  bull:     '#10d67a',
  bear:     '#f85149',
  neutral:  '#d4a017',
  grid:     '#131e30',
};

export const REFRESH_INTERVAL = 30000; // 30 seconds
export const CANDLE_LIMIT = 250;
