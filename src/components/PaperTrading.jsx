import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { fmtPrice } from '../utils/format';

// ── Constants ─────────────────────────────────────────────────────────────────
const STARTING_BALANCE = 10000;
const STORAGE_KEY      = 'cryptoedge_paper_trading';
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20];

// ── LocalStorage helpers ──────────────────────────────────────────────────────
function loadState() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function saveState(balance, positions, history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance, positions, history }));
  } catch {}
}

// ── P&L for a position given current price ────────────────────────────────────
function calcPnl(pos, currentPrice) {
  if (!currentPrice || !pos) return 0;
  const direction = pos.side === 'LONG' ? 1 : -1;
  return ((currentPrice - pos.entry) / pos.entry) * direction * pos.notional * pos.leverage;
}
function calcPct(pos, currentPrice) {
  if (!currentPrice || !pos) return 0;
  const direction = pos.side === 'LONG' ? 1 : -1;
  return ((currentPrice - pos.entry) / pos.entry) * direction * pos.leverage * 100;
}
function calcLiqPrice(pos) {
  const pctToLiq = 1 / pos.leverage;
  if (pos.side === 'LONG') return pos.entry * (1 - pctToLiq);
  return pos.entry * (1 + pctToLiq);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const sectionHead = {
  fontFamily:   "'Raleway', sans-serif",
  fontSize:      10,
  fontWeight:    700,
  textTransform: 'uppercase',
  letterSpacing: 1,
};

function priceDecimals(p) { return p > 1000 ? 2 : p > 10 ? 4 : 6; }

function LeverageButton({ val, active, onClick, C }) {
  return (
    <button onClick={() => onClick(val)} style={{
      fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 10,
      height: 26, padding: '0 8px', borderRadius: 4, boxSizing: 'border-box',
      border:  `1px solid ${active ? '#7c6bfa60' : C.border}`,
      background: active ? '#7c6bfa18' : 'transparent',
      color:   active ? '#7c6bfa' : C.muted,
      cursor: 'pointer', transition: 'all 0.12s',
    }}>
      {val}×
    </button>
  );
}

// eslint-disable-next-line no-unused-vars
function SlTpInput({ label, value, onChange, placeholder, color, C }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color, marginBottom: 3 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: C.card, border: `1px solid ${color}44`,
          borderRadius: 4, padding: '5px 7px',
          fontFamily: "'Roboto Mono', monospace", fontSize: 11,
          color: value ? color : C.muted, outline: 'none',
        }}
      />
    </div>
  );
}

