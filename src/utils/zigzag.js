/**
 * calcZigZag — ZigZag indicator
 *
 * Identifies swing highs and swing lows where price reverses by at least
 * `threshold` percent. Returns an array of { index, price, type } pivot
 * objects where type is 'high' or 'low'.
 *
 * Note: the LAST pivot is always tentative (it can repaint as new candles
 * arrive). All previous pivots are confirmed and fixed.
 *
 * @param {Array}  candles   — array of { high, low, close }
 * @param {number} threshold — minimum reversal % (default 5)
 * @returns {Array} pivots   — [{ index, price, type }]
 */
export function calcZigZag(candles, threshold = 5) {
  if (!candles || candles.length < 3) return [];

  const pct = threshold / 100;
  const pivots = [];

  // Seed: determine initial trend from first two candles
  let trend   = candles[1].high > candles[0].high ? 'up' : 'down';
  let extreme = trend === 'up' ? candles[0].low  : candles[0].high;
  let extIdx  = 0;

  for (let i = 1; i < candles.length; i++) {
    const hi = candles[i].high;
    const lo = candles[i].low;

    if (trend === 'up') {
      if (hi > extreme) {
        extreme = hi;
        extIdx  = i;
      } else if (lo < extreme * (1 - pct)) {
        // Confirmed swing high
        pivots.push({ index: extIdx, price: extreme, type: 'high' });
        trend   = 'down';
        extreme = lo;
        extIdx  = i;
      }
    } else {
      if (lo < extreme) {
        extreme = lo;
        extIdx  = i;
      } else if (hi > extreme * (1 + pct)) {
        // Confirmed swing low
        pivots.push({ index: extIdx, price: extreme, type: 'low' });
        trend   = 'up';
        extreme = hi;
        extIdx  = i;
      }
    }
  }

  // Append the last (tentative) pivot
  pivots.push({ index: extIdx, price: extreme, type: trend === 'up' ? 'high' : 'low', tentative: true });

  return pivots;
}
