/**
 * Pure exchange with two goods and any number of agents.
 *
 * Prices are normalised with p_Y = 1, so a price is the single number
 * p = p_X / p_Y (Benz per ton of milk). Demand is a correspondence, so
 * excess demand is an interval; an equilibrium is a price at which zero lies
 * in the aggregate excess-demand interval.
 */
import { Aggregate, aggregate, goldenMax } from './aggregate';
import { DemandSeg, Utility, U, demand, icKinks, icY, mrs, pick, segX } from './utility';

export interface Agent {
  id: string;
  name: string;
  u: Utility;
  e: [number, number]; // endowment (milk, Benz)
}

export interface Bundle {
  x: number;
  y: number;
}

export interface Equilibrium {
  p: number;
  bundles: Bundle[]; // in agent order
}

export function totals(agents: Agent[]): [number, number] {
  return agents.reduce<[number, number]>((s, a) => [s[0] + a.e[0], s[1] + a.e[1]], [0, 0]);
}

export const wealth = (a: Agent, p: number) => p * a.e[0] + a.e[1];

export function demandAt(a: Agent, p: number): DemandSeg {
  return demand(a.u, p, 1, wealth(a, p));
}

/** Aggregate excess demand for milk as an interval, with each farmer's part. */
export function excessX(agents: Agent[], p: number) {
  let lo = 0;
  let hi = 0;
  const parts = agents.map((a) => {
    const r = segX(demandAt(a, p));
    lo += r.lo - a.e[0];
    hi += r.hi - a.e[0];
    return { id: a.id, lo: r.lo - a.e[0], hi: r.hi - a.e[0] };
  });
  return { lo, hi, parts };
}

/** Market (gross) demand for milk at p: the horizontal sum of individual demands. */
export function marketDemandX(agents: Agent[], p: number, theta = 0.5): Aggregate {
  return aggregate(agents.map((a) => ({ id: a.id, value: pick(demandAt(a, p), theta)[0] })));
}

/** Signed distance of 0 from the excess-demand interval: >0 price too low, <0 too high. */
function gap(agents: Agent[], p: number): number {
  const z = excessX(agents, p);
  if (z.lo > 0) return z.lo;
  if (z.hi < 0) return z.hi;
  return 0;
}

/** Prices at which some demand is set-valued (linear preferences: p = a/b). */
function specialPrices(agents: Agent[]): number[] {
  return agents.filter((a) => a.u.kind === 'linear').map((a) => (a.u as { a: number; b: number }).a / (a.u as { a: number; b: number }).b);
}

/** Pick bundles at price p that clear the milk market (and hence Benz, by Walras' law). */
export function clearingBundles(agents: Agent[], p: number): Bundle[] {
  const [X] = totals(agents);
  const segs = agents.map((a) => demandAt(a, p));
  const ranges = segs.map(segX);
  const sumLo = ranges.reduce((s, r) => s + r.lo, 0);
  const width = ranges.reduce((s, r) => s + (r.hi - r.lo), 0);
  const lam = width > 1e-15 ? Math.min(1, Math.max(0, (X - sumLo) / width)) : 0;
  return agents.map((a, i) => {
    const r = ranges[i];
    const x = r.lo + lam * (r.hi - r.lo);
    return { x, y: wealth(a, p) - p * x };
  });
}

/**
 * All competitive equilibria, found by a log-price scan with bisection on each
 * sign change, plus exact checks at the prices where demand is set-valued.
 * This is the reported equilibrium; animation never decides anything.
 */
