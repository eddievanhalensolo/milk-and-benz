/**
 * Externalities: polluters with heterogeneous abatement costs, instruments,
 * regulator error (prices vs quantities), a polluting market, and Coase.
 */
import { Aggregate, aggregate, bisect } from './aggregate';

/* ------------------------------------------------------------------ */
/* Abatement by several firms                                          */
/* ------------------------------------------------------------------ */

export interface Polluter {
  id: string;
  name: string;
  emissions: number; // unabated pollution
  a: number; // MC_i(Q) = a + c Q, for Q ∈ [0, emissions]
  c: number;
}

export const mcAbate = (f: Polluter, q: number) => f.a + f.c * q;
export const costAbate = (f: Polluter, q: number) => f.a * q + (f.c * q * q) / 2;

/** A firm facing a price P per unit of abatement (a tax, a permit price) abates until MC = P. */
export function abateAt(f: Polluter, P: number): number {
  if (P <= f.a) return 0;
  return Math.min(f.emissions, (P - f.a) / f.c);
}

/** Horizontal sum: total abatement supplied at price P, with each firm's part. */
export function abatementSupply(fs: Polluter[], P: number): Aggregate {
  return aggregate(fs.map((f) => ({ id: f.id, value: abateAt(f, P) })));
}

/** Social marginal cost of total abatement Q (inverse of the horizontal sum). */
export function smcAbate(fs: Polluter[], Q: number): number {
  const max = fs.reduce((s, f) => s + f.emissions, 0);
  if (Q >= max) return Infinity;
  if (Q <= 0) return Math.min(...fs.map((f) => f.a));
  const hi = Math.max(...fs.map((f) => mcAbate(f, f.emissions))) + 1;
  return bisect((P) => abatementSupply(fs, P).total - Q, 0, hi);
}

/** Breakpoints of the aggregated SMC curve (where a firm starts or hits its cap). */
export function smcKinks(fs: Polluter[]): { P: number; Q: number }[] {
  const Ps = new Set<number>();
  fs.forEach((f) => {
    Ps.add(f.a);
    Ps.add(mcAbate(f, f.emissions));
  });
  return [...Ps].sort((a, b) => a - b).map((P) => ({ P, Q: abatementSupply(fs, P).total }));
}

/** Efficient abatement when the marginal damage is a constant MD. */
export function optimumConstantMD(fs: Polluter[], MD: number) {
  const q = fs.map((f) => abateAt(f, MD));
  return summarize(fs, q, MD);
}

/** Efficient abatement against a declining SMB(Q) = b0 − n Q of total abatement. */
export function optimumLinearSMB(fs: Polluter[], b0: number, n: number) {
  const max = fs.reduce((s, f) => s + f.emissions, 0);
  const g = (Q: number) => b0 - n * Q - smcAbate(fs, Q);
  if (g(0) <= 0) return summarize(fs, fs.map(() => 0), b0);
  const Q = g(max - 1e-9) >= 0 ? max : bisect(g, 0, max - 1e-9);
  const P = smcAbate(fs, Q);
  return summarize(fs, fs.map((f) => abateAt(f, P)), P);
}

export function summarize(fs: Polluter[], q: number[], price?: number) {
  const costs = aggregate(fs.map((f, i) => ({ id: f.id, value: costAbate(f, q[i]) })));
  return {
    q,
    total: q.reduce((s, v) => s + v, 0),
    mc: fs.map((f, i) => mcAbate(f, q[i])),
    costs,
    price,
  };
}

/** A uniform standard: every firm must abate the same amount. */
export function uniformStandard(fs: Polluter[], each: number) {
  return summarize(fs, fs.map((f) => Math.min(each, f.emissions)));
}

/** A tax per unit of pollution: firms abate until MC = T. */
export function taxOutcome(fs: Polluter[], T: number) {
  const s = summarize(fs, fs.map((f) => abateAt(f, T)), T);
  const remaining = fs.map((f, i) => f.emissions - s.q[i]);
  return { ...s, revenue: T * remaining.reduce((a, b) => a + b, 0), remaining };
}

/**
 * Tradable permits. permits[i] = emission rights handed to firm i.
 * The permit price is the P at which total abatement equals what the cap requires.
 */
