import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice } from '../utils/format';
import { getGrokAnalysis, abortGrokAnalysis, GROK_MODELS } from '../utils/grok';

// ── Grok / xAI brand colour ───────────────────────────────────────────────────
const GROK_COLOR = '#06B6D4'; // cyan-500

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

function GrokLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4 L20 20 M20 4 L4 20"
        stroke={GROK_COLOR} strokeWidth="3" strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" fill={GROK_COLOR} opacity="0.5" />
    </svg>
  );
}

function AnalysisResult({ result }) {
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

      {agree && (
        <div style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 10,
          padding: '4px 8px', borderRadius: 4, marginBottom: 10,
          background: abadge.bg, color: abadge.color, border: `1px solid ${abadge.color}30`,
        }}>
          {agree}
        </div>
      )}

      {result.summary && (
        <>
          <SectionTitle>Summary</SectionTitle>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.text, lineHeight: 1.6, marginBottom: 10 }}>
            {result.summary}
          </div>
        </>
      )}

      <Divider />

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
            {[
              { label: 'Risk:Reward', value: trade.risk_reward || '—', mono: true, color: GROK_COLOR },
              { label: 'Time Horizon', value: trade.time_horizon || '—' },
              { label: 'Sizing', value: (result.position_sizing || '—').split('—')[0].trim() },
            ].map(({ label, value, mono, color }) => (
              <div key={label} style={{ flex: 1, background: C.bg, borderRadius: 4, padding: '6px 8px', border: `1px solid ${C.border}` }}>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 2 }}>{label}</div>
                <div className={mono ? 'mono' : undefined} style={{ fontSize: mono ? 11 : 10, fontWeight: mono ? 700 : 400, color: color || C.text }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {trade.entry_note && (
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted, fontStyle: 'italic', marginBottom: 10 }}>
              💡 {trade.entry_note}
            </div>
          )}
        </>
      )}

      <Divider />

      {result.key_reasons?.length > 0 && (
        <>
          <SectionTitle>Key Reasons</SectionTitle>
          <div style={{ marginBottom: 10 }}>
            {result.key_reasons.map((r, i) => (
              <div key={i} style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.text,
                padding: '4px 0 4px 8px',
                borderLeft: `2px solid ${GROK_COLOR}60`,
                marginBottom: 4, lineHeight: 1.5,
              }}>
                {r}
              </div>
            ))}
          </div>
        </>
      )}

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

// ── Main component ────────────────────────────────────────────────────────────
export default function GrokPanel({ symbol, timeframe, ticker, inds, signal, candles, market = 'spot' }) {
  const { colors: C } = useTheme();
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [model,     setModel]     = useState('grok-4.20');
  const abortRef = useRef(false);

  // Reset result when symbol/timeframe changes
  useEffect(() => {
    setResult(null);
    setError(null);
  }, [symbol?.id, timeframe?.value]);

  const runAnalysis = useCallback(async (sym, tf, tkr, ids, sig, cnd, mkt, mdl) => {
    abortRef.current = false;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await getGrokAnalysis({ symbol: sym, timeframe: tf, ticker: tkr, inds: ids, signal: sig, candles: cnd, market: mkt }, mdl);
      if (!abortRef.current) setResult(res);
    } catch (err) {
      if (!abortRef.current) {
        setError(err.message === 'ABORTED' ? 'Analysis cancelled.' : err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const analyze = useCallback(() => {
    if (!candles?.length || !inds) return;
    runAnalysis(symbol, timeframe, ticker, inds, signal, candles, market, model);
  }, [symbol, timeframe, ticker, inds, signal, candles, market, model, runAnalysis]);

  const abort = () => {
    abortRef.current = true;
    abortGrokAnalysis();
    setLoading(false);
    setError('Analysis cancelled.');
  };

  const sigBadge = result?.signal;

  return (
    <div style={{
      background: C.card,
      border: `1px solid ${GROK_COLOR}30`,
      borderRadius: 8, padding: 16, marginBottom: 10,
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GrokLogo size={18} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, fontWeight: 700, color: C.bright }}>
                Grok Analysis
              </span>
              <span style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 8, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: GROK_COLOR, background: `${GROK_COLOR}18`,
                border: `1px solid ${GROK_COLOR}40`, padding: '1px 6px', borderRadius: 3,
              }}>
                xAI
              </span>
              {collapsed && sigBadge && (
                <span style={{
                  fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
                  color: sigColor(sigBadge), background: recBg(sigBadge),
                  border: `1px solid ${sigColor(sigBadge)}40`, padding: '1px 7px', borderRadius: 3,
                }}>
                  {sigBadge}
                </span>
              )}
            </div>
            {!collapsed && (
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>
                xAI Grok · AI trade signal · Entry · TP · Stop Loss
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
          {/* ── Model selector ── */}
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{
              width: '100%', marginBottom: 8,
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 5, padding: '5px 8px',
              fontFamily: "'Raleway', sans-serif", fontSize: 11,
              color: C.text, cursor: 'pointer', boxSizing: 'border-box',
            }}
          >
            {GROK_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          {/* ── Analyse / Stop button ── */}
          <div style={{ marginBottom: 12 }}>
            {loading ? (
              <button
                onClick={abort}
                style={{
                  width: '100%', fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 11,
                  padding: '7px 10px', borderRadius: 5, cursor: 'pointer',
                  border: '1px solid #f8514960', background: '#f8514918', color: '#f85149',
                  boxSizing: 'border-box',
                }}
              >
                ■ Stop
              </button>
            ) : (
              <button
                onClick={analyze}
                disabled={!candles?.length}
                style={{
                  width: '100%', fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 11,
                  padding: '7px 10px', borderRadius: 5,
                  cursor: candles?.length ? 'pointer' : 'not-allowed',
                  border: `1px solid ${GROK_COLOR}60`,
                  background: `${GROK_COLOR}15`,
                  color: candles?.length ? GROK_COLOR : C.muted,
                  transition: 'all 0.15s', boxSizing: 'border-box',
                }}
              >
                ✦ Analyse with Grok
              </button>
            )}
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', background: C.bg,
              border: `1px solid ${GROK_COLOR}30`, borderRadius: 6, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', gap: 3 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: GROK_COLOR,
                    opacity: 0.3 + i * 0.35,
                    animation: `claudeDot 1.2s ${i * 0.2}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: GROK_COLOR }}>
                Analysing {symbol.label} on {timeframe.label}…
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && !loading && (
            <div style={{
              fontFamily: "'Raleway', sans-serif", fontSize: 11,
              color: '#f85149', background: '#f8514912',
              border: '1px solid #f8514930', borderRadius: 5,
              padding: '8px 12px', marginBottom: 10,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* ── Result ── */}
          {result && !loading && <AnalysisResult result={result} />}

          {/* ── Empty state ── */}
          {!result && !loading && !error && (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted,
            }}>
              Click "Analyse with Grok" to get an AI trade signal
            </div>
          )}
        </>
      )}
    </div>
  );
}
