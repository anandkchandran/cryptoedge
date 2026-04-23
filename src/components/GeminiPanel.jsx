import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice } from '../utils/format';
import { getGeminiAnalysis, abortGeminiAnalysis, GEMINI_MODELS } from '../utils/gemini';

// ── Gemini brand colours ──────────────────────────────────────────────────────
const G_BLUE   = '#4285f4';
const G_RED    = '#ea4335';
const G_YELLOW = '#fbbc05';
const G_GREEN  = '#34a853';

// Cycle through Google colours for the loading dots
const DOT_COLORS = [G_BLUE, G_RED, G_YELLOW, G_GREEN];

const sigColor = (s) => {
  if (!s) return '#d4a017';
  if (s === 'LONG')  return '#10d67a';
  if (s === 'SHORT') return '#f85149';
  return '#d4a017';
};
const recBg = (s) => sigColor(s) + '18';

const agreeBadge = (a = '') => ({
  bg:    a.startsWith('AGREE') ? '#10d67a18' : a.startsWith('DIS') ? '#f8514918' : '#d4a01718',
  color: a.startsWith('AGREE') ? '#10d67a'   : a.startsWith('DIS') ? '#f85149'   : '#d4a017',
});

// ── Sub-components ────────────────────────────────────────────────────────────
const Divider = () => {
  const { colors: C } = useTheme();
  return <div style={{ borderBottom: `1px solid ${C.border}`, margin: '12px 0 10px' }} />;
};

const SectionTitle = ({ children }) => {
  const { colors: C } = useTheme();
  return (
    <div style={{
      fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 1, color: C.muted, marginBottom: 6,
    }}>
      {children}
    </div>
  );
};

// Google-coloured ◆ logo mark
function GeminiLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z"
        fill="url(#gGrad)" />
      <defs>
        <linearGradient id="gGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={G_BLUE}   />
          <stop offset="50%"  stopColor={G_RED}    />
          <stop offset="100%" stopColor={G_YELLOW} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AnalysisResult({ result, market = 'spot' }) {
  const { colors: C } = useTheme();
  if (!result) return null;

  const sig   = result.signal;
  const trade = result.trade || {};
  const pd    = trade.entry > 1000 ? 2 : trade.entry > 10 ? 4 : 6;
  const fp    = (v) => v != null && isFinite(+v) ? fmtPrice(+v, pd) : '—';
  const agree  = result.agreement_with_algo || '';
  const abadge = agreeBadge(agree);

  return (
    <div>
      {/* Signal + confidence */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 22, fontWeight: 800,
          color: sigColor(sig), background: recBg(sig),
          border: `1px solid ${sigColor(sig)}40`,
          padding: '4px 16px', borderRadius: 6, letterSpacing: 1.5,
        }}>
          {sig === 'LONG' ? '▲ LONG' : sig === 'SHORT' ? '▼ SHORT' : '◆ HOLD'}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>Confidence</div>
          <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: sigColor(sig) }}>
            {result.confidence ?? '—'}%
          </div>
        </div>
      </div>

      {/* Algo agreement */}
      {agree && (
        <div style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 10,
          padding: '4px 8px', borderRadius: 4, marginBottom: 10,
          background: abadge.bg, color: abadge.color, border: `1px solid ${abadge.color}30`,
        }}>
          {agree}
        </div>
      )}

      {/* Summary */}
      {result.summary && (
        <>
          <SectionTitle>Summary</SectionTitle>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
            {result.summary}
          </div>
        </>
      )}

      <Divider />

      {/* Trade setup */}
      {sig !== 'HOLD' && trade.entry && (
        <>
          <SectionTitle>Trade Setup</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Entry',     value: `$${fp(trade.entry)}`,     sub: trade.entry_type },
              { label: 'Stop Loss', value: `$${fp(trade.stop_loss)}`, color: '#f85149' },
              { label: 'TP1',       value: `$${fp(trade.tp1)}`,       color: '#10d67a' },
              { label: 'TP2',       value: `$${fp(trade.tp2)}`,       color: '#10d67a' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} style={{
                background: C.bg, borderRadius: 4, padding: '6px 8px',
                border: `1px solid ${color ? color + '30' : C.border}`,
              }}>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: color || C.muted, marginBottom: 2 }}>{label}</div>
                <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: color || C.bright }}>{value}</div>
                {sub && <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>{sub}</div>}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <div style={{ flex: 1, background: C.bg, borderRadius: 4, padding: '6px 8px', border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 2 }}>Risk:Reward</div>
              <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: G_BLUE }}>{trade.risk_reward || '—'}</div>
            </div>
            <div style={{ flex: 1, background: C.bg, borderRadius: 4, padding: '6px 8px', border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 2 }}>Time Horizon</div>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.text }}>{trade.time_horizon || '—'}</div>
            </div>
            <div style={{ flex: 1, background: C.bg, borderRadius: 4, padding: '6px 8px', border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 2 }}>Sizing</div>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.text }}>
                {(result.position_sizing || '—').split('—')[0].trim()}
              </div>
            </div>
          </div>

          {trade.entry_note && (
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted, fontStyle: 'italic', marginBottom: 10 }}>
              💡 {trade.entry_note}
            </div>
          )}
        </>
      )}

      <Divider />

      {/* Key reasons */}
      {result.key_reasons?.length > 0 && (
        <>
          <SectionTitle>Key Reasons</SectionTitle>
          <div style={{ marginBottom: 10 }}>
            {result.key_reasons.map((r, i) => (
              <div key={i} style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.text,
                padding: '4px 0 4px 8px',
                borderLeft: `2px solid ${DOT_COLORS[i % DOT_COLORS.length]}60`,
                marginBottom: 4, lineHeight: 1.5,
              }}>
                {r}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Risks */}
      {result.risks?.length > 0 && (
        <>
          <SectionTitle>Risks</SectionTitle>
          <div style={{ marginBottom: 10 }}>
            {result.risks.map((r, i) => (
              <div key={i} style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted,
                padding: '4px 0 4px 8px', borderLeft: '2px solid #f8514960',
                marginBottom: 4, lineHeight: 1.5,
              }}>
                {r}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Invalidation */}
      {result.invalidation && (
        <div style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 10, color: '#f97316',
          background: '#f9731612', border: '1px solid #f9731630',
          borderRadius: 4, padding: '6px 10px',
        }}>
          ⚡ Invalidation: {result.invalidation}
        </div>
      )}
    </div>
  );
}

