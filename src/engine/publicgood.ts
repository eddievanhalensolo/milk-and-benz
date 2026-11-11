/**
 * Public goods: the Milchstraße.
 *
 * Each resident i has a linear marginal benefit MB_i(Q) = max(0, α_i − β_i Q)
 * (the inverse of a demand curve Q = α_i/β_i − P/β_i). A private good adds up
 * horizontally (quantities at a price); a public good adds up vertically
 * (willingness to pay at a quantity), because everyone consumes the same Q.
 */
import { Aggregate, aggregate, bisect } from './aggregate';

export interface Resident {
  id: string;
  name: string;
  alpha: number;
  beta: number;
}

export const mb = (r: Resident, q: number) => Math.max(0, r.alpha - r.beta * q);
export const mbArea = (r: Resident, q: number) => {
  const qc = Math.min(Math.max(0, q), r.alpha / r.beta);
  return r.alpha * qc - (r.beta / 2) * qc * qc;
};

/** Vertical sum: social marginal benefit at Q, with every resident's part. */
export function smb(rs: Resident[], q: number): Aggregate {
  return aggregate(rs.map((r) => ({ id: r.id, value: mb(r, q) })));
}

/** Horizontal sum, for contrast: quantity demanded at price P (as if it were private). */
export function horizontalDemand(rs: Resident[], P: number): Aggregate {
  return aggregate(rs.map((r) => ({ id: r.id, value: Math.max(0, (r.alpha - P) / r.beta) })));
}

/** Samuelson: Σ MB_i(Q) = MC. */
export function efficientQ(rs: Resident[], MC: number): number {
  const qmax = Math.max(...rs.map((r) => r.alpha / r.beta));
  if (smb(rs, 0).total <= MC) return 0;
  return bisect((q) => smb(rs, q).total - MC, 0, qmax);
}

/** The quantity resident i wants given its tax price t per unit (MB_i = t). */
export const wanted = (r: Resident, t: number) => Math.max(0, (r.alpha - t) / r.beta);

export interface MechanismResult {
  requests: number[]; // additional units asked for
  average: number;
  built: number; // additional units built (after rounding)
  total: number; // prebuilt + built
}

/**
 * The average rule: each resident states how many (additional) units it wants
 * given its tax price; the town builds the average, rounded down.
 * With `prebuilt` units already provided, a resident who wants q in total asks
 * for max(0, q − prebuilt) more.
 */
export function averageRule(rs: Resident[], shares: number[], prebuilt = 0, stated?: (number | null)[]): MechanismResult {
  const requests = rs.map((r, i) => {
    const s = stated?.[i];
    if (s !== undefined && s !== null) return Math.max(0, s);
    return Math.max(0, wanted(r, shares[i]) - prebuilt);
  });
  const average = requests.reduce((s, v) => s + v, 0) / rs.length;
  const built = Math.floor(average + 1e-9);
  return { requests, average, built, total: prebuilt + built };
}

/** Homework variant: build the largest number asked for. */
export function maxRule(rs: Resident[], shares: number[]): MechanismResult {
  const requests = rs.map((r, i) => wanted(r, shares[i]));
  const built = Math.max(...requests);
  return { requests, average: requests.reduce((s, v) => s + v, 0) / rs.length, built, total: built };
}

/**
 * Personalised shares (MC/2 + x for the high-demand resident, MC/2 − x for
 * the other) chosen so that both ask for the same quantity: Lindahl pricing.
 */
export function unanimity(high: Resident, low: Resident, MC: number) {
  // α_h − β_h Q = MC/2 + x and α_l − β_l Q = MC/2 − x, sum → Samuelson
  const Q = Math.max(0, (high.alpha + low.alpha - MC) / (high.beta + low.beta));
  const x = high.alpha - high.beta * Q - MC / 2;
  return { Q, x, taxHigh: MC / 2 + x, taxLow: MC / 2 - x };
}

/** General Lindahl prices: t_i = MB_i(Q*). */
export function lindahlPrices(rs: Resident[], MC: number) {
  const Q = efficientQ(rs, MC);
  return { Q, prices: rs.map((r) => mb(r, Q)) };
}

/** Resident i's true surplus from Q units when paying t per unit on `paidUnits`. */
export function surplus(r: Resident, Q: number, t: number, paidUnits = Q) {
  return mbArea(r, Q) - t * paidUnits;
}

