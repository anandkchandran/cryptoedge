/**
 * Groq integration for CryptoEdge Pro
 * Routes through the Railway proxy server which calls api.groq.com.
 * Free tier: 30 req/min, 14,400 req/day — much more generous than Gemini.
 * Get a free key at: https://console.groq.com
 */

import { buildPrompt } from './gemini';

const API_BASE  = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const PROXY_URL = `${API_BASE}/api/groq`;

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B (best)'   },
  { id: 'llama-3.1-8b-instant',     label: 'Llama 3.1 8B (fastest)' },
  { id: 'mixtral-8x7b-32768',       label: 'Mixtral 8x7B'           },
  { id: 'gemma2-9b-it',             label: 'Gemma 2 9B'             },
];

const SYSTEM_PROMPT = 'You are an expert cryptocurrency technical analyst. Respond with ONLY valid JSON — no markdown code fences, no preamble, no explanation outside the JSON object. Your signal must be one of: LONG, SHORT, or HOLD.';

// ── Abort ─────────────────────────────────────────────────────────────────────
let _abortController = null;

export async function abortGroqAnalysis() {
  if (_abortController) { _abortController.abort(); _abortController = null; }
  try { await fetch(`${API_BASE}/api/groq/abort`, { method: 'POST' }); } catch {}
}

// ── Main API call ─────────────────────────────────────────────────────────────
export async function getGroqAnalysis(data, model = 'llama-3.3-70b-versatile') {
  const prompt = buildPrompt(data);
  _abortController = new AbortController();
  const { signal } = _abortController;

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
    throw new Error('Cannot reach server — is Railway running?');
  } finally {
    _abortController = null;
  }

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = body?.error || `Server error ${response.status}`;
    if (msg === 'ABORTED') throw new Error('ABORTED');
    throw new Error(msg);
  }

  const raw = (body.content ?? '').trim();

  // 3-pass JSON extraction
  try { return JSON.parse(raw); } catch {}
  const stripped = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/im, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }

  throw new Error('Groq returned malformed JSON — try again');
}
