import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const TV_INTERVAL = {
  '1m': '1',  '3m': '3',   '5m': '5',
  '15m':'15', '30m':'30',
  '1h': '60', '2h': '120', '4h': '240',
  '6h': '360','8h': '480', '12h':'720',
  '1d': 'D',  '3d': '3D',  '1w': 'W',
};

export default function TradingViewWidget({ symbol, timeframe, market = 'spot' }) {
  const { theme } = useTheme();

  const tvSymbol = market === 'futures' && symbol.tvFutures
    ? symbol.tvFutures
    : symbol.tv;

  const interval = TV_INTERVAL[timeframe.id] || '60';
  const isDark   = theme === 'dark';

  // Build the Advanced Real-Time Chart widget URL.
  // - No hardcoded `studies` param → TradingView loads the logged-in user's
  //   saved indicators and chart preferences automatically via session cookie.
  // - `timezone=exchange` shows candles in exchange local time.
  // - `show_popup_button=1` lets the user pop-out to their full TV account.
  const params = new URLSearchParams({
    symbol:              tvSymbol,
    interval,
    theme:               isDark ? 'dark' : 'light',
    style:               '1',
    locale:              'en',
    toolbar_bg:          isDark ? '#101520' : '#f8fafc',
    hide_top_toolbar:    '0',
    hide_legend:         '0',
    withdateranges:      '1',
    hide_volume:         '0',
    save_image:          '1',
    allow_symbol_change: '0',
    timezone:            'exchange',
    show_popup_button:   '1',
    popup_width:         '1000',
    popup_height:        '650',
    // No `studies` key — lets TradingView load the user's account indicators
  });

  const src = `https://www.tradingview.com/widgetembed/?${params.toString()}`;

  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #1c2740' }}>
      <iframe
        key={src}
        src={src}
        title={`TradingView ${symbol.label} ${timeframe.label}`}
        width="100%"
        height="560"
        frameBorder="0"
        allowTransparency="true"
        scrolling="no"
        referrerPolicy="no-referrer-when-downgrade"
        allow="fullscreen; clipboard-write; clipboard-read"
        style={{ display: 'block' }}
      />
    </div>
  );
}