export function permitMarket(fs: Polluter[], permits: number[]) {
  const required = fs.reduce((s, f, i) => s + Math.max(0, f.emissions - permits[i]), 0);
  const cap = permits.reduce((s, v) => s + v, 0);
  const totalE = fs.reduce((s, f) => s + f.emissions, 0);
  const needed = Math.max(0, totalE - cap);
  const hi = Math.max(...fs.map((f) => mcAbate(f, f.emissions))) + 1;
  const price = needed <= 0 ? 0 : bisect((P) => abatementSupply(fs, P).total - needed, 0, hi);
  const q = fs.map((f) => abateAt(f, price));
  // without trade every firm abates emissions − permits
  const noTrade = summarize(fs, fs.map((f, i) => Math.max(0, f.emissions - permits[i])));
  const withTrade = summarize(fs, q, price);
  const trades = fs.map((f, i) => {
    const needs = f.emissions - q[i]; // permits it must hold after trade
    const net = permits[i] - needs; // > 0 sells, < 0 buys
    return { id: f.id, name: f.name, holds: needs, net, role: net > 1e-9 ? 'sells' : net < -1e-9 ? 'buys' : 'keeps' };
  });
  return { price, q, trades, noTrade, withTrade, required };
}

/** The worked example's two firms: each emits 80; MC_A = 2Q_A, MC_B = 6Q_B; MD = 120. */
export const EXAM_POLLUTERS: Polluter[] = [
  { id: 'A', name: 'Firm A', emissions: 80, a: 0, c: 2 },
  { id: 'B', name: 'Firm B', emissions: 80, a: 0, c: 6 },
];

/* ------------------------------------------------------------------ */
/* Prices vs quantities when the regulator is wrong                    */
/* ------------------------------------------------------------------ */

export interface PvQ {
  c0: number; // true SMC = c0 + m Q
  m: number;
  b0: number; // true SMB = b0 − n Q
  n: number;
  dc: number; // regulator's SMC = true + dc   (overestimate cost: dc > 0)
  db: number; // regulator's SMB = true + db   (underestimate benefit: db < 0)
}

export const EXAM_PVQ: PvQ = { c0: 0, m: 3 / 2, b0: 200, n: 1, dc: 30, db: -20 };

export function pricesVsQuantities(s: PvQ) {
  const clampQ = (q: number) => Math.max(0, q);
  const qStar = clampQ((s.b0 - s.c0) / (s.m + s.n));
  const pStar = s.c0 + s.m * qStar;
  const qPerceived = clampQ((s.b0 + s.db - s.c0 - s.dc) / (s.m + s.n));
  // Pigouvian tax: perceived marginal damage at the perceived optimum
  const tax = s.b0 + s.db - s.n * qPerceived;
  // firms respond with their true marginal cost
  const qTax = clampQ((tax - s.c0) / s.m);
  const dwl = (q: number) => {
    // ∫ between q and q* of |SMB − SMC| = ½ (m + n) (q − q*)²
    return 0.5 * (s.m + s.n) * (q - qStar) ** 2;
  };
  return {
    qStar,
    pStar,
    qPerceived,
    tax,
    qTax,
    dwlQuantity: dwl(qPerceived),
    dwlTax: dwl(qTax),
    smc: (q: number) => s.c0 + s.m * q,
    smb: (q: number) => s.b0 - s.n * q,
    smcPerceived: (q: number) => s.c0 + s.dc + s.m * q,
    smbPerceived: (q: number) => s.b0 + s.db - s.n * q,
  };
}

/* ------------------------------------------------------------------ */
/* A polluting market (private vs social cost)                         */
/* ------------------------------------------------------------------ */

export interface PollutingMarket {
  d0: number; // private marginal benefit (inverse demand) PMB = d0 − d1 Q
  d1: number;
  s0: number; // private marginal cost PMC = s0 + s1 Q
  s1: number;
  md0: number; // marginal damage MD = md0 + md1 Q
  md1: number;
}

export function pollutingMarket(m: PollutingMarket) {
  const qMarket = Math.max(0, (m.d0 - m.s0) / (m.d1 + m.s1));
  const qOpt = Math.max(0, (m.d0 - m.s0 - m.md0) / (m.d1 + m.s1 + m.md1));
  const pigou = m.md0 + m.md1 * qOpt;
  // DWL = ∫_{qOpt}^{qMarket} (SMC − PMB) dq, a triangle with base (qMarket − qOpt)
  const gapAt = (q: number) => m.s0 + m.s1 * q + m.md0 + m.md1 * q - (m.d0 - m.d1 * q);
  const dwl = 0.5 * (qMarket - qOpt) * gapAt(qMarket);
  return { qMarket, qOpt, pigou, dwl, gapAtMarket: gapAt(qMarket) };
}

