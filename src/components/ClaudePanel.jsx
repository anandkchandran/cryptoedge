import React, { useState, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice } from '../utils/format';
import { getClaudeAnalysis, abortClaudeAnalysis } from '../utils/claude';

// ── Colour helpers ────────────────────────────────────────────────────────────
const sigColor = (s) => {
  if (!s) return '#d4a017';
  if (s === 'LONG')  return '#10d67a';
  if (s === 'SHORT') return '#f85149';
  return '#d4a017'; // HOLD
};
const recColor = sigColor; // keep backward compat for collapsed badge
const recBg    = (s) => sigColor(s) + '18';

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
      fontFamily:    "'Raleway', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontSize:       10,
      fontWeight:     700,
      color:          C.muted,
      textTransform:  'uppercase',
      letterSpacing:  1,
      marginBottom:   8,
    }}>
      {children}
    </div>
  );
};

function StrategyRow({ label, value, color }) {
  const { colors: C } = useTheme();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', marginBottom: 3, background: C.bg, borderRadius: 5, border: `1px solid ${color}22` }}>
      <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted }}>{label}</span>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function BulletList({ items = [], color }) {
  const { colors: C } = useTheme();
  return (
    <ul className="panel-list" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, fontSize: 11, color: color || C.text, lineHeight: 1.5 }}>
          <span style={{ color: C.muted, flexShrink: 0, marginTop: 1 }}>›</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Analysis result ───────────────────────────────────────────────────────────
