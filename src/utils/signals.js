import { calcATR } from './indicators';

/**
 * Multi-indicator weighted signal engine.
 * Returns a recommendation object with action, confidence, signals, and trade levels.
 */
export function computeSignal(candles, inds) {
  const n = candles.length - 1;
  if (n < 55) return null;

  const price = candles[n].close;
  let score = 0;
  const signals = [];

  const add = (indicator, message, type, points) => {
    score += points;
    signals.push({ indicator, message, type, points });
  };

  // ── RSI ──────────────────────────────────────────────────────────────────
  const rsiVal  = inds.rsi[n];
  const rsiPrev = inds.rsi[n - 1];
  if (rsiVal !== null) {
    if (rsiVal < 20)       add('RSI (14)', `Extremely oversold — ${rsiVal.toFixed(1)}`,           'strong_bull', 45);
    else if (rsiVal < 30)  add('RSI (14)', `Oversold — ${rsiVal.toFixed(1)}`,                     'bull',        28);
    else if (rsiVal > 80)  add('RSI (14)', `Extremely overbought — ${rsiVal.toFixed(1)}`,          'strong_bear',-45);
    else if (rsiVal > 70)  add('RSI (14)', `Overbought — ${rsiVal.toFixed(1)}`,                    'bear',       -28);
    else if (rsiVal >= 50) add('RSI (14)', `Bullish territory — ${rsiVal.toFixed(1)}`,             'mild_bull',   8);
    else                   add('RSI (14)', `Bearish territory — ${rsiVal.toFixed(1)}`,             'mild_bear',  -8);

    if (rsiPrev !== null && rsiVal > rsiPrev && rsiVal < 45)
      add('RSI (14)', 'Recovering from lows — bullish divergence', 'bull', 10);
    if (rsiPrev !== null && rsiVal < rsiPrev && rsiVal > 55)
      add('RSI (14)', 'Fading from highs — bearish divergence',   'bear', -10);
  }

  // ── MACD ─────────────────────────────────────────────────────────────────
  const hv  = inds.macd.histogram[n];
  const phv = inds.macd.histogram[n - 1];
  if (hv !== null && phv !== null) {
    if      (hv > 0 && phv < 0)  add('MACD (12,26,9)', 'Bullish crossover ↑ — strong buy signal',    'strong_bull', 38);
    else if (hv < 0 && phv > 0)  add('MACD (12,26,9)', 'Bearish crossover ↓ — strong sell signal',   'strong_bear',-38);
    else if (hv > 0 && hv > phv) add('MACD (12,26,9)', 'Rising bullish momentum — trend strengthening','bull',       16);
    else if (hv > 0)              add('MACD (12,26,9)', 'Positive histogram — mild bullish bias',       'mild_bull',   8);
    else if (hv < 0 && hv < phv) add('MACD (12,26,9)', 'Rising bearish momentum — trend weakening',   'bear',       -16);
    else                          add('MACD (12,26,9)', 'Negative histogram — mild bearish bias',       'mild_bear',  -8);
  }

  // ── Bollinger Bands ───────────────────────────────────────────────────────
  const bb = inds.bb[n];
  if (bb && bb.upper !== null) {
    const pos = (price - bb.lower) / (bb.upper - bb.lower);
    if      (price < bb.lower)  add('Bollinger Bands', 'Price below lower band — mean reversion likely',  'strong_bull', 32);
    else if (pos   < 0.20)      add('Bollinger Bands', 'Near lower band — potential bounce zone',          'bull',        18);
    else if (price > bb.upper)  add('Bollinger Bands', 'Price above upper band — reversal risk',           'strong_bear',-32);
    else if (pos   > 0.80)      add('Bollinger Bands', 'Near upper band — overbought pressure',            'bear',       -18);
    else                        add('Bollinger Bands', `Mid-band (${Math.round(pos * 100)}% of range)`,    'neutral',      0);
  }

  // ── EMA Trend ─────────────────────────────────────────────────────────────
  const ev9  = inds.e9[n],  ev21  = inds.e21[n],  ev50  = inds.e50[n];
  const pev9 = inds.e9[n-1], pev21 = inds.e21[n-1];
  if (ev9 !== null && ev21 !== null && ev50 !== null) {
    if      (ev9 > ev21 && ev21 > ev50) add('EMA Alignment', 'Bullish alignment: EMA9 > EMA21 > EMA50',   'bull',       22);
    else if (ev9 < ev21 && ev21 < ev50) add('EMA Alignment', 'Bearish alignment: EMA9 < EMA21 < EMA50',   'bear',      -22);
    else                                add('EMA Alignment', 'Mixed EMA — sideways / consolidation',       'neutral',    0);

    if (pev9 !== null && pev21 !== null) {
      if (ev9 > ev21 && pev9 <= pev21)  add('EMA Cross', 'Golden cross: EMA9 crossed above EMA21',        'strong_bull', 28);
      if (ev9 < ev21 && pev9 >= pev21)  add('EMA Cross', 'Death cross: EMA9 crossed below EMA21',         'strong_bear',-28);
    }

    if (price > ev50) add('EMA 50', 'Price above EMA50 — primary uptrend intact',  'mild_bull', 12);
    else              add('EMA 50', 'Price below EMA50 — primary downtrend active', 'mild_bear',-12);
  }

  // ── Score → Action ────────────────────────────────────────────────────────
  const action     = score >= 30 ? 'BUY' : score <= -30 ? 'SELL' : 'HOLD';
  const confidence = Math.min(Math.round(Math.abs(score) / 1.8), 98);
  const dir        = action === 'SELL' ? -1 : 1;
  const atrVal     = calcATR(candles.slice(-20).map(c => ({ high: c.high, low: c.low, close: c.close })));

  return {
    action,
    score,
    confidence,
    signals,
    entry:    price,
    target1:  price + dir * atrVal * 2.0,
    target2:  price + dir * atrVal * 3.5,
    stopLoss: price - dir * atrVal * 1.5,
    rr:       '1:1.3',
    atr:      atrVal,
    timestamp: new Date(),
  };
}
