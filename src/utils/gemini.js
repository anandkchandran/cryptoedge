/**
 * Google Gemini integration for CryptoEdge Pro
 * Routes through the local proxy server (server.js on :3001)
 * which forwards to generativelanguage.googleapis.com using GEMINI_API_KEY.
 *
 * Start the proxy first:  node server.js
 * Then start the app:     npm start
 *
 * Get a free key at: https://aistudio.google.com/app/apikey
 */

const API_BASE  = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const PROXY_URL = `${API_BASE}/api/gemini`;

export const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash-preview-04-17', label: 'Gemini 2.5 Flash (latest)' },
  { id: 'gemini-2.0-flash',               label: 'Gemini 2.0 Flash'           },
  { id: 'gemini-1.5-flash',               label: 'Gemini 1.5 Flash'           },
  { id: 'gemini-1.5-pro',                 label: 'Gemini 1.5 Pro'             },
];

// ── Prompt builder ────────────────────────────────────────────────────────────
function candleCountForTf(tfId) {
  if (['1m', '3m', '5m'].includes(tfId))  return 30;
  if (['15m', '30m'].includes(tfId))       return 24;
  if (tfId === '1h')                        return 20;
  if (tfId === '2h')                        return 16;
  if (tfId === '4h')                        return 12;
  if (tfId === '6h')                        return 10;
  if (tfId === '8h')                        return 8;
  return 8;
}

function series(arr, n, count = 6, decimals = 2) {
  return Array.from({ length: count }, (_, i) => {
    const v = arr[n - (count - 1 - i)];
    return v != null ? (+v).toFixed(decimals) : '—';
  }).join(' → ');
}

