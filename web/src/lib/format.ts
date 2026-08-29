const nf = new Intl.NumberFormat("en-US");
export const num = (n: number | string | bigint) => nf.format(typeof n === "string" ? Number(n) : n);
export const short = (h: string, n = 6) => (h.length > 2 * n + 2 ? `${h.slice(0, n + 2)}…${h.slice(-n)}` : h);
export const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
/** Ethereum blocks → human duration (12 s/block) */
export const blocksToDuration = (b: number | string) => { const s = Number(b) * 12; const d = s / 86400; if (d >= 365) return `${(d / 365).toFixed(1)} yr`; if (d >= 30) return `${Math.round(d / 30)} mo`; if (d >= 1) return `${Math.round(d)} d`; return `${Math.round(s / 3600)} h`; };