/**
 * Lying under the average rule: resident i states s, others are truthful.
 * Returns i's true payoff from the resulting quantity.
 */
export function payoffFromStatement(rs: Resident[], shares: number[], i: number, s: number, prebuilt = 0) {
  const stated = rs.map((_, j) => (j === i ? s : null));
  const res = averageRule(rs, shares, prebuilt, stated);
  return { ...res, payoff: surplus(rs[i], res.total, shares[i], res.built) };
}

/** Best statement for resident i under the average rule (grid over half-units). */
export function bestStatement(rs: Resident[], shares: number[], i: number, prebuilt = 0, max = 40) {
  let best = { s: 0, payoff: -Infinity, total: 0 };
  for (let k = 0; k <= max * 2; k++) {
    const s = k / 2;
    const r = payoffFromStatement(rs, shares, i, s, prebuilt);
    if (r.payoff > best.payoff + 1e-9) best = { s, payoff: r.payoff, total: r.total };
  }
  return best;
}

/**
 * Lying under the 10 ± x scheme: the high-demand resident reports intercept
 * α' (slope kept), the government solves for unanimity on reports, the
 * resident pays its personalised price on the resulting Q.
 */
export function lindahlLie(high: Resident, low: Resident, MC: number, reportedAlpha: number) {
  const rep = { ...high, alpha: reportedAlpha };
  const u = unanimity(rep, low, MC);
  return { ...u, payoff: surplus(high, u.Q, u.taxHigh) };
}

export function bestLindahlLie(high: Resident, low: Resident, MC: number) {
  let best = { alpha: high.alpha, payoff: -Infinity, Q: 0 };
  const lo = Math.max(0, MC / 2);
  for (let k = 0; k <= 400; k++) {
    const a = lo + ((high.alpha * 1.5 - lo) * k) / 400;
    const r = lindahlLie(high, low, MC, a);
    if (r.payoff > best.payoff) best = { alpha: a, payoff: r.payoff, Q: r.Q };
  }
  return best;
}

/** Voluntary contribution with linear MB and quasi-linear money: only the keenest pays. */
export function voluntaryLinear(rs: Resident[], MC: number) {
  const each = rs.map((r) => wanted(r, MC));
  const Q = Math.max(0, ...each);
  const payer = each.indexOf(Q);
  return { Q, each, payer: Q > 0 ? payer : -1 };
}

/**
 * Voluntary contribution with U_i = a ln x_i + b ln M (prices 1, incomes m_i),
 * optional government provision G0 financed by taxes T_i. Nash equilibrium by
 * best-response iteration: g_i = max(0, (b(m_i − T_i) − a M_{−i}) / (a + b)).
 */
export function voluntaryLog(a: number, b: number, incomes: number[], G0 = 0, taxes?: number[]) {
  const n = incomes.length;
  const T = taxes ?? incomes.map(() => G0 / n);
  let g = incomes.map(() => 0);
  for (let it = 0; it < 5000; it++) {
    let delta = 0;
    for (let i = 0; i < n; i++) {
      const others = G0 + g.reduce((s, v, j) => (j === i ? s : s + v), 0);
      const gi = Math.max(0, (b * (incomes[i] - T[i]) - a * others) / (a + b));
      delta = Math.max(delta, Math.abs(gi - g[i]));
      g[i] = g[i] + 0.5 * (gi - g[i]);
    }
    if (delta < 1e-12) break;
  }
  const M = G0 + g.reduce((s, v) => s + v, 0);
  return { contributions: g, M, private: M - G0 };
}

/** Samuelson optimum for identical log utilities with equal cost shares. */
export function samuelsonLog(a: number, b: number, incomes: number[]) {
  // Σ_i (b/M)/(a/x_i) = 1 with x_i = m_i − M/n  →  (b/(aM)) (Σ m_i − M) = 1
  const S = incomes.reduce((s, v) => s + v, 0);
  return (b * S) / (a + b);
}

/** The worked example's residents: Q = 20 − P and Q = 16 − 2P; MC = 16. */
export const EXAM_RESIDENTS: Resident[] = [
  { id: 'A', name: 'Ann', alpha: 20, beta: 1 },
  { id: 'B', name: 'Ben', alpha: 8, beta: 0.5 },
];
export const EXAM_MC = 16;