function buildPrompt({ symbol, timeframe, ticker, inds, signal, candles, market }) {
  const marketLabel = market === 'futures' ? 'USDT-M Perpetual Futures' : 'Spot';
  const n     = candles.length - 1;
  const price = ticker?.price ?? candles[n].close;
  const pd    = price < 0.01 ? 6 : price < 1 ? 5 : price < 10 ? 4 : 2;
  const fp    = (v) => v != null && isFinite(v) ? (+v).toFixed(pd) : '—';
  const f2    = (v) => v != null && isFinite(v) ? (+v).toFixed(2)  : '—';

  const rsiV = inds.rsi[n];
  const rsiInterp = !rsiV ? '—'
    : rsiV > 75 ? `${f2(rsiV)} — Extremely overbought`
    : rsiV > 65 ? `${f2(rsiV)} — Overbought`
    : rsiV >= 50 ? `${f2(rsiV)} — Bullish territory`
    : rsiV >= 35 ? `${f2(rsiV)} — Bearish territory`
    : rsiV >= 25 ? `${f2(rsiV)} — Oversold`
    : `${f2(rsiV)} — Extremely oversold`;

  const hist  = inds.macd.histogram[n];
  const prevH = inds.macd.histogram[n - 1];
  const macdInterp = hist == null ? '—'
    : hist > 0 && prevH < 0 ? 'Bullish crossover (fresh signal)'
    : hist < 0 && prevH > 0 ? 'Bearish crossover (fresh signal)'
    : hist > 0 && hist > prevH ? 'Positive & rising (strengthening bull)'
    : hist > 0 ? 'Positive (mild bull bias)'
    : hist < 0 && hist < prevH ? 'Negative & falling (strengthening bear)'
    : 'Negative (mild bear bias)';

  const e9v = inds.e9[n], e21v = inds.e21[n], e50v = inds.e50[n];
  const emaAlign = !e9v ? '—'
    : e9v > e21v && e21v > e50v ? 'Bullish — EMA9 > EMA21 > EMA50'
    : e9v < e21v && e21v < e50v ? 'Bearish — EMA9 < EMA21 < EMA50'
    : 'Mixed — ranging / consolidation';

  const bb    = inds.bb[n];
  const bbPos = bb?.upper != null
    ? ((price - bb.lower) / (bb.upper - bb.lower) * 100).toFixed(0)
    : null;
  const bbInterp = bbPos == null ? '—'
    : price < bb.lower  ? 'BELOW lower band (extreme oversold)'
    : price > bb.upper  ? 'ABOVE upper band (extreme overbought)'
    : bbPos < 25        ? `Lower quarter (${bbPos}%) — near support`
    : bbPos > 75        ? `Upper quarter (${bbPos}%) — near resistance`
    : `Mid-band (${bbPos}% of range)`;

  const rsiSeries   = series(inds.rsi, n, 6, 1);
  const histSeries  = series(inds.macd.histogram, n, 6, 3);
  const e9Series    = series(inds.e9, n, 6, pd);
  const closeSeries = Array.from({ length: 6 }, (_, i) => {
    const c = candles[n - (5 - i)];
    return c ? `$${fp(c.close)}` : '—';
  }).join(' → ');

  const candleCount = candleCountForTf(timeframe.id);
  const rows = candles.slice(-candleCount).map(c =>
    `  ${(c.datetime || c.time).padEnd(14)} | $${fp(c.open).padStart(12)} | $${fp(c.high).padStart(12)} | $${fp(c.low).padStart(12)} | $${fp(c.close).padStart(12)} | ${c.volume.toFixed(2).padStart(12)}`
  ).join('\n');

  const algoSigs = signal?.signals?.slice(0, 6).map(s =>
    `    • [${s.type.includes('bull') ? 'BULL' : s.type.includes('bear') ? 'BEAR' : 'NEUT'}] ${s.indicator}: ${s.message} (${s.points > 0 ? '+' : ''}${s.points}pts)`
  ).join('\n') || '    (not computed yet)';

  return `You are a senior cryptocurrency technical analyst and portfolio manager with 15 years of experience.
Analyze the following live market data and produce a professional trade recommendation.

═══════════════════════════════════════════════════════════
MARKET SNAPSHOT
═══════════════════════════════════════════════════════════
Symbol     : ${symbol.label}
Market     : ${marketLabel}
Timeframe  : ${timeframe.label}
Price      : $${fp(price)}
24h Change : ${ticker?.change != null ? (ticker.change > 0 ? '+' : '') + f2(ticker.change) + '%' : '—'}
24h High   : $${fp(ticker?.high24)}
24h Low    : $${fp(ticker?.low24)}
Volume 24h : ${ticker?.volume != null ? ticker.volume.toLocaleString() : '—'}

═══════════════════════════════════════════════════════════
TECHNICAL INDICATORS — CURRENT VALUES
═══════════════════════════════════════════════════════════
RSI (14)          : ${rsiInterp}
MACD (12,26,9)    : ${macdInterp}
  └ MACD Line     : ${f2(inds.macd.macdLine[n])}
  └ Signal Line   : ${f2(inds.macd.signalLine[n])}
  └ Histogram     : ${f2(hist)}
Bollinger Bands   : ${bbInterp}
  └ Upper         : $${fp(bb?.upper)}
  └ Middle        : $${fp(bb?.middle)}
  └ Lower         : $${fp(bb?.lower)}
EMA Alignment     : ${emaAlign}
  └ EMA9          : $${fp(e9v)}
  └ EMA21         : $${fp(e21v)}
  └ EMA50         : $${fp(e50v)}
ATR (14)          : $${f2(signal?.atr)} (volatility measure)

═══════════════════════════════════════════════════════════
INDICATOR TRENDS — last 6 ${timeframe.label} candles (oldest → newest)
═══════════════════════════════════════════════════════════
RSI series        : ${rsiSeries}
MACD Hist series  : ${histSeries}
EMA9 series       : ${e9Series}
Close series      : ${closeSeries}

═══════════════════════════════════════════════════════════
ALGORITHM PRE-SIGNAL (weighted indicator scoring)
═══════════════════════════════════════════════════════════
Action     : ${signal?.action ?? 'CALCULATING'}
Score      : ${signal?.score ?? '—'} (range: -200 to +200)
Confidence : ${signal?.confidence ?? '—'}%
Signals fired:
${algoSigs}

═══════════════════════════════════════════════════════════
RECENT PRICE ACTION (last ${candleCount} ${timeframe.label} candles)
═══════════════════════════════════════════════════════════
  Date/Time       |       Open    |       High    |        Low    |      Close    |       Volume
${rows}

═══════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════
Provide a comprehensive trade analysis for the ${marketLabel} market on the ${timeframe.label} timeframe.
${market === 'futures' ? 'This is a leveraged perpetual futures position — factor in funding rates, liquidation risk, and appropriate position sizing. Stop losses are critical.' : 'This is a spot position — focus on accumulation strategy and capital preservation.'}

Key instructions:
- Use INDICATOR TRENDS series to assess momentum direction, not just the snapshot value.
- Scale entry/exit prices and time horizon to the ${timeframe.label} timeframe.
- Use the full ${candleCount}-candle table to identify support/resistance levels.
- Consider confluence: how many indicators agree on direction?

Respond with ONLY valid JSON (no markdown fences, no text outside JSON):
{
  "signal": "LONG | SHORT | HOLD",
  "confidence": <integer 0-100>,
  "summary": "<2-3 sentence professional summary of the setup>",
  "agreement_with_algo": "<AGREE | DISAGREE | PARTIALLY AGREE> — <one sentence why>",
  "trade": {
    "entry_type": "<MARKET | LIMIT | SCALED>",
    "entry": <number>,
    "entry_note": "<brief entry tactic>",
    "tp1": <number>,
    "tp2": <number>,
    "stop_loss": <number>,
    "risk_reward": "<string e.g. 1:2.4>",
    "time_horizon": "<scalp (<1h) | intraday (1-8h) | swing (1-7d)>"
  },
  "position_sizing": "<conservative/moderate/aggressive> — <brief reasoning>",
  "key_reasons": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "invalidation": "<price level or event that invalidates this thesis>"
}`;
}

const SYSTEM_PROMPT = 'You are an expert cryptocurrency technical analyst. Respond with ONLY valid JSON — no markdown code fences, no preamble, no explanation outside the JSON object. Your signal must be one of: LONG, SHORT, or HOLD.';

// ── Abort ─────────────────────────────────────────────────────────────────────
let _abortController = null;

export async function abortGeminiAnalysis() {
  if (_abortController) { _abortController.abort(); _abortController = null; }
  try { await fetch(`${API_BASE}/api/gemini/abort`, { method: 'POST' }); } catch {}
}

// ── Main API call ─────────────────────────────────────────────────────────────
export async function getGeminiAnalysis(data, model = 'gemini-2.0-flash') {
  _abortController = new AbortController();
  const { signal } = _abortController;
  const prompt = buildPrompt(data);

  let response;
  try {
    response = await fetch(PROXY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt, systemPrompt: SYSTEM_PROMPT, model }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('ABORTED');
    throw new Error('Cannot reach local server — is "node server.js" running on port 3001?');
  } finally {
    _abortController = null;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = body?.error || `Server error ${response.status}`;
    if (msg === 'ABORTED') throw new Error('ABORTED');
    throw new Error(msg);
  }

  const raw   = (body.content ?? '').trim();
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(clean);
  } catch {
    throw new Error('Gemini returned malformed JSON — try again');
  }
}
