import { useState, useEffect, useCallback, useMemo } from "react";

// To run locally:
// 1. npx create-react-app crypto-terminal
// 2. Replace src/App.js content with this file
// 3. npm start
// Note: TradingView iframe requires internet. CoinDCX is a public API — no auth needed.

const PAIRS = [
  { sym: "BTCUSDT", base: "BTC", name: "Bitcoin",   seed: 94820  },
  { sym: "ETHUSDT", base: "ETH", name: "Ethereum",  seed: 3240   },
  { sym: "SOLUSDT", base: "SOL", name: "Solana",    seed: 168.4  },
  { sym: "BNBUSDT", base: "BNB", name: "BNB",       seed: 605    },
  { sym: "XRPUSDT", base: "XRP", name: "Ripple",    seed: 0.578  },
  { sym: "ADAUSDT", base: "ADA", name: "Cardano",   seed: 0.648  },
  { sym: "AVAXUSDT",base: "AVAX",name: "Avalanche", seed: 39.6   },
  { sym: "LINKUSDT",base: "LINK",name: "Chainlink", seed: 19.4   },
  { sym: "DOGEUSDT",base: "DOGE",name: "Dogecoin",  seed: 0.182  },
  { sym: "DOTUSDT", base: "DOT", name: "Polkadot",  seed: 8.9    },
  { sym: "SUIUSDT", base: "SUI", name: "Sui",       seed: 3.91   },
  { sym: "UNIUSDT", base: "UNI", name: "Uniswap",   seed: 11.2   },
];

const TIMEFRAMES = [
  ["1",   "1m"],
  ["5",   "5m"],
  ["15",  "15m"],
  ["60",  "1H"],
  ["240", "4H"],
  ["D",   "1D"],
  ["W",   "1W"],
];

// Decimal precision based on price magnitude
function dp(p) {
  return p < 0.01 ? 6 : p < 1 ? 4 : 2;
}
function fmtP(n) {
  const v = parseFloat(n || 0);
  return v.toFixed(dp(v));
}

// Deterministic mock ticker (seeded by symbol so values are stable across renders)
function genMock(pair) {
  const sc = pair.sym.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const jitter = 0.97 + ((sc % 7) / 100);
  const price = pair.seed * jitter;
  const chg = (((sc * 13) % 240) - 80) / 10;
  const d = dp(price);
  return {
    last_price:       price.toFixed(d),
    change_24_hour:   chg.toFixed(2),
    high:             (price * 1.04).toFixed(d),
    low:              (price * 0.96).toFixed(d),
    volume:           ((sc % 900) + 200).toFixed(2),
    bid:              (price * 0.9995).toFixed(d),
    ask:              (price * 1.0005).toFixed(d),
  };
}

// Deterministic mock order book
function genOB(price) {
  const d = dp(price);
  const bids = Array.from({ length: 10 }, (_, i) => ({
    p: (price * (1 - 0.001 * (i + 1))).toFixed(d),
    q: (1.5 - i * 0.1 + 0.05).toFixed(4),
  }));
  const asks = Array.from({ length: 10 }, (_, i) => ({
    p: (price * (1 + 0.001 * (i + 1))).toFixed(d),
    q: (1.4 - i * 0.09 + 0.05).toFixed(4),
  }));
  return { bids, asks };
}