function AnalysisResult({ analysis, symbol, timeframe, onRefresh, onClear, market = 'spot' }) {
  const { colors: C } = useTheme();
  if (!analysis) return null;

  const ac     = sigColor(analysis.signal);
  const abadge = agreeBadge(analysis.agreement_with_algo);
  const t      = analysis.trade || {};
  const ref    = t.tp1 ?? t.entry ?? 1000;
  const pd     = ref > 1000 ? 2 : ref > 10 ? 4 : ref > 1 ? 5 : 6;
  const fp     = v => v != null ? `$${fmtPrice(v, pd)}` : '—';

  // Signal icon
  const signalIcon = analysis.signal === 'LONG' ? '▲' : analysis.signal === 'SHORT' ? '▼' : '◆';

  return (
    <div>
      {/* Signal badge + confidence */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div className="mono" style={{
              fontSize: 28, fontWeight: 700, color: ac, letterSpacing: 2,
              background: recBg(analysis.signal), padding: '5px 16px',
              borderRadius: 6, border: `1px solid ${ac}40`, display: 'inline-block',
            }}>
              {signalIcon} {analysis.signal}
            </div>
          </div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted }}>
            {symbol.label} · {timeframe.label} · {market === 'futures' ? 'Perp Futures' : 'Spot'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>Confidence</div>
          <div className="mono" style={{ fontSize: 28, fontWeight: 600, color: ac }}>{analysis.confidence}%</div>
        </div>
      </div>

      {/* Confidence bar */}
      <div style={{ background: C.grid, borderRadius: 3, height: 4, marginBottom: 12 }}>
        <div style={{ width: `${analysis.confidence}%`, height: '100%', background: ac, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>

      {/* Summary */}
      <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, color: C.bright, lineHeight: 1.7, marginBottom: 12 }}>{analysis.summary}</p>

      {/* vs Algo */}
      {analysis.agreement_with_algo && (
        <div style={{ fontFamily: "'Raleway', sans-serif", padding: '7px 10px', borderRadius: 6, background: abadge.bg, border: `1px solid ${abadge.color}30`, marginBottom: 12, fontSize: 11, color: abadge.color, lineHeight: 1.5 }}>
          <strong>vs Algorithm:</strong> {analysis.agreement_with_algo}
        </div>
      )}

      {/* Trade levels */}
      <Divider />
      <SectionTitle>Trade Levels</SectionTitle>
      <StrategyRow label={`Entry (${t.entry_type || 'LIMIT'})`} value={fp(t.entry)}     color="#60a5fa" />
      {t.entry_note && (
        <div style={{ fontSize: 10, color: C.muted, padding: '2px 8px 6px', fontStyle: 'italic' }}>{t.entry_note}</div>
      )}
      <StrategyRow label="Take Profit 1" value={fp(t.tp1)}          color={C.bull}   />
      <StrategyRow label="Take Profit 2" value={fp(t.tp2)}          color="#00c853"  />
      <StrategyRow label="Stop Loss"     value={fp(t.stop_loss)}    color={C.bear}   />
      <StrategyRow label="Risk : Reward" value={t.risk_reward || '—'} color="#a78bfa" />
      <StrategyRow label="Time Horizon"  value={t.time_horizon || '—'} color="#fbbf24" />

      {analysis.position_sizing && (
        <div style={{ padding: '6px 10px', borderRadius: 5, background: C.bg, marginTop: 4, marginBottom: 4, fontSize: 11, color: C.text, border: `1px solid ${C.border}` }}>
          <span style={{ color: C.muted }}>Sizing: </span>{analysis.position_sizing}
        </div>
      )}

      {/* Key reasons */}
      <Divider />
      <SectionTitle>Key Reasons</SectionTitle>
      <BulletList items={analysis.key_reasons} />

      {/* Risks */}
      <Divider />
      <SectionTitle>Key Risks</SectionTitle>
      <BulletList items={analysis.risks} color={C.bear} />

      {/* Invalidation */}
      {analysis.invalidation && (
        <>
          <Divider />
          <SectionTitle>Invalidation</SectionTitle>
          <p style={{ fontSize: 11, color: C.neutral, lineHeight: 1.6 }}>{analysis.invalidation}</p>
        </>
      )}

      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <button onClick={onRefresh} className="button-accent" style={{ flex: 1 }}>↻ Re-analyse</button>
        <button onClick={onClear} title="Clear result" style={{ padding: '4px 12px' }}>✕</button>
      </div>
    </div>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────
function LoadingState({ symbol, onStop }) {
  const { colors: C } = useTheme();
  return (
    <div style={{ padding: '20px 0', textAlign: 'center' }}>
      <div style={{ fontSize: 28, color: '#7c6bfa', marginBottom: 12, animation: 'claudePulse 1.5s ease-in-out infinite' }}>◈</div>
      <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 13, color: C.text, marginBottom: 4, fontWeight: 600 }}>Claude is analysing {symbol.label}…</div>
      <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted, marginBottom: 14 }}>Local claude CLI · Technical deep-dive</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c6bfa', animation: `claudeDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
      {/* Skeleton .button.button-danger */}
      <button className="button-danger" onClick={onStop}>
        ■ Stop
      </button>
    </div>
  );
}

