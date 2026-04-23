export const fmtPrice = (v, decimals = 2) => {
  if (v == null || !isFinite(v)) return '—';
  return (+v).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export const fmtVolume = (v) => {
  if (v == null) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
};

export const fmtPct = (v) => {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${(+v).toFixed(2)}%`;
};

export const fmtTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

export const fmtDateTime = (date) => {
  if (!date) return '';
  const day = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `${day} · ${time}`;
};

// Compact price axis labels  e.g. 92345.12 → $92.3K or $92,345
export const fmtAxis = (v) => {
  if (v == null || !isFinite(v)) return '';
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  if (Math.abs(v) >= 1)    return `$${v.toFixed(2)}`;
  return `$${v.toFixed(4)}`;
};
