/**
 * Technical indicator calculations
 * All functions return arrays aligned to the input price array.
 * Insufficient-data positions are filled with null.
 */

export function calcEMA(prices, period) {
  const k = 2 / (period + 1);
  const result = [];
  let avg = 0;
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (i === period - 1) {
      avg = prices.slice(0, period).reduce((s, v) => s + v, 0) / period;
      result.push(avg);
      continue;
    }
    avg = prices[i] * k + avg * (1 - k);
    result.push(avg);
  }
  return result;
}

export function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return prices.map(() => null);
  const result = new Array(period).fill(null);
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) ag += d; else al += -d;
  }
  ag /= period; al /= period;
  result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    ag = (ag * (period - 1) + (d > 0 ? d : 0)) / period;
    al = (al * (period - 1) + (d < 0 ? -d : 0)) / period;
    result.push(al === 0 ? 100 : 100 - 100 / (1 + ag / al));
  }
  return result;
}

export function calcMACD(prices, fast = 12, slow = 26, sig = 9) {
  const ef = calcEMA(prices, fast);
  const es = calcEMA(prices, slow);
  const macdLine = ef.map((v, i) =>
    v !== null && es[i] !== null ? v - es[i] : null
  );
  const validMacd = macdLine.filter(v => v !== null);
  const sigEma = calcEMA(validMacd, sig);
  let vi = 0;
  const signalLine = macdLine.map(v => {
    if (v === null) return null;
    return sigEma[vi++] ?? null;
  });
  const histogram = macdLine.map((v, i) =>
    v !== null && signalLine[i] !== null ? v - signalLine[i] : null
  );
  return { macdLine, signalLine, histogram };
}

export function calcBollingerBands(prices, period = 20, mult = 2) {
  return prices.map((_, i) => {
    if (i < period - 1) return { upper: null, middle: null, lower: null };
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, v) => s + v, 0) / period;
    const sd = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { upper: mean + mult * sd, middle: mean, lower: mean - mult * sd };
  });
}

export function calcATR(candles, period = 14) {
  if (candles.length < 2) return 0;
  const trs = candles.slice(1).map((c, i) =>
    Math.max(
      c.high - c.low,
      Math.abs(c.high - candles[i].close),
      Math.abs(c.low  - candles[i].close)
    )
  );
  const n = Math.min(period, trs.length);
  return trs.slice(-n).reduce((s, v) => s + v, 0) / n;
}

/**
 * Build chart-ready data array from candles + computed indicators
 * Returns last `limit` items for rendering performance
 */
export function buildChartData(candles, inds, limit = 120) {
  const offset = Math.max(0, candles.length - limit);
  return candles.slice(offset).map((c, i) => {
    const ai = offset + i;
    const bb = inds.bb[ai] || {};
    return {
      time:    c.time,
      price:   c.close,
      high:    c.high,
      low:     c.low,
      volume:  c.volume,
      e9:      inds.e9[ai],
      e21:     inds.e21[ai],
      e50:     inds.e50[ai],
      bbUpper: bb.upper,
      bbMiddle:bb.middle,
      bbLower: bb.lower,
      rsi:     inds.rsi[ai],
      macd:    inds.macd.macdLine[ai],
      signal:  inds.macd.signalLine[ai],
      hist:    inds.macd.histogram[ai],
    };
  });
}