// ── Main ClaudePanel ──────────────────────────────────────────────────────────
export default function ClaudePanel({ symbol, timeframe, ticker, inds, signal, candles, market = 'spot' }) {
  const { colors: C } = useTheme();
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const abortCtrlRef = useRef(null);

  const ready = inds && candles.length > 55;

  const stopAnalysis = useCallback(async () => {
    // Signal the fetch to abort (cancels the waiting side)
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort();
      abortCtrlRef.current = null;
    }
    // Also tell the server to kill the claude subprocess
    await abortClaudeAnalysis();
    setLoading(false);
    setError(null);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!ready) return;
    const ctrl = new AbortController();
    abortCtrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await getClaudeAnalysis(
        { symbol, timeframe, ticker, inds, signal, candles, market },
        null,        // no API key needed — handled by server.js
        ctrl.signal
      );
      setAnalysis(result);
    } catch (err) {
      if (err.message !== 'ABORTED') setError(err.message);
    } finally {
      abortCtrlRef.current = null;
      setLoading(false);
    }
  }, [symbol, timeframe, ticker, inds, signal, candles, market, ready]);

  return (
    <div style={{ background: C.card, border: '1px solid #7c6bfa40', borderRadius: 8, padding: 16, marginBottom: 10 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, color: '#7c6bfa' }}>◈</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, fontWeight: 700, color: C.bright }}>Claude AI Analysis</div>
              <span style={{
                fontFamily:   "'Raleway', sans-serif",
                fontSize:      8, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.8,
                color:         market === 'futures' ? '#f97316' : '#10d67a',
                background:    market === 'futures' ? '#f9731618' : '#10d67a18',
                border:        `1px solid ${market === 'futures' ? '#f9731640' : '#10d67a40'}`,
                padding: '1px 6px', borderRadius: 3,
              }}>
                {market === 'futures' ? 'Futures' : 'Spot'}
              </span>
              {/* Collapsed summary badge */}
              {collapsed && analysis && (
                <span style={{
                  fontFamily:   "'Raleway', sans-serif",
                  fontSize:      9, fontWeight: 700,
                  color:         sigColor(analysis.signal),
                  background:    recBg(analysis.signal),
                  border:        `1px solid ${sigColor(analysis.signal)}40`,
                  padding:      '1px 7px', borderRadius: 3,
                  letterSpacing: 0.5,
                }}>
                  {analysis.signal === 'LONG' ? '▲' : analysis.signal === 'SHORT' ? '▼' : '◆'} {analysis.signal} · {analysis.confidence}%
                </span>
              )}
            </div>
            {!collapsed && (
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>Local claude CLI · Technical deep-dive</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Server hint */}
          <span title="Requires: node server.js running on port 3001" style={{ fontSize: 9, color: C.muted, opacity: 0.6, cursor: 'help' }}>
            :3001
          </span>
          {/* Collapse / expand button */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              background:   'transparent',
              border:       `1px solid ${C.border}`,
              borderRadius:  4,
              color:         C.muted,
              cursor:       'pointer',
              fontSize:      11,
              lineHeight:    1,
              padding:      '2px 7px',
              fontFamily:   "'Raleway', sans-serif",
              transition:   'all 0.15s',
            }}
          >
            {collapsed ? '+' : '−'}
          </button>
        </div>
      </div>

      {/* Body — hidden when collapsed */}
      {!collapsed && <>

      {/* Loading */}
      {loading && <LoadingState symbol={symbol} onStop={stopAnalysis} />}

      {/* Error */}
      {error && !loading && (
        <div style={{ background: '#f8514918', border: '1px solid #f8514940', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: C.bear, marginBottom: 8, lineHeight: 1.5 }}>⚠ {error}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="button-accent" onClick={runAnalysis}>Retry</button>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
          {error.includes('node server.js') && (
            <p style={{ fontSize: 9, color: C.muted, marginTop: 8, lineHeight: 1.5, opacity: 0.7 }}>
              In a separate terminal, run: <code style={{ color: C.text }}>node server.js</code> — then retry.
            </p>
          )}
        </div>
      )}

      {/* Analyse button (idle state) */}
      {!analysis && !loading && !error && (
        <div>
          <p style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
            Ready to analyse <strong style={{ color: C.text }}>{symbol.label}</strong> on the {timeframe.label} chart
            using your locally installed <code>claude</code> CLI.
          </p>
          {!ready && (
            <p style={{ fontSize: 10, color: C.neutral, marginBottom: 8 }}>⚠ Waiting for sufficient candle data…</p>
          )}
          {/* Skeleton .button.button-primary — full-width analyse button */}
          <button
            className="button-primary u-full-width"
            onClick={runAnalysis}
            disabled={!ready}
            style={{ fontWeight: 600, letterSpacing: '0.05em' }}
          >
            ◈ Analyse with Claude
          </button>
        </div>
      )}

      {/* Result */}
      {analysis && !loading && (
        <AnalysisResult
          analysis={analysis} symbol={symbol} timeframe={timeframe}
          market={market}
          onRefresh={runAnalysis}
          onClear={() => setAnalysis(null)}
        />
      )}

      </>}  {/* end !collapsed */}

      <style>{`
        @keyframes claudePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        @keyframes claudeDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