function PositionRow({ pos, currentPrice, onClose, C }) {
  const pnl    = calcPnl(pos, currentPrice);
  const pct    = calcPct(pos, currentPrice);
  const liq    = calcLiqPrice(pos);
  const pd     = priceDecimals(currentPrice || pos.entry);
  const pnlCol = pnl >= 0 ? '#10d67a' : '#f85149';
  const sideCol = pos.side === 'LONG' ? '#10d67a' : '#f85149';
  const hasSl  = pos.sl != null;
  const hasTp  = pos.tp != null;

  // Distance-to-SL/TP badges
  const pricePct = (target) =>
    (((target - currentPrice) / currentPrice) * (pos.side === 'LONG' ? 1 : -1) * 100).toFixed(2);

  return (
    <div style={{
      background: C.bg, border: `1px solid ${sideCol}22`,
      borderLeft: `3px solid ${sideCol}`, borderRadius: 5,
      padding: '8px 10px', marginBottom: 6,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ ...sectionHead, color: sideCol, fontSize: 9 }}>
            {pos.side === 'LONG' ? '▲' : '▼'} {pos.side}
          </span>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 10, color: C.muted }}>{pos.symbol}</span>
          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: '#7c6bfa', background: '#7c6bfa18', border: '1px solid #7c6bfa30', padding: '1px 5px', borderRadius: 3 }}>
            {pos.leverage}×
          </span>
        </div>
        <button onClick={() => onClose(pos, 'Manual')} style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
          padding: '2px 8px', borderRadius: 3,
          border: `1px solid ${C.border}`, background: 'transparent',
          color: C.muted, cursor: 'pointer',
        }}>
          Close
        </button>
      </div>

      {/* Price grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 1 }}>Entry</div>
          <div className="mono" style={{ fontSize: 10, color: C.text }}>${fmtPrice(pos.entry, pd)}</div>
        </div>
        <div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 1 }}>Current</div>
          <div className="mono" style={{ fontSize: 10, color: C.text }}>${fmtPrice(currentPrice, pd)}</div>
        </div>
        <div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 1 }}>Liq Price</div>
          <div className="mono" style={{ fontSize: 10, color: '#f97316' }}>${fmtPrice(liq, pd)}</div>
        </div>
      </div>

      {/* SL / TP row */}
      {(hasSl || hasTp) && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, padding: '5px 7px', background: `${C.card}`, borderRadius: 4, border: `1px solid ${C.border}` }}>
          {hasSl && (
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: '#f85149', marginBottom: 1 }}>Stop Loss</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="mono" style={{ fontSize: 10, color: '#f85149' }}>${fmtPrice(pos.sl, pd)}</span>
                {currentPrice && (
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>
                    ({pricePct(pos.sl)}%)
                  </span>
                )}
              </div>
            </div>
          )}
          {hasTp && (
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: '#10d67a', marginBottom: 1 }}>Take Profit</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="mono" style={{ fontSize: 10, color: '#10d67a' }}>${fmtPrice(pos.tp, pd)}</span>
                {currentPrice && (
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>
                    (+{Math.abs(parseFloat(pricePct(pos.tp))).toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* P&L footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 1 }}>Margin</div>
          <div className="mono" style={{ fontSize: 10, color: C.text }}>${fmtPrice(pos.notional, 2)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted, marginBottom: 1 }}>Unrealised P&L</div>
          <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: pnlCol }}>
            {pnl >= 0 ? '+' : ''}${fmtPrice(Math.abs(pnl), 2)}
            <span style={{ fontSize: 9, marginLeft: 4 }}>({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PaperTrading({ ticker, symbol }) {
  const { colors: C } = useTheme();
  const [balance,   setBalance]   = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [size,      setSize]      = useState('500');
  const [leverage,  setLeverage]  = useState(1);
  const [slInput,   setSlInput]   = useState('');
  const [tpInput,   setTpInput]   = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [tab,       setTab]       = useState('positions');
  const [confirmReset, setConfirmReset] = useState(false);
  const confirmTimer = useRef(null);

  // Snapshot ref so price-watcher useEffect doesn't need state in deps
  const snap = useRef({ balance, positions, history });
  useEffect(() => { snap.current = { balance, positions, history }; }, [balance, positions, history]);

  // Load persisted state
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setBalance(saved.balance    ?? STARTING_BALANCE);
      setPositions(saved.positions ?? []);
      setHistory(saved.history    ?? []);
    }
  }, []);

  const currentPrice = ticker?.price;
  const pd           = priceDecimals(currentPrice || 1);

  // Total unrealised P&L
  const totalUnrealised = positions.reduce((s, p) => s + calcPnl(p, currentPrice), 0);
  const totalEquity     = balance + totalUnrealised;

  const persist = useCallback((b, p, h) => saveState(b, p, h), []);

  // ── SL / TP auto-trigger ──────────────────────────────────────────────────
  useEffect(() => {
    if (!currentPrice) return;
    const { balance: bal, positions: pos, history: hist } = snap.current;
    if (!pos.length) return;

    const triggered = [];
    const remaining = [];

    pos.forEach(p => {
      let reason = null;
      if (p.sl != null) {
        if (p.side === 'LONG'  && currentPrice <= p.sl) reason = 'SL';
        if (p.side === 'SHORT' && currentPrice >= p.sl) reason = 'SL';
      }
      if (!reason && p.tp != null) {
        if (p.side === 'LONG'  && currentPrice >= p.tp) reason = 'TP';
        if (p.side === 'SHORT' && currentPrice <= p.tp) reason = 'TP';
      }
      if (reason) triggered.push({ p, reason });
      else remaining.push(p);
    });

    if (!triggered.length) return;

    let newBal = bal;
    const newHist = [...hist];

    triggered.forEach(({ p, reason }) => {
      // Use the exact SL/TP price for pnl accuracy
      const exitPrice = reason === 'SL' ? p.sl : p.tp;
      const pnl  = calcPnl(p, exitPrice);
      const pct  = calcPct(p, exitPrice);
      newBal += p.notional + pnl;
      newHist.unshift({
        ...p,
        closePrice:  exitPrice,
        pnl,
        pctReturn:   pct,
        closeReason: reason,
        closeTime:   new Date().toLocaleString([], {
          month: '2-digit', day: '2-digit',
          hour:  '2-digit', minute: '2-digit', hour12: false,
        }),
      });
    });

    const trimmed = newHist.slice(0, 50);
    setBalance(newBal);
    setPositions(remaining);
    setHistory(trimmed);
    persist(newBal, remaining, trimmed);
  }, [currentPrice, persist]); // price changes only; reads snap for state

  // ── Open position ─────────────────────────────────────────────────────────
  const openPosition = useCallback((side) => {
    if (!currentPrice) return;
    const notional = parseFloat(size) || 0;
    if (notional <= 0 || notional > balance) return;

    const slVal = slInput ? parseFloat(slInput) : null;
    const tpVal = tpInput ? parseFloat(tpInput) : null;

    // Basic validation
    if (slVal != null) {
      if (side === 'LONG'  && slVal >= currentPrice) return alert('Stop loss must be below entry for a LONG');
      if (side === 'SHORT' && slVal <= currentPrice) return alert('Stop loss must be above entry for a SHORT');
    }
    if (tpVal != null) {
      if (side === 'LONG'  && tpVal <= currentPrice) return alert('Take profit must be above entry for a LONG');
      if (side === 'SHORT' && tpVal >= currentPrice) return alert('Take profit must be below entry for a SHORT');
    }

    const pos = {
      id:       Date.now(),
      symbol:   symbol.label,
      side,
      entry:    currentPrice,
      qty:      (notional * leverage) / currentPrice,
      leverage,
      notional,
      sl:       slVal,
      tp:       tpVal,
      openTime: new Date().toLocaleString([], {
        month: '2-digit', day: '2-digit',
        hour:  '2-digit', minute: '2-digit', hour12: false,
      }),
    };

    const newPositions = [...positions, pos];
    const newBalance   = balance - notional;
    setPositions(newPositions);
    setBalance(newBalance);
    persist(newBalance, newPositions, history);
  }, [currentPrice, size, leverage, balance, positions, history, symbol, persist, slInput, tpInput]);

  // ── Manual close ──────────────────────────────────────────────────────────
  const closePosition = useCallback((pos, reason = 'Manual') => {
    const pnl  = calcPnl(pos, currentPrice);
    const pct  = calcPct(pos, currentPrice);
    const returned   = pos.notional + pnl;
    const newBalance = balance + returned;
    const newPos     = positions.filter(p => p.id !== pos.id);
    const record     = {
      ...pos,
      closePrice:  currentPrice,
      pnl,
      pctReturn:   pct,
      closeReason: reason,
      closeTime:   new Date().toLocaleString([], {
        month: '2-digit', day: '2-digit',
        hour:  '2-digit', minute: '2-digit', hour12: false,
      }),
    };
    const newHistory = [record, ...history].slice(0, 50);
    setBalance(newBalance);
    setPositions(newPos);
    setHistory(newHistory);
    persist(newBalance, newPos, newHistory);
  }, [currentPrice, balance, positions, history, persist]);

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      confirmTimer.current = setTimeout(() => setConfirmReset(false), 3000);
    } else {
      clearTimeout(confirmTimer.current);
      setConfirmReset(false);
      setBalance(STARTING_BALANCE);
      setPositions([]);
      setHistory([]);
      persist(STARTING_BALANCE, [], []);
    }
  };

  const sizeNum  = parseFloat(size) || 0;
  const notional = sizeNum * leverage;
  const canTrade = currentPrice && sizeNum > 0 && sizeNum <= balance;

  const totalHistPnl = history.reduce((s, h) => s + (h.pnl || 0), 0);

  // SL/TP distance hints (shown near inputs)
  const slPct = slInput && currentPrice
    ? (((parseFloat(slInput) - currentPrice) / currentPrice) * 100).toFixed(2)
    : null;
  const tpPct = tpInput && currentPrice
    ? (((parseFloat(tpInput) - currentPrice) / currentPrice) * 100).toFixed(2)
    : null;

  return (
    <div style={{
      background: C.card, border: '1px solid #22c55e30',
      borderRadius: 8, padding: 16, marginBottom: 10,
    }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📄</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 12, fontWeight: 700, color: C.bright }}>Paper Trading</div>
              <span style={{
                fontFamily: "'Raleway', sans-serif", fontSize: 8, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 0.8,
                color: '#22c55e', background: '#22c55e18', border: '1px solid #22c55e40',
                padding: '1px 6px', borderRadius: 3,
              }}>Simulated</span>
              {collapsed && (
                <span className="mono" style={{ fontSize: 9, color: totalEquity >= STARTING_BALANCE ? '#10d67a' : '#f85149' }}>
                  ${fmtPrice(totalEquity, 2)}
                </span>
              )}
            </div>
            {!collapsed && (
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>Virtual $10,000 · SL/TP auto-close enabled</div>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: 'pointer', fontSize: 11, padding: '2px 7px', fontFamily: "'Raleway', sans-serif" }}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>

      {!collapsed && <>

        {/* ── Balance row ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <div style={{ flex: 1, background: C.bg, borderRadius: 5, padding: '8px 10px', border: `1px solid ${C.border}` }}>
            <div style={{ ...sectionHead, color: C.muted, fontSize: 8, marginBottom: 3 }}>Available Balance</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: C.bright }}>${fmtPrice(balance, 2)}</div>
          </div>
          <div style={{ flex: 1, background: C.bg, borderRadius: 5, padding: '8px 10px', border: `1px solid ${totalUnrealised >= 0 ? '#10d67a30' : '#f8514930'}` }}>
            <div style={{ ...sectionHead, color: C.muted, fontSize: 8, marginBottom: 3 }}>Equity</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: totalEquity >= STARTING_BALANCE ? '#10d67a' : '#f85149' }}>
              ${fmtPrice(totalEquity, 2)}
              <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.8 }}>
                ({totalEquity >= STARTING_BALANCE ? '+' : ''}{(((totalEquity - STARTING_BALANCE) / STARTING_BALANCE) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>

        {/* ── Order form ── */}
        <div style={{ background: C.bg, borderRadius: 6, padding: '10px 12px', border: `1px solid ${C.border}`, marginBottom: 10 }}>
          <div style={{ ...sectionHead, color: C.muted, marginBottom: 8 }}>New Order — {symbol.label}</div>

          {/* Margin input */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted, marginBottom: 4 }}>Margin (USDT)</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'stretch' }}>
              <input
                type="number"
                value={size}
                onChange={e => setSize(e.target.value)}
                min="1"
                max={balance}
                style={{
                  flex: 1, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 4, padding: '5px 8px', height: 30, boxSizing: 'border-box',
                  fontFamily: "'Roboto Mono', monospace", fontSize: 12,
                  color: C.text, outline: 'none',
                }}
              />
              {[25, 50, 100].map(pct => (
                <button key={pct}
                  onClick={() => setSize((balance * pct / 100).toFixed(2))}
                  style={{
                    fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
                    height: 30, padding: '0 8px', borderRadius: 4, boxSizing: 'border-box',
                    border: `1px solid ${C.border}`, background: 'transparent',
                    color: C.muted, cursor: 'pointer',
                  }}>
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Leverage */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted, marginBottom: 4 }}>Leverage</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {LEVERAGE_OPTIONS.map(l => (
                <LeverageButton key={l} val={l} active={leverage === l} onClick={setLeverage} C={C} />
              ))}
            </div>
          </div>

          {/* SL / TP inputs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: '#f85149' }}>Stop Loss</span>
                {slPct && <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>{slPct}%</span>}
              </div>
              <input
                type="number"
                value={slInput}
                onChange={e => setSlInput(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%', background: C.card,
                  border: `1px solid ${slInput ? '#f8514960' : C.border}`,
                  borderRadius: 4, padding: '5px 7px',
                  fontFamily: "'Roboto Mono', monospace", fontSize: 11,
                  color: slInput ? '#f85149' : C.muted, outline: 'none',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: '#10d67a' }}>Take Profit</span>
                {tpPct && <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>{tpPct > 0 ? '+' : ''}{tpPct}%</span>}
              </div>
              <input
                type="number"
                value={tpInput}
                onChange={e => setTpInput(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%', background: C.card,
                  border: `1px solid ${tpInput ? '#10d67a60' : C.border}`,
                  borderRadius: 4, padding: '5px 7px',
                  fontFamily: "'Roboto Mono', monospace", fontSize: 11,
                  color: tpInput ? '#10d67a' : C.muted, outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Order summary */}
          {sizeNum > 0 && currentPrice && (
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted, marginBottom: 8, padding: '4px 0', borderTop: `1px solid ${C.border}` }}>
              Notional: <span className="mono" style={{ color: C.text }}>${fmtPrice(notional, 2)}</span>
              &nbsp;·&nbsp;
              Entry: <span className="mono" style={{ color: C.text }}>${fmtPrice(currentPrice, pd)}</span>
              {leverage > 1 && <>
                &nbsp;·&nbsp;
                Liq ≈ <span className="mono" style={{ color: '#f97316' }}>
                  ${fmtPrice(currentPrice * (1 - 1/leverage), pd)}
                </span>
              </>}
            </div>
          )}

          {/* Long / Short buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => openPosition('LONG')}
              disabled={!canTrade}
              style={{
                flex: 1, fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 12,
                padding: '8px 0', borderRadius: 5, cursor: canTrade ? 'pointer' : 'not-allowed',
                border: '1px solid #10d67a60', background: '#10d67a18',
                color: canTrade ? '#10d67a' : C.muted, letterSpacing: 0.5, transition: 'all 0.15s',
              }}
            >
              ▲ LONG
            </button>
            <button
              onClick={() => openPosition('SHORT')}
              disabled={!canTrade}
              style={{
                flex: 1, fontFamily: "'Raleway', sans-serif", fontWeight: 700, fontSize: 12,
                padding: '8px 0', borderRadius: 5, cursor: canTrade ? 'pointer' : 'not-allowed',
                border: '1px solid #f8514960', background: '#f8514918',
                color: canTrade ? '#f85149' : C.muted, letterSpacing: 0.5, transition: 'all 0.15s',
              }}
            >
              ▼ SHORT
            </button>
          </div>

          {sizeNum > balance && (
            <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: '#f85149', marginTop: 6 }}>
              ⚠ Insufficient balance
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, alignItems: 'center' }}>
          {['positions', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.8,
              height: 26, padding: '0 10px', borderRadius: 4, cursor: 'pointer',
              boxSizing: 'border-box',
              border: `1px solid ${tab === t ? '#7c6bfa60' : C.border}`,
              background: tab === t ? '#7c6bfa18' : 'transparent',
              color: tab === t ? '#7c6bfa' : C.muted,
            }}>
              {t === 'positions' ? `Positions (${positions.length})` : `History (${history.length})`}
            </button>
          ))}
          <button onClick={handleReset} style={{
            marginLeft: 'auto',
            fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 700,
            height: 26, padding: '0 10px', borderRadius: 4, cursor: 'pointer',
            boxSizing: 'border-box',
            border: `1px solid ${confirmReset ? '#f8514960' : C.border}`,
            background: confirmReset ? '#f8514918' : 'transparent',
            color: confirmReset ? '#f85149' : C.muted,
          }}>
            {confirmReset ? 'Confirm Reset' : 'Reset'}
          </button>
        </div>

        {/* ── Positions tab ── */}
        {tab === 'positions' && (
          <div>
            {positions.length === 0 ? (
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted, textAlign: 'center', padding: '16px 0' }}>
                No open positions
              </div>
            ) : (
              positions.map(pos => (
                <PositionRow key={pos.id} pos={pos} currentPrice={currentPrice} onClose={closePosition} C={C} />
              ))
            )}
            {positions.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>
                  Unrealised:&nbsp;
                  <span className="mono" style={{ color: totalUnrealised >= 0 ? '#10d67a' : '#f85149', fontWeight: 700 }}>
                    {totalUnrealised >= 0 ? '+' : ''}${fmtPrice(Math.abs(totalUnrealised), 2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── History tab ── */}
        {tab === 'history' && (
          <div>
            {history.length === 0 ? (
              <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 11, color: C.muted, textAlign: 'center', padding: '16px 0' }}>
                No closed trades yet
              </div>
            ) : (
              <>
                {history.map((h, i) => {
                  const pnlCol  = h.pnl >= 0 ? '#10d67a' : '#f85149';
                  const sideCol = h.side === 'LONG' ? '#10d67a' : '#f85149';
                  const hpd     = priceDecimals(h.entry);
                  const reasonColor =
                    h.closeReason === 'TP' ? '#10d67a' :
                    h.closeReason === 'SL' ? '#f85149' : C.muted;
                  return (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '6px 8px', marginBottom: 3,
                      background: C.bg, borderRadius: 4,
                      border: `1px solid ${C.border}`, borderLeft: `3px solid ${sideCol}`,
                    }}>
                      <div>
                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', marginBottom: 2 }}>
                          <span style={{ ...sectionHead, fontSize: 8, color: sideCol }}>
                            {h.side === 'LONG' ? '▲' : '▼'} {h.side}
                          </span>
                          <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>
                            {h.symbol} · {h.leverage}×
                          </span>
                          {h.closeReason && (
                            <span style={{
                              fontFamily: "'Raleway', sans-serif", fontSize: 7, fontWeight: 700,
                              color: reasonColor, background: `${reasonColor}18`,
                              border: `1px solid ${reasonColor}40`,
                              padding: '1px 4px', borderRadius: 2, letterSpacing: 0.5,
                            }}>
                              {h.closeReason}
                            </span>
                          )}
                        </div>
                        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>
                          <span className="mono">${fmtPrice(h.entry, hpd)}</span>
                          {' → '}
                          <span className="mono">${fmtPrice(h.closePrice, hpd)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: pnlCol }}>
                          {h.pnl >= 0 ? '+' : ''}${fmtPrice(Math.abs(h.pnl), 2)}
                        </div>
                        <div style={{ fontFamily: "'Raleway', sans-serif", fontSize: 8, color: C.muted }}>{h.closeTime}</div>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: "'Raleway', sans-serif", fontSize: 9, color: C.muted }}>
                    Realised total:&nbsp;
                    <span className="mono" style={{ color: totalHistPnl >= 0 ? '#10d67a' : '#f85149', fontWeight: 700 }}>
                      {totalHistPnl >= 0 ? '+' : ''}${fmtPrice(Math.abs(totalHistPnl), 2)}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

      </>}
    </div>
  );
}