export function solveEquilibria(agents: Agent[], range: [number, number] = [-5, 5]): Equilibrium[] {
  const [X] = totals(agents);
  const tol = 1e-9 * Math.max(1, X);
  const found: number[] = [];
  const N = 2000;
  let prevP = Math.pow(10, range[0]);
  let prevG = gap(agents, prevP);
  for (let i = 1; i <= N; i++) {
    const p = Math.pow(10, range[0] + ((range[1] - range[0]) * i) / N);
    const g = gap(agents, p);
    if (g === 0 && prevG !== 0) found.push(p);
    else if (prevG > 0 && g < 0) {
      let lo = Math.log(prevP);
      let hi = Math.log(p);
      for (let k = 0; k < 200; k++) {
        const mid = (lo + hi) / 2;
        const gm = gap(agents, Math.exp(mid));
        if (gm === 0) {
          lo = hi = mid;
          break;
        }
        if (gm > 0) lo = mid;
        else hi = mid;
      }
      found.push(Math.exp((lo + hi) / 2));
    }
    prevP = p;
    prevG = g;
  }
  for (const s of specialPrices(agents)) {
    const z = excessX(agents, s);
    if (z.lo <= tol && z.hi >= -tol) found.push(s);
  }
  // snap near-special roots onto the special price, then dedupe
  const specials = specialPrices(agents);
  const snapped = found.map((p) => specials.find((s) => Math.abs(Math.log(p / s)) < 1e-7) ?? p);
  const uniq: number[] = [];
  for (const p of snapped.sort((a, b) => a - b)) {
    if (!uniq.some((q) => Math.abs(Math.log(p / q)) < 1e-6)) uniq.push(p);
  }
  return uniq.map((p) => ({ p, bundles: clearingBundles(agents, p) }));
}

/** One step of Walrasian tâtonnement in log price (for animation only). */
export function tatonnementStep(agents: Agent[], p: number, speed = 0.08): number {
  const [X] = totals(agents);
  const z = excessX(agents, p);
  const mid = (z.lo + z.hi) / 2;
  const step = Math.max(-0.25, Math.min(0.25, (speed * mid) / Math.max(1e-9, X / agents.length)));
  return Math.exp(Math.log(p) + step);
}

/**
 * Provisional (recontractable) trades at price p: every farmer wants to move
 * from the endowment to the planned bundle; the long side of the milk market
 * is rationed pro rata. Each holding stays on that farmer's budget line, the
 * allocation is always feasible, and at the equilibrium price nobody is
 * rationed, so the holdings coincide with the equilibrium allocation.
 */
export function rationedHoldings(agents: Agent[], p: number, theta = 0.5): Bundle[] {
  const plans = agents.map((a) => pick(demandAt(a, p), theta));
  let buy = 0;
  let sell = 0;
  plans.forEach((pl, i) => {
    const d = pl[0] - agents[i].e[0];
    if (d > 0) buy += d;
    else sell -= d;
  });
  const traded = Math.min(buy, sell);
  const sBuy = buy > 0 ? traded / buy : 0;
  const sSell = sell > 0 ? traded / sell : 0;
  return agents.map((a, i) => {
    const dx = plans[i][0] - a.e[0];
    const s = dx > 0 ? sBuy : sSell;
    const x = a.e[0] + s * dx;
    return { x, y: a.e[1] - p * (x - a.e[0]) };
  });
}

/* ------------------------------------------------------------------ */
/* Two agents: the Edgeworth box (all coordinates are A's).            */
/* ------------------------------------------------------------------ */

export interface Box {
  A: Utility;
  B: Utility;
  X: number;
  Y: number;
}

export const uA = (b: Box, x: number, y: number) => U(b.A, x, y);
export const uB = (b: Box, x: number, y: number) => U(b.B, b.X - x, b.Y - y);

/** MRS of both farmers at an allocation (A holds (x, y)). */
export function boxMRS(b: Box, x: number, y: number) {
  return { A: mrs(b.A, x, y), B: mrs(b.B, b.X - x, b.Y - y) };
}

/** Best allocation for B on A's indifference curve at level `level` (A coordinates). */
export function bestForB(b: Box, level: number): Bundle | null {
  const feasible = (x: number) => icY(b.A, x, level) <= b.Y + 1e-12;
  const g = (x: number) => {
    const y = icY(b.A, x, level);
    return y > b.Y + 1e-12 ? -Infinity : U(b.B, b.X - x, b.Y - y);
  };
  const n = 160;
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) xs.push((b.X * i) / n);
  for (const k of icKinks(b.A, level)) if (k >= 0 && k <= b.X) xs.push(k);
  xs.sort((s, t) => s - t);
  let best = -1;
  let bestV = -Infinity;
  xs.forEach((x, i) => {
    if (!feasible(x)) return;
    const v = g(x);
    if (v > bestV) {
      bestV = v;
      best = i;
    }
  });
  if (best < 0) return null;
  let xBest = xs[best];
  const lo = xs[Math.max(0, best - 1)];
  const hi = xs[Math.min(xs.length - 1, best + 1)];
  if (hi > lo) {
    const xr = goldenMax((x) => (feasible(x) ? g(x) : -1e300), lo, hi);
    if (g(xr) > bestV) xBest = xr;
  }
  return { x: xBest, y: icY(b.A, xBest, level) };
}