/** Market quantity under a per-unit tax T. */
export const marketUnderTax = (m: PollutingMarket, T: number) => Math.max(0, (m.d0 - m.s0 - T) / (m.d1 + m.s1));

/** DWL of an arbitrary quantity relative to the social optimum. */
export function marketDWL(m: PollutingMarket, q: number) {
  const k = m.d1 + m.s1 + m.md1;
  const qOpt = Math.max(0, (m.d0 - m.s0 - m.md0) / k);
  return 0.5 * k * (q - qOpt) ** 2;
}

/* ------------------------------------------------------------------ */
/* Coase: the dairy and the lake                                       */
/* ------------------------------------------------------------------ */

export interface CoaseSetup {
  a: number; // dairy's marginal benefit of manure: MB = a − b Q
  b: number;
  d: number; // total marginal damage to the lake's users: MD = d Q
  parties: number; // number of lake users sharing MD equally
  tcPerParty: number; // transaction cost of each contract
  power: number; // share of the bargaining surplus captured by the right-holder (0..1)
  holdout: number; // share of surplus each lake user demands when it can veto (0 = none)
}

export type RightHolder = 'dairy' | 'lake';

/**
 * Bargaining over manure Q. The right-holder starts at its preferred point
 * (dairy: Q_private, lake: 0); the other side pays to move it. Payment =
 * the holder's loss + its share of the net surplus. Transaction costs are paid
 * by the side that initiates the deal. With many lake users two things break:
 * when the dairy holds the right, the cut-back is a public good among the
 * users (each pays only for its own share of damage → free-riding); when the
 * users hold it, every one of them can veto (hold-outs).
 */
export function coase(s: CoaseSetup, right: RightHolder) {
  const qPrivate = s.a / s.b;
  const qStar = s.a / (s.b + s.d);
  const mbArea = (q0: number, q1: number) => s.a * (q1 - q0) - (s.b / 2) * (q1 * q1 - q0 * q0);
  const mdArea = (q0: number, q1: number) => (s.d / 2) * (q1 * q1 - q0 * q0);
  const welfare = (q: number) => mbArea(0, q) - mdArea(0, q);
  const tc = s.tcPerParty * s.parties;
  let q = right === 'dairy' ? qPrivate : 0;
  let deal = false;
  let payment = 0; // from the non-holder to the holder
  let reason = '';
  if (right === 'dairy') {
    const qTarget = s.parties > 1 ? s.a / (s.b + s.d / s.parties) : qStar;
    const holderLoss = mbArea(qTarget, qPrivate);
    const surplus = mdArea(qTarget, qPrivate) - holderLoss - tc;
    if (surplus > 1e-9) {
      deal = true;
      q = qTarget;
      payment = holderLoss + s.power * surplus;
      reason =
        s.parties > 1
          ? 'Deal, but each user pays only for its own share of the damage: free-riding stops the cut-back short.'
          : 'Deal struck.';
    } else reason = 'No deal: transaction costs exceed the gains from the cut-back.';
  } else {
    const holderLoss = mdArea(0, qStar);
    const surplus = mbArea(0, qStar) - holderLoss - tc;
    const share = Math.max(s.power, s.holdout * s.parties);
    if (surplus > 1e-9 && s.holdout * s.parties < 1) {
      deal = true;
      q = qStar;
      payment = holderLoss + share * surplus;
      reason = 'Deal struck.';
    } else if (surplus <= 1e-9) reason = 'No deal: transaction costs exceed the gains.';
    else reason = 'No deal: hold-outs. Each user can veto, and together they demand more than the whole surplus.';
  }
  const dairy = mbArea(0, q) + (right === 'dairy' ? payment : -payment) - (deal && right === 'lake' ? tc : 0);
  const lake = -mdArea(0, q) + (right === 'lake' ? payment : -payment) - (deal && right === 'dairy' ? tc : 0);
  return {
    qPrivate,
    qStar,
    q,
    deal,
    reason,
    payment,
    efficient: Math.abs(q - qStar) < 1e-9,
    dwl: welfare(qStar) - welfare(q),
    tc: deal ? tc : 0,
    dairy,
    lake,
  };
}
