/**
 * The market square: N farmers trading milk for Benz.
 *
 * A per-ton tax τ on milk traded (paid by the buyer, in Benz) drives a wedge:
 * buyers face p + τ, sellers p. Revenue is rebated lump-sum, equally, so the
 * only loss is the misallocation. That loss is measured as Allais' surplus:
 * the Benz that could be confiscated if, holding everyone at their taxed
 * utility, the milk were reallocated efficiently.
 */
import { aggregate, bisect, rng } from './aggregate';
import { Agent, Bundle, totals } from './exchange';
import { U, Utility, demand, expenditure, hicksX, mrsPoint, pick } from './utility';

export const FIRST = [
  'Agnes', 'Bruno', 'Clara', 'Dmitri', 'Edda', 'Folke', 'Greta', 'Hugo', 'Ines', 'Jonas', 'Kaja', 'Lorenz',
  'Mira', 'Niels', 'Olga', 'Piet', 'Quirin', 'Rosa', 'Sven', 'Tilde', 'Ulla', 'Vito', 'Wanda', 'Xaver', 'Yrsa', 'Zeno',
];

/** N farmers with heterogeneous Cobb–Douglas tastes and lopsided endowments. */
export function makeFarmers(n: number, seed = 7, spread = 1): Agent[] {
  const r = rng(seed);
  const out: Agent[] = [];
  for (let i = 0; i < n; i++) {
    const a = 0.5 + spread * r.uniform(-0.32, 0.32);
    const milkHeavy = r.next() < 0.5;
    const ex = milkHeavy ? r.uniform(14, 34) : r.uniform(2, 12);
    const ey = milkHeavy ? r.uniform(0.2, 1.4) : r.uniform(1.6, 3.6);
    const name = FIRST[i % FIRST.length] + (i >= FIRST.length ? ` ${Math.floor(i / FIRST.length) + 1}` : '');
    out.push({ id: `f${i}`, name, u: { kind: 'cd', a, b: 1 - a }, e: [ex, ey] });
  }
  return out;
}

export type Side = 'buyer' | 'seller' | 'none';

export interface TaxedChoice {
  x: number;
  y: number;
  side: Side;
}

/** Demand on the kinked budget set: buy milk at p + τ, sell at p, plus a lump-sum rebate r. */
export function taxedChoice(u: Utility, e: [number, number], p: number, tau: number, r: number): TaxedChoice {
  const pb = p + tau;
  const db = pick(demand(u, pb, 1, pb * e[0] + e[1] + r));
  if (db[0] > e[0] + 1e-12) return { x: db[0], y: db[1], side: 'buyer' };
  const ds = pick(demand(u, p, 1, p * e[0] + e[1] + r));
  if (ds[0] < e[0] - 1e-12) return { x: ds[0], y: ds[1], side: 'seller' };
  return { x: e[0], y: e[1] + r, side: 'none' };
}

export interface TaxedEquilibrium {
  p: number; // seller price
  tau: number;
  rebate: number; // per farmer, in Benz
  choices: TaxedChoice[];
  volume: number; // milk traded
}

export function taxedEquilibrium(agents: Agent[], tau: number): TaxedEquilibrium {
  const [X] = totals(agents);
  const n = agents.length;
  let r = 0;
  let p = 1;
  let choices: TaxedChoice[] = [];
  for (let it = 0; it < 200; it++) {
    const z = (lp: number) => {
      const pp = Math.exp(lp);
      return agents.reduce((s, a) => s + taxedChoice(a.u, a.e, pp, tau, r).x, 0) - X;
    };
    p = Math.exp(bisect(z, Math.log(1e-6), Math.log(1e6)));
    choices = agents.map((a) => taxedChoice(a.u, a.e, p, tau, r));
    const vol = choices.reduce((s, c, i) => s + (c.side === 'buyer' ? c.x - agents[i].e[0] : 0), 0);
    const rNew = (tau * vol) / n;
    if (Math.abs(rNew - r) < 1e-12) {
      r = rNew;
      break;
    }
    r = rNew;
  }
  const volume = choices.reduce((s, c, i) => s + (c.side === 'buyer' ? c.x - agents[i].e[0] : 0), 0);
  return { p, tau, rebate: r, choices, volume };
}

/**
 * Allais surplus (in Benz): with utilities u_i held fixed, the cheapest way to
 * deliver them at a common price uses Σ e_i(p, u_i); what is left of the
 * economy's resources is pure waste. Zero exactly at a Pareto-efficient
 * allocation.
 */
export function allaisSurplus(agents: Agent[], bundles: Bundle[]) {
  const [X, Y] = totals(agents);
  const levels = agents.map((a, i) => U(a.u, bundles[i].x, bundles[i].y));
  const z = (lp: number) => {
    const p = Math.exp(lp);
    return agents.reduce((s, a, i) => s + hicksX(a.u, p, 1, levels[i]), 0) - X;
  };
  const p = Math.exp(bisect(z, Math.log(1e-6), Math.log(1e6)));
  const parts = agents.map((a, i) => ({ id: a.id, value: expenditure(a.u, p, 1, levels[i]) }));
  const cost = aggregate(parts);
  return { p, surplus: p * X + Y - cost.total, cost };
}



/** MRS of every farmer at given holdings (the needles). */
export function needles(agents: Agent[], holdings: Bundle[]): number[] {
  return agents.map((a, i) => mrsPoint(a.u, holdings[i].x, holdings[i].y));
}

/** Histogram of log MRS (the needles collapse to a spike at the equilibrium). */
export function histogram(values: number[], lo: number, hi: number, bins: number): number[] {
  const h = new Array(bins).fill(0);
  for (const v of values) {
    if (!isFinite(v) || v <= 0) continue;
    const t = (Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo));
    const k = Math.min(bins - 1, Math.max(0, Math.floor(t * bins)));
    h[k] += 1;
  }
  return h;
}

export function dispersion(values: number[]): number {
  const logs = values.filter((v) => isFinite(v) && v > 0).map(Math.log);
  if (logs.length < 2) return 0;
  const m = logs.reduce((s, v) => s + v, 0) / logs.length;
  return Math.sqrt(logs.reduce((s, v) => s + (v - m) ** 2, 0) / logs.length);
}
