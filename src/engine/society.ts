/**
 * Social welfare: W(U_1, …, U_n) and nothing else.
 *
 * The family used throughout is Atkinson's: W = n · EDE, where
 * EDE = ( (1/n) Σ U_i^{1−ε} )^{1/(1−ε)} is the equally-distributed-equivalent
 * utility. ε = 0 is utilitarian (W = Σ U_i), ε → ∞ is Rawlsian (W = n · min U_i),
 * ε = 1 is the Nash/Bernoulli product (geometric mean).
 */
import { aggregate, bisect } from './aggregate';

export const RAWLS = Infinity;

export function ede(us: number[], eps: number): number {
  const n = us.length;
  if (n === 0) return 0;
  if (eps === 0) return us.reduce((s, u) => s + u, 0) / n;
  if (!isFinite(eps)) return Math.min(...us);
  if (us.some((u) => u <= 0)) return eps >= 1 ? 0 : Math.pow(us.reduce((s, u) => s + Math.pow(Math.max(0, u), 1 - eps), 0) / n, 1 / (1 - eps));
  if (Math.abs(eps - 1) < 1e-9) return Math.exp(us.reduce((s, u) => s + Math.log(u), 0) / n);
  return Math.pow(us.reduce((s, u) => s + Math.pow(u, 1 - eps), 0) / n, 1 / (1 - eps));
}

export function W(us: number[], eps: number): number {
  return us.length * ede(us, eps);
}

/**
 * W together with each person's piece. For the decomposition we show each
 * person's transformed utility φ(U_i) (the term that is averaged), and its
 * share of Σ φ; for Rawls the piece is 1 for the worst-off and 0 otherwise.
 */
export function welfareParts(us: number[], ids: string[], eps: number) {
  const phi = (u: number) => {
    if (eps === 0) return u;
    if (!isFinite(eps)) return u;
    if (Math.abs(eps - 1) < 1e-9) return Math.log(Math.max(u, 1e-12));
    return Math.pow(Math.max(u, 1e-12), 1 - eps) / (1 - eps);
  };
  const min = Math.min(...us);
  const parts = us.map((u, i) => ({ id: ids[i], value: !isFinite(eps) ? (u === min ? u : 0) : phi(u) }));
  return { W: W(us, eps), ede: ede(us, eps), phi: aggregate(parts) };
}

/** Map a slider t ∈ [0, 1] to ε ∈ [0, ∞]: t = 1 is exactly Rawls. */
export function epsFromSlider(t: number): number {
  if (t >= 0.999) return RAWLS;
  return (8 * t) / (1 - t);
}

/** Contour of W through level w for two people: U_B as a function of U_A. */
export function contourUB(uA: number, w: number, eps: number): number {
  if (!isFinite(eps)) return uA >= w / 2 - 1e-12 ? w / 2 : Infinity;
  if (eps === 0) return w - uA;
  if (W([uA, 0], eps) >= w) return 0;
  const hi = Math.max(w * 10, 1);
  if (W([uA, hi], eps) < w) return Infinity;
  return bisect((ub) => W([uA, ub], eps) - w, 0, hi);
}

/**
 * Okun's leaky bucket between a richer and a poorer person with utility
 * u(c) = c^ρ (0 < ρ ≤ 1). A transfer t from rich to poor arrives as (1 − leak) t.
 */
export function leakyFrontier(cRich: number, cPoor: number, leak: number, rho: number, n = 120) {
  const u = (c: number) => Math.pow(Math.max(0, c), rho);
  const pts: { t: number; uRich: number; uPoor: number }[] = [];
  // transfers in either direction, so the whole frontier is visible
  const tMin = -cPoor;
  const tMax = cRich;
  for (let i = 0; i <= n; i++) {
    const t = tMin + ((tMax - tMin) * i) / n;
    // the leak applies to whichever way the money travels
    const recv = t >= 0 ? (1 - leak) * t : t;
    const give = t >= 0 ? t : (1 - leak) * t;
    const cr = cRich - give;
    const cp = cPoor + recv;
    if (cr < -1e-9 || cp < -1e-9) continue;
    pts.push({ t, uRich: u(cr), uPoor: u(cp) });
  }
  return pts;
}

/** The welfare-maximising transfer from rich to poor under a leaky bucket. */
export function bestTransfer(cRich: number, cPoor: number, leak: number, rho: number, eps: number) {
  const u = (c: number) => Math.pow(Math.max(0, c), rho);
  let best = { t: 0, W: -Infinity };
  const n = 2000;
  for (let i = 0; i <= n; i++) {
    const t = (cRich * i) / n;
    const w = W([u(cRich - t), u(cPoor + (1 - leak) * t)], eps);
    if (w > best.W + 1e-12) best = { t, W: w };
  }
  return best;
}