// Skeleton.css inline injection (avoids needing a separate index.html change)
const SKELETON_CSS = `
  * { box-sizing: border-box; }
  .container { max-width: 100% !important; width: 100% !important; padding: 0 8px !important; }
  .row { margin-bottom: 0 !important; }
  .columns { padding: 0 5px !important; }
  .mkt-row { padding: 5px 8px; cursor: pointer; border-left: 2px solid transparent; font-size: 12px; line-height: 1.3; }
  .mkt-row:hover { background: #f1efe8; }
  .mkt-row.act { background: #e6f1fb; border-left-color: #185fa5; }
  .tf-btn { padding: 2px 8px !important; height: auto !important; line-height: 1.6 !important; font-size: 11px !important; margin: 0 2px 0 0 !important; min-width: 0 !important; }
  .tf-btn.act { background: #185fa5 !important; color: #fff !important; border-color: #185fa5 !important; }
  .pnl-btn { padding: 4px 10px !important; height: auto !important; line-height: 1.5 !important; font-size: 12px !important; margin: 0 4px 0 0 !important; min-width: 0 !important; }
  .pnl-btn.act { background: #185fa5 !important; color: #fff !important; border-color: #185fa5 !important; }
  .srow { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #d3d1c7; font-size: 12px; }
  .badge { font-size: 10px; padding: 2px 7px; border-radius: 20px; font-weight: 500; display: inline-block; }
  .lbl { font-size: 10px; font-weight: 500; letter-spacing: .06em; color: #5f5e5a; margin: 10px 0 4px; text-transform: uppercase; }
  .ob-row { display: grid; grid-template-columns: 1fr 1fr; font-size: 11px; padding: 1px 8px; position: relative; }
  .ob-bar { position: absolute; top: 0; bottom: 0; right: 0; opacity: .2; border-radius: 2px; }
  .rbar { height: 5px; border-radius: 3px; background: #d3d1c7; overflow: hidden; margin-top: 3px; }
  .rfill { height: 100%; border-radius: 3px; }
  input[type=text] { height: 28px !important; padding: 2px 8px !important; font-size: 12px !important; margin-bottom: 6px !important; border-radius: 4px; }
`;

