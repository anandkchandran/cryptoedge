/**
 * xAI Grok integration for CryptoEdge Pro
 * Routes through the local proxy server (server.js on :3001)
 * which forwards to api.x.ai using XAI_API_KEY.
 *
 * Get an API key at: https://console.x.ai
 */

import { buildPrompt } from './claude';

const API_BASE  = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const PROXY_URL = `${API_BASE}/api/grok`;

export const GROK_MODELS = [
  { id: 'grok-3',      label: 'Grok 3 (default)' },
  { id: 'grok-3-mini', label: 'Grok 3 Mini'      },
  { id: 'grok-2-1212', label: 'Grok 2'            },
];

const SYSTEM_PROMPT = 'You are an expert cryptocurrency technical analyst. Respond with ONLY valid JSON — no markdown code fences, no preamble, no explanation outside the JSON object. Your signal must be one of: LONG, SHORT, or HOLD.';

// ── Abort ─────────────────────────────────────────────────────────────────────
let _abortController = null;

export async function abortGrokAnalysis() {
  if (_abortController) { _abortController.abort(); _abortController = null; }
  try { await fetch(`${API_BASE}/api/grok/abort`, { method: 'POST' }); } catch {}
}

// ── Main API call ─────────────────────────────────────────────────────────────
export async function getGrokAnalysis(data, model = 'grok-3') {
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
    throw new Error('Cannot reach server — is node server.js running?');
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

  throw new Error('Grok returned malformed JSON — try again');
}
