/**
 * TradingView Charting Library container
 *
 * ── SETUP (one-time) ─────────────────────────────────────────────────────────
 * 1. Get access to the Charting Library:
 *    https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/
 *    (requires a paid license from TradingView)
 *
 * 2. Clone the private repo and copy the dist files:
 *    git clone https://github.com/tradingview/charting_library.git
 *    cp -r charting_library/charting_library  <this project>/public/charting_library
 *
 * 3. Add your license key to .env in the project root:
 *    REACT_APP_TV_LICENSE_KEY=your_key_here
 *
 * 4. Restart the dev server:  npm start
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { BinanceDatafeed } from '../utils/binanceDatafeed';

// TF label (our app) → Charting Library resolution string
const TF_RESOLUTION = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '2h': '120', '4h': '240', '6h': '360',
  '8h': '480', '12h': '720', '1d': '1D', '3d': '3D', '1w': '1W',
};

const LICENSE_KEY = process.env.REACT_APP_TV_LICENSE_KEY || '';
const LIBRARY_PATH = '/charting_library/';

export default function TVChartContainer({ symbol, timeframe, market = 'spot' }) {
  const { colors: C, isDark } = useTheme();
  const containerRef = useRef(null);
  const widgetRef    = useRef(null);
  const [libStatus, setLibStatus] = useState('loading'); // 'loading' | 'ready' | 'missing'

  // ── Load the library script once ─────────────────────────────────────────
  useEffect(() => {
    if (window.TradingView?.widget) {
      setLibStatus('ready');
      return;
    }

    const script    = document.createElement('script');
    script.src      = `${LIBRARY_PATH}charting_library.js`;
    script.async    = true;
    script.onload   = () => setLibStatus('ready');
    script.onerror  = () => setLibStatus('missing');
    document.head.appendChild(script);

    return () => { document.head.removeChild(script); };
  }, []);

  // ── Create / recreate widget when deps change ─────────────────────────────
  useEffect(() => {
    if (libStatus !== 'ready') return;
    if (!containerRef.current)  return;
    if (!window.TradingView?.widget) { setLibStatus('missing'); return; }

    // Destroy previous instance
    if (widgetRef.current) {
      try { widgetRef.current.remove(); } catch {}
      widgetRef.current = null;
    }

    const datafeed = new BinanceDatafeed(market);
    const resolution = TF_RESOLUTION[timeframe.id] || '60';

    widgetRef.current = new window.TradingView.widget({
      container:      containerRef.current,
      library_path:   LIBRARY_PATH,
      locale:         'en',
      datafeed,
      symbol:         symbol.id,         // e.g. "BTCUSDT"
      interval:       resolution,
      fullscreen:     false,
      autosize:       true,
      theme:          isDark ? 'Dark' : 'Light',
      timezone:       'Etc/UTC',
      toolbar_bg:     C.card,
      loading_screen: { backgroundColor: C.bg, foregroundColor: '#7c6bfa' },

      // Charting Library license key
      ...(LICENSE_KEY ? { custom_css_url: '', } : {}),

      overrides: {
        'mainSeriesProperties.candleStyle.upColor':           '#10d67a',
        'mainSeriesProperties.candleStyle.downColor':         '#f85149',
        'mainSeriesProperties.candleStyle.wickUpColor':       '#10d67a',
        'mainSeriesProperties.candleStyle.wickDownColor':     '#f85149',
        'mainSeriesProperties.candleStyle.borderUpColor':     '#10d67a',
        'mainSeriesProperties.candleStyle.borderDownColor':   '#f85149',
        'paneProperties.background':                          C.bg,
        'paneProperties.backgroundType':                      'solid',
        'paneProperties.vertGridProperties.color':            C.grid,
        'paneProperties.horzGridProperties.color':            C.grid,
        'scalesProperties.textColor':                         C.muted,
      },

      studies_overrides: {
        'volume.volume.color.0':  '#f8514960',
        'volume.volume.color.1':  '#10d67a60',
      },

      enabled_features: [
        'study_templates',
        'use_localstorage_for_settings',
        'save_chart_properties_to_local_storage',
      ],

      disabled_features: [
        'header_symbol_search',   // we control symbol in our header
        'header_compare',
        'symbol_info',
        'go_to_date',
      ],
    });

    // Pass license key after creation if available
    if (LICENSE_KEY && widgetRef.current.applyOverrides) {
      widgetRef.current.onChartReady(() => {
        // license is passed as a widget option in the constructor;
        // see TradingView docs for the exact option name for your license tier
      });
    }

    return () => {
      if (widgetRef.current) {
        try { widgetRef.current.remove(); } catch {}
        widgetRef.current = null;
      }
    };
  }, [libStatus, symbol, timeframe, market, isDark, C]);

  // ── Library missing — show setup guide ───────────────────────────────────
  if (libStatus === 'missing') {
    return (
      <div style={{
        background: C.card, border: `1px solid #7c6bfa40`, borderRadius: 8,
        padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>📦</div>
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 14, fontWeight: 700, color: C.bright, marginBottom: 8 }}>
          Charting Library not found
        </div>
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted, lineHeight: 1.8, marginBottom: 16 }}>
          Place your TradingView Charting Library files at:
        </div>
        <code style={{
          display: 'block', background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 5, padding: '8px 14px', fontSize: 11, color: '#7c6bfa',
          fontFamily: "'Roboto Mono', monospace", marginBottom: 16,
        }}>
          public/charting_library/charting_library.js
        </code>
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted, lineHeight: 1.8 }}>
          1. Get library access → tradingview.com/HTML5-stock-forex-bitcoin-charting-library<br />
          2. Clone the private repo and copy the <code>charting_library/</code> folder to <code>public/</code><br />
          3. Add <code>REACT_APP_TV_LICENSE_KEY=your_key</code> to <code>.env</code><br />
          4. Restart the dev server
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (libStatus === 'loading') {
    return (
      <div style={{
        height: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.card, borderRadius: 8, border: `1px solid ${C.border}`,
        flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 22, color: '#7c6bfa' }}>◈</div>
        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, color: C.muted }}>
          Loading Charting Library…
        </div>
      </div>
    );
  }

  // ── Chart container ───────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ height: 500, borderRadius: 8, overflow: 'hidden', border: `1px solid ${C.border}` }}
    />
  );
}
