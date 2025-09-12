// small shared helpers
export function parseHumanNumber(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.trim().replace(/,/g, '').toUpperCase();
  const m = t.match(/^([0-9]*\.?[0-9]+)\s*([KM]?)$/);
  if (!m) {
    const num = Number(t.replace(/[^\d.]/g, ''));
    return Number.isFinite(num) ? num : null;
  }
  const val = parseFloat(m[1]);
  const suffix = m[2];
  if (!Number.isFinite(val)) return null;
  if (suffix === 'K') return Math.round(val * 1_000);
  if (suffix === 'M') return Math.round(val * 1_000_000);
  return Math.round(val);
}

export function textNodes(): string {
  return document.body ? document.body.innerText : '';
}

export function firstNonEmptyLine(): string | null {
  const l = textNodes()
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  return l.length ? l[0] : null;
}