/**
 * The set of Pareto-efficient allocations, computed generically as
 * argmax U_B subject to U_A ≥ ū, sweeping ū from U_A(0,0) to U_A(X,Y).
 * Corner pieces along the edges of the box come out of the same computation.
 */
export function contractCurve(b: Box, n = 220): Bundle[] {
  const u0 = U(b.A, 0, 0);
  const u1 = U(b.A, b.X, b.Y);
  const out: Bundle[] = [];
  for (let i = 0; i <= n; i++) {
    const level = u0 + ((u1 - u0) * i) / n;
    const pt = i === n ? { x: b.X, y: b.Y } : bestForB(b, level);
    if (pt) out.push(pt);
  }
  return out;
}

/** Is the allocation Pareto efficient? (No one can gain without another losing.) */
export function isEfficient(b: Box, x: number, y: number, rel = 1e-6): boolean {
  const level = U(b.A, x, y);
  const cur = uB(b, x, y);
  const best = bestForB(b, level);
  if (!best) return true;
  const v = uB(b, best.x, best.y);
  return v <= cur + rel * Math.max(1, Math.abs(cur));
}

/**
 * The lens of mutual improvement through (x, y), as a polygon in A's
 * coordinates, or null if empty. Lower edge: A's indifference curve; upper
 * edge: B's indifference curve seen from A's origin.
 */
export function lens(b: Box, x0: number, y0: number, n = 240): [number, number][] | null {
  const la = U(b.A, x0, y0);
  const lb = uB(b, x0, y0);
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) xs.push((b.X * i) / n);
  xs.push(x0, ...icKinks(b.A, la), ...icKinks(b.B, lb).map((k) => b.X - k));
  xs.sort((s, t) => s - t);
  const top: [number, number][] = [];
  const bot: [number, number][] = [];
  for (const x of xs) {
    if (x < 0 || x > b.X) continue;
    const lo = Math.max(0, icY(b.A, x, la));
    const up = Math.min(b.Y, b.Y - icY(b.B, b.X - x, lb));
    if (up - lo > 1e-9 * Math.max(1, b.Y)) {
      top.push([x, up]);
      bot.push([x, lo]);
    }
  }
  if (top.length < 2) return null;
  // the area must be non-trivial
  let area = 0;
  for (let i = 1; i < top.length; i++) {
    area += ((top[i][1] - bot[i][1] + top[i - 1][1] - bot[i - 1][1]) / 2) * (top[i][0] - top[i - 1][0]);
  }
  if (area < 1e-6 * b.X * b.Y) return null;
  return [...top, ...bot.reverse()];
}

/** Utility possibility frontier: the image of the contract curve in (U_A, U_B). */
export function upf(b: Box, n = 220): { uA: number; uB: number; x: number; y: number }[] {
  return contractCurve(b, n).map((pt) => ({ uA: uA(b, pt.x, pt.y), uB: uB(b, pt.x, pt.y), x: pt.x, y: pt.y }));
}

export function boxAgents(b: Box, eA: [number, number], names: [string, string] = ['A', 'B']): Agent[] {
  return [
    { id: 'A', name: names[0], u: b.A, e: eA },
    { id: 'B', name: names[1], u: b.B, e: [b.X - eA[0], b.Y - eA[1]] },
  ];
}

/** The first preset: U_A = X + 3Y, U_B = XY, endowments (3,3) and (9,9). */
export const EXAM_BOX: Box = { A: { kind: 'linear', a: 1, b: 3 }, B: { kind: 'cd', a: 1, b: 1 }, X: 12, Y: 12 };
export const EXAM_ENDOWMENT: [number, number] = [3, 3];