// ── Parse retry-after seconds from a 429 message ─────────────────────────────
function parseRetrySeconds(msg = '') {
  const m = msg.match(/retry in (\d+(?:\.\d+)?)/i);
  return m ? Math.ceil(parseFloat(m[1])) + 2 : 62; // +2s buffer; default 62s
}

function is429(msg = '') {
  return msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit');
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GeminiPanel({ symbol, timeframe, ticker, inds, signal, candles, market = 'spot' }) {
  const { colors: C } = useTheme();
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [model,     setModel]     = useState('gemini-2.0-flash');
  const [retryIn,   setRetryIn]   = useState(null); // countdown seconds
  const retryTimer  = useRef(null);
  const pendingData = useRef(null);
  const retryCount  = useRef(0);                    // max 1 auto-retry

  // Countdown + single auto-retry
  useEffect(() => {
    if (retryIn === null) return;
    if (retryIn <= 0) {
      setRetryIn(null);
      if (pendingData.current && retryCount.current < 1) {
        retryCount.current += 1;
        setError(null);
        const d = pendingData.current;
        pendingData.current = null;
        runAnalysis(d.symbol, d.timeframe, d.ticker, d.inds, d.signal, d.candles, d.market, d.model);
      } else {
        // Give up — tell the user to retry manually
        pendingData.current = null;
        setError('Rate limit still active — please try again in a minute.');
      }
      return;
    }
    retryTimer.current = setTimeout(() => setRetryIn(r => r - 1), 1000);
    return () => clearTimeout(retryTimer.current);
  }, [retryIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAnalysis = useCallback(async (sym, tf, tkr, ids, sig, cnd, mkt, mdl) => {
    setLoading(true);
    setError(null);
    setRetryIn(null);
    try {
      const res = await getGeminiAnalysis({ symbol: sym, timeframe: tf, ticker: tkr, inds: ids, signal: sig, candles: cnd, market: mkt }, mdl);
      setResult(res);
      retryCount.current = 0; // reset on success
    } catch (err) {
      if (err.message === 'ABORTED') {
        setError('Analysis cancelled.');
      } else if (is429(err.message) && retryCount.current < 1) {
        const secs = parseRetrySeconds(err.message);
        pendingData.current = { symbol: sym, timeframe: tf, ticker: tkr, inds: ids, signal: sig, candles: cnd, market: mkt, model: mdl };
        setRetryIn(secs);
        setError('rate-limit');
      } else {
        pendingData.current = null;
        setError(is429(err.message)
          ? 'Rate limit still active — please try again in a minute.'
          : err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const analyze = useCallback(() => {
    if (!candles?.length || !inds) return;
    retryCount.current = 0;
    runAnalysis(symbol, timeframe, ticker, inds, signal, candles, market, model);
  }, [symbol, timeframe, ticker, inds, signal, candles, market, model, runAnalysis]);

  const abort = () => {
    abortGeminiAnalysis();
    clearTimeout(retryTimer.current);
    pendingData.current = null;
    setRetryIn(null);
    setLoading(false);
    setError('Analysis cancelled.');
  };

  const sigBadge = result?.signal;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${G_BLUE}30`,
      borderRadius: 8, padding: 16, marginBottom: 10,
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GeminiLogo size={18} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, fontWeight: 700, color: C.bright }}>
                Gemini Analysis
              </span>
              <span style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 8, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: G_BLUE, background: `${G_BLUE}18`,
                border: `1px solid ${G_BLUE}40`, padding: '1px 6px', borderRadius: 3,
              }}>
                Free
              </span>
              {collapsed && sigBadge && (
                <span style={{
                  fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
                  color: sigColor(sigBadge), background: recBg(sigBadge),
                  border: `1px solid ${sigColor(sigBadge)}40`,
                  padding: '1px 7px', borderRadius: 3,
                }}>
                  {sigBadge}
                </span>
              )}
            </div>
            {!collapsed && (
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>
                Google Gemini · AI trade signal · Entry · TP · Stop Loss
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 4, color: C.muted, cursor: 'pointer',
            fontSize: 11, padding: '2px 7px', fontFamily: "'Raleway', sans-serif",
          }}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* ── Model selector + Analyse button ── */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              style={{
                flex: 1, background: C.bg, border: `1px solid ${C.border}`,
                borderRadius: 5, padding: '5px 8px',
                fontFamily: "'Raleway', sans-serif", fontSize: 11,
                color: C.text, cursor: 'pointer',
              }}
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>

            {loading ? (
              <button
                onClick={abort}
                style={{
                  flex: 2, fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 11,
                  padding: '6px 10px', borderRadius: 5, cursor: 'pointer',
                  border: '1px solid #f8514960', background: '#f8514918', color: '#f85149',
                }}
              >
                ■ Stop
              </button>
            ) : (
              <button
                onClick={analyze}
                disabled={!candles?.length}
                style={{
                  flex: 2, fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 11,
                  padding: '6px 10px', borderRadius: 5,
                  cursor: candles?.length ? 'pointer' : 'not-allowed',
                  border: `1px solid ${G_BLUE}60`,
                  background: `${G_BLUE}15`,
                  color: candles?.length ? G_BLUE : C.muted,
                  transition: 'all 0.15s',
                }}
              >
                ✦ Analyse with Gemini
              </button>
            )}
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', background: C.bg,
              border: `1px solid ${G_BLUE}30`, borderRadius: 6, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {DOT_COLORS.map((col, i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: col,
                    animation: `claudeDot 1.2s ${i * 0.15}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: G_BLUE }}>
                Analysing {symbol.label} on {timeframe.label}…
              </div>
            </div>
          )}

          {/* ── Error / rate-limit countdown ── */}
          {error && !loading && (
            error === 'rate-limit' ? (
              <div style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 11,
                color: G_YELLOW, background: `${G_YELLOW}12`,
                border: `1px solid ${G_YELLOW}40`, borderRadius: 5,
                padding: '10px 12px', marginBottom: 10, textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  ⏳ Free tier rate limit hit
                </div>
                <div style={{ color: '#b8cce0', marginBottom: 6 }}>
                  Auto-retrying in <span style={{ color: G_YELLOW, fontWeight: 700, fontSize: 14 }}>{retryIn}s</span>
                </div>
                <div style={{ fontSize: 9, color: '#6b8096' }}>
                  Gemini free tier: 15 requests / min · Switch to 1.5 Flash for a separate quota
                </div>
                <button
                  onClick={abort}
                  style={{
                    marginTop: 8, fontFamily: "'Raleway', sans-serif", fontSize: 10,
                    padding: '3px 12px', borderRadius: 4, cursor: 'pointer',
                    border: '1px solid #f8514960', background: '#f8514918', color: '#f85149',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 11,
                color: '#f85149', background: '#f8514912',
                border: '1px solid #f8514930', borderRadius: 5,
                padding: '8px 12px', marginBottom: 10,
              }}>
                ⚠ {error}
              </div>
            )
          )}

          {/* ── Result ── */}
          {result && !loading && <AnalysisResult result={result} market={market} />}

          {/* ── Empty state ── */}
          {!result && !loading && !error && (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted,
            }}>
              Click "Analyse with Gemini" to get a free AI trade signal
            </div>
          )}
        </>
      )}
    </div>
  );
}