export default function App() {
  const [sel,    setSel   ] = useState(PAIRS[0]);
  const [tmap,   setTmap  ] = useState({});
  const [ob,     setOb    ] = useState({ bids: [], asks: [] });
  const [tf,     setTf    ] = useState("60");
  const [panel,  setPanel ] = useState("stats");
  const [mode,   setMode  ] = useState("init");
  const [search, setSearch] = useState("");
  const [upd,    setUpd   ] = useState(null);

  // Inject Skeleton.css + custom overrides once on mount
  useEffect(() => {
    const skeletonLink = document.createElement("link");
    skeletonLink.rel = "stylesheet";
    skeletonLink.href = "https://cdnjs.cloudflare.com/ajax/libs/skeleton/2.0.4/skeleton.min.css";
    document.head.appendChild(skeletonLink);

    const styleEl = document.createElement("style");
    styleEl.textContent = SKELETON_CSS;
    document.head.appendChild(styleEl);

    return () => {
      try { document.head.removeChild(skeletonLink); } catch (_) {}
      try { document.head.removeChild(styleEl);      } catch (_) {}
    };
  }, []);

  // --- Data fetching ---

  const loadMock = useCallback(() => {
    const m = {};
    PAIRS.forEach(p => { m[p.sym] = genMock(p); });
    setTmap(m);
    setMode("demo");
    setUpd(new Date());
  }, []);

  const fetchTicker = useCallback(async () => {
    setMode("loading");
    try {
      const res = await fetch("https://api.coindcx.com/exchange/ticker");
      if (!res.ok) throw new Error("non-ok");
      const data = await res.json();
      const m = {};
      data.forEach(t => { m[t.market] = t; });
      if (!m["BTCUSDT"]) throw new Error("missing pairs");
      setTmap(m);
      setMode("live");
      setUpd(new Date());
    } catch (_) {
      loadMock();
    }
  }, [loadMock]);

  const fetchOrderBook = useCallback(async (pair, tm) => {
    const t = tm[pair.sym] || {};
    const price = parseFloat(t.last_price || pair.seed);
    try {
      const res = await fetch(
        `https://public.coindcx.com/market_data/orderbook?pair=B-${pair.base}_USDT`
      );
      const data = await res.json();
      if (!data.bids || !data.asks) throw new Error("bad format");
      const d = dp(price);
      setOb({
        bids: data.bids.slice(0, 10).map(([p, q]) => ({ p: parseFloat(p).toFixed(d), q: parseFloat(q).toFixed(4) })),
        asks: data.asks.slice(0, 10).map(([p, q]) => ({ p: parseFloat(p).toFixed(d), q: parseFloat(q).toFixed(4) })),
      });
    } catch (_) {
      setOb(genOB(price));
    }
  }, []);

  // Initial load
  useEffect(() => { fetchTicker(); }, []);

  // Re-fetch order book whenever pair or ticker changes
  useEffect(() => {
    if (Object.keys(tmap).length > 0) fetchOrderBook(sel, tmap);
  }, [sel.sym, tmap]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const timer = window.setInterval(fetchTicker, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // --- Derived values ---

  const tick  = tmap[sel.sym] || {};
  const price = parseFloat(tick.last_price || sel.seed || 0);
  const chg   = parseFloat(tick.change_24_hour || 0);
  const isUp  = chg >= 0;

  // Stable approximate RSI (seeded by symbol + change direction)
  const rsi = useMemo(() => {
    const sc   = sel.sym.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const base = chg > 10 ? 71 : chg > 5 ? 62 : chg > 0 ? 52 : chg > -5 ? 42 : 30;
    return Math.min(95, Math.max(15, base + (sc % 7)));
  }, [sel.sym, chg]);

  const rsiColor = rsi > 70 ? "#a32d2d" : rsi < 35 ? "#185fa5" : "#3b6d11";
  const signal   = rsi > 70 ? "Short caution" : rsi < 35 ? "Long setup" : isUp ? "Hold / Watch" : "Wait";
  const sigBg    = rsi > 70 ? "#fcebeb" : rsi < 35 ? "#e1f5ee" : isUp ? "#e6f1fb" : "#faeeda";
  const sigC     = rsi > 70 ? "#a32d2d" : rsi < 35 ? "#0f6e56" : isUp ? "#185fa5" : "#ba7517";

  const filtered = PAIRS.filter(p =>
    p.base.toLowerCase().includes(search.toLowerCase()) ||
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const maxQty = Math.max(
    ...ob.bids.map(b => parseFloat(b.q)),
    ...ob.asks.map(a => parseFloat(a.q)),
    0.01
  );

  const tvUrl = `https://s.tradingview.com/widgetembed/?symbol=BINANCE%3A${sel.sym}&interval=${tf}&theme=light&style=1&locale=en&withdateranges=1&hidesidetoolbar=0&hidetoptoolbar=0&save_image=0`;

  // Badge style for data mode indicator
  const modeBadge = {
    live:    { bg: "#eaf3de", color: "#3b6d11", label: "Live data"    },
    demo:    { bg: "#faeeda", color: "#ba7517", label: "Demo data"    },
    loading: { bg: "#f1efe8", color: "#888780", label: "Loading…"     },
    init:    { bg: "#f1efe8", color: "#888780", label: "Initializing" },
  }[mode] || {};

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", paddingBottom: "12px" }}>

      {/* ── Top bar ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #d3d1c7", padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "15px", fontWeight: "500" }}>CoinDCX × TradingView</span>
          <span className="badge" style={{ background: modeBadge.bg, color: modeBadge.color }}>
            {modeBadge.label}
          </span>
          {upd && <span style={{ fontSize: "10px", color: "#888780" }}>{upd.toLocaleTimeString()}</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "17px", fontWeight: "500" }}>${fmtP(price)}</div>
            <div style={{ fontSize: "11px", color: isUp ? "#3b6d11" : "#a32d2d" }}>
              {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{chg.toFixed(2)}% (24h)
            </div>
          </div>
          <button className="button" onClick={fetchTicker} style={{ padding: "5px 12px", height: "auto", lineHeight: "1.4", margin: 0, fontSize: "12px" }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      <div className="container">
        <div className="row">

          {/* ── Market list — 3 cols ── */}
          <div className="three columns">
            <div style={{ border: "1px solid #d3d1c7", borderRadius: "4px", height: "500px", display: "flex", flexDirection: "column", background: "#fff" }}>
              <div style={{ padding: "8px 8px 4px" }}>
                <div className="lbl" style={{ marginTop: 4 }}>Markets</div>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search pair…"
                  style={{ width: "100%" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 46px", padding: "0 0 2px", gap: "4px" }}>
                  {["Pair", "Price", "24h"].map(h => (
                    <span key={h} style={{ fontSize: "10px", color: "#888780" }}>{h}</span>
                  ))}
                </div>
              </div>
              <div style={{ overflow: "auto", flex: 1 }}>
                {filtered.map(p => {
                  const t  = tmap[p.sym] || {};
                  const pr = parseFloat(t.last_price || 0);
                  const ch = parseFloat(t.change_24_hour || 0);
                  return (
                    <div key={p.sym} className={`mkt-row${sel.sym === p.sym ? " act" : ""}`} onClick={() => setSel(p)}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 50px 46px", gap: "4px", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "500", fontSize: "12px" }}>{p.base}</div>
                          <div style={{ fontSize: "10px", color: "#888780" }}>{p.name}</div>
                        </div>
                        <div style={{ fontSize: "11px", textAlign: "right" }}>
                          {pr > 0 ? pr.toFixed(dp(pr)) : "—"}
                        </div>
                        <div style={{ fontSize: "11px", textAlign: "right", color: ch >= 0 ? "#3b6d11" : "#a32d2d" }}>
                          {pr > 0 ? `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%` : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── TradingView chart — 6 cols ── */}
          <div className="six columns">
            {/* Timeframe selector */}
            <div style={{ background: "#fff", border: "1px solid #d3d1c7", borderRadius: "4px", padding: "6px 8px", marginBottom: "6px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "2px" }}>
              <span style={{ fontSize: "11px", color: "#888780", marginRight: "6px", fontWeight: "500" }}>
                {sel.sym}
              </span>
              {TIMEFRAMES.map(([v, l]) => (
                <button key={v} className={`button tf-btn${tf === v ? " act" : ""}`} onClick={() => setTf(v)}>
                  {l}
                </button>
              ))}
            </div>
            {/* Chart iframe */}
            <div style={{ border: "1px solid #d3d1c7", borderRadius: "4px", overflow: "hidden", height: "460px", background: "#f9f9f9" }}>
              <iframe
                key={sel.sym + tf}
                src={tvUrl}
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                title={`TradingView chart — ${sel.sym}`}
                allow="fullscreen"
              />
            </div>
          </div>

          {/* ── Right panel — 3 cols ── */}
          <div className="three columns">
            <div style={{ border: "1px solid #d3d1c7", borderRadius: "4px", height: "500px", display: "flex", flexDirection: "column", background: "#fff" }}>
              {/* Panel tab buttons */}
              <div style={{ padding: "8px", borderBottom: "1px solid #d3d1c7", display: "flex", gap: "4px" }}>
                <button className={`button pnl-btn${panel === "stats" ? " act" : ""}`} onClick={() => setPanel("stats")}>Stats</button>
                <button className={`button pnl-btn${panel === "ob"    ? " act" : ""}`} onClick={() => setPanel("ob")}>Order book</button>
              </div>

              {/* Stats panel */}
              {panel === "stats" && (
                <div style={{ padding: "12px", overflow: "auto", flex: 1 }}>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "11px", color: "#888780" }}>{sel.name} / USDT</div>
                    <div style={{ fontSize: "22px", fontWeight: "500", marginTop: "2px" }}>${fmtP(price)}</div>
                    <div style={{ fontSize: "12px", color: isUp ? "#3b6d11" : "#a32d2d" }}>
                      {isUp ? "+" : ""}{chg.toFixed(2)}% 24h
                    </div>
                  </div>

                  <div className="lbl">Market data</div>
                  {[
                    ["24h High", tick.high,   "#3b6d11"],
                    ["24h Low",  tick.low,    "#a32d2d"],
                    ["Volume",   tick.volume ? `${parseFloat(tick.volume).toLocaleString()} ${sel.base}` : null, null],
                    ["Bid",      tick.bid,    "#3b6d11"],
                    ["Ask",      tick.ask,    "#a32d2d"],
                  ].map(([label, val, color]) => (
                    <div key={label} className="srow">
                      <span style={{ color: "#888780" }}>{label}</span>
                      <span style={{ fontWeight: "500", color: color || "inherit" }}>
                        {val ? (label === "Volume" ? val : fmtP(val)) : "—"}
                      </span>
                    </div>
                  ))}

                  <div className="lbl" style={{ marginTop: "14px" }}>Technical signals</div>
                  <div className="srow">
                    <span style={{ color: "#888780" }}>RSI (14)</span>
                    <span style={{ fontWeight: "500", color: rsiColor }}>{rsi}</span>
                  </div>
                  <div className="rbar">
                    <div className="rfill" style={{ width: `${rsi}%`, background: rsiColor }} />
                  </div>
                  <div className="srow" style={{ marginTop: "4px" }}>
                    <span style={{ color: "#888780" }}>MACD</span>
                    <span style={{ color: isUp ? "#3b6d11" : "#a32d2d" }}>{isUp ? "Bullish" : "Bearish"}</span>
                  </div>
                  <div className="srow">
                    <span style={{ color: "#888780" }}>Trend</span>
                    <span style={{ color: isUp ? "#3b6d11" : "#a32d2d" }}>
                      {chg > 7 ? "Strong up" : chg > 2 ? "Uptrend" : chg > -2 ? "Neutral" : "Downtrend"}
                    </span>
                  </div>
                  <div className="srow">
                    <span style={{ color: "#888780" }}>Signal</span>
                    <span className="badge" style={{ background: sigBg, color: sigC }}>{signal}</span>
                  </div>
                </div>
              )}

              {/* Order book panel */}
              {panel === "ob" && (
                <div style={{ flex: 1, overflow: "auto", padding: "6px 0" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "2px 10px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "10px", color: "#888780" }}>Price (USDT)</span>
                    <span style={{ fontSize: "10px", color: "#888780", textAlign: "right" }}>Qty</span>
                  </div>
                  {/* Asks (sells) — reversed so lowest ask is nearest the mid price */}
                  {[...ob.asks].reverse().map((a, i) => (
                    <div key={`a${i}`} className="ob-row">
                      <div className="ob-bar" style={{ width: `${Math.min(parseFloat(a.q) / maxQty * 100, 100)}%`, background: "#a32d2d" }} />
                      <span style={{ color: "#a32d2d", position: "relative", zIndex: 1 }}>{a.p}</span>
                      <span style={{ color: "#888780", textAlign: "right", position: "relative", zIndex: 1 }}>{a.q}</span>
                    </div>
                  ))}
                  {/* Mid price */}
                  <div style={{ padding: "4px 10px", margin: "3px 0", borderTop: "1px solid #d3d1c7", borderBottom: "1px solid #d3d1c7", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "13px", fontWeight: "500", color: isUp ? "#3b6d11" : "#a32d2d" }}>${fmtP(price)}</span>
                    <span style={{ fontSize: "10px", color: "#888780" }}>Last</span>
                  </div>
                  {/* Bids (buys) */}
                  {ob.bids.map((b, i) => (
                    <div key={`b${i}`} className="ob-row">
                      <div className="ob-bar" style={{ width: `${Math.min(parseFloat(b.q) / maxQty * 100, 100)}%`, background: "#3b6d11" }} />
                      <span style={{ color: "#3b6d11", position: "relative", zIndex: 1 }}>{b.p}</span>
                      <span style={{ color: "#888780", textAlign: "right", position: "relative", zIndex: 1 }}>{b.q}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom ticker strip ── */}
        <div className="row" style={{ marginTop: "8px" }}>
          <div className="twelve columns">
            <div style={{ background: "#fff", border: "1px solid #d3d1c7", borderRadius: "4px", padding: "6px 12px", display: "flex", overflowX: "auto" }}>
              {PAIRS.map((p, i) => {
                const t  = tmap[p.sym] || {};
                const pr = parseFloat(t.last_price || 0);
                const ch = parseFloat(t.change_24_hour || 0);
                return (
                  <div
                    key={p.sym}
                    onClick={() => setSel(p)}
                    style={{ cursor: "pointer", minWidth: "80px", flexShrink: 0, borderRight: i < PAIRS.length - 1 ? "1px solid #d3d1c7" : "none", padding: "0 10px", textAlign: "center" }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: "500" }}>{p.base}</div>
                    <div style={{ fontSize: "11px" }}>{pr > 0 ? `$${pr.toFixed(dp(pr))}` : "—"}</div>
                    <div style={{ fontSize: "10px", color: ch >= 0 ? "#3b6d11" : "#a32d2d" }}>
                      {pr > 0 ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
