/**
 * Production: milk and Benz from labour L and capital K, two firms per industry.
 *
 * Firm technologies are Cobb–Douglas with decreasing returns,
 * f(L, K) = A L^α K^β with α + β < 1, so how an industry splits its inputs
 * between its two firms matters (under constant returns it would not).
 * Within an industry both firms share the exponents, so the efficient split
 * gives each firm the same share s of both inputs.
 */
import { bisect } from './aggregate';

export interface Firm {
  id: string;
  name: string;
  A: number;
}

export interface Industry {
  id: 'M' | 'B';
  name: string;
  alpha: number; // labour exponent
  beta: number; // capital exponent
  firms: [Firm, Firm];
}

export interface ProductionEconomy {
  L: number;
  K: number;
  milk: Industry;
  benz: Industry;
  consumers: { id: string; name: string; a: number }[]; // CD: U = x^a y^(1−a)
}

export const DEFAULT_PRODUCTION: ProductionEconomy = {
  L: 100,
  K: 100,
  milk: {
    id: 'M',
    name: 'milk',
    alpha: 0.5,
    beta: 0.2,
    firms: [
      { id: 'M1', name: 'Hilltop Dairy', A: 1.0 },
      { id: 'M2', name: 'Lakeside Dairy', A: 1.4 },
    ],
  },
  benz: {
    id: 'B',
    name: 'Benz',
    alpha: 0.2,
    beta: 0.5,
    firms: [
      { id: 'B1', name: 'Plant Nord', A: 0.30 },
      { id: 'B2', name: 'Plant Süd', A: 0.22 },
    ],
  },
  consumers: [
    { id: 'A', name: 'A', a: 0.6 },
    { id: 'B', name: 'B', a: 0.35 },
  ],
};

export const f = (A: number, ind: Industry, L: number, K: number) =>
  A * Math.pow(Math.max(0, L), ind.alpha) * Math.pow(Math.max(0, K), ind.beta);
export const mpL = (A: number, ind: Industry, L: number, K: number) => (ind.alpha * f(A, ind, L, K)) / Math.max(L, 1e-12);
export const mpK = (A: number, ind: Industry, L: number, K: number) => (ind.beta * f(A, ind, L, K)) / Math.max(K, 1e-12);
/** MRTS_{L,K} = MP_L / MP_K: how much capital one unit of labour replaces. */
export const mrts = (ind: Industry, L: number, K: number) => (ind.alpha / ind.beta) * (K / Math.max(L, 1e-12));

/** Allocation state: industry inputs and each first firm's shares within its industry. */
export interface ProdState {
  LM: number; // labour in milk (rest in Benz)
  KM: number;
  sLM: number; // share of milk labour at firm M1
  sKM: number;
  sLB: number;
  sKB: number;
  xA: number; // share of milk output consumed by A
  yA: number; // share of Benz output consumed by A
}

export function firmInputs(e: ProductionEconomy, s: ProdState) {
  const LB = e.L - s.LM;
  const KB = e.K - s.KM;
  return {
    M1: { L: s.sLM * s.LM, K: s.sKM * s.KM },
    M2: { L: (1 - s.sLM) * s.LM, K: (1 - s.sKM) * s.KM },
    B1: { L: s.sLB * LB, K: s.sKB * KB },
    B2: { L: (1 - s.sLB) * LB, K: (1 - s.sKB) * KB },
  };
}

export function outputs(e: ProductionEconomy, s: ProdState) {
  const fi = firmInputs(e, s);
  const [m1, m2] = e.milk.firms;
  const [b1, b2] = e.benz.firms;
  const parts = {
    M1: f(m1.A, e.milk, fi.M1.L, fi.M1.K),
    M2: f(m2.A, e.milk, fi.M2.L, fi.M2.K),
    B1: f(b1.A, e.benz, fi.B1.L, fi.B1.K),
    B2: f(b2.A, e.benz, fi.B2.L, fi.B2.K),
  };
  return { milk: parts.M1 + parts.M2, benz: parts.B1 + parts.B2, parts };
}

/** Efficient within-industry share for firm 1 (equalises MP_L and MP_K across the two firms). */
export function efficientShare(ind: Industry) {
  const sig = ind.alpha + ind.beta;
  const w1 = Math.pow(ind.firms[0].A, 1 / (1 - sig));
  const w2 = Math.pow(ind.firms[1].A, 1 / (1 - sig));
  return w1 / (w1 + w2);
}

/** Industry productivity when inputs are split efficiently: output = Ã L^α K^β. */
export function industryTFP(ind: Industry) {
  const s = efficientShare(ind);
  const sig = ind.alpha + ind.beta;
  return ind.firms[0].A * Math.pow(s, sig) + ind.firms[1].A * Math.pow(1 - s, sig);
}

/** Production contract curve: the K_M that equates MRTS across industries, given L_M. */
export function contractKM(e: ProductionEconomy, LM: number) {
  const rho = (e.benz.alpha / e.benz.beta) / (e.milk.alpha / e.milk.beta);
  // K_M/L_M · (α_M/β_M) = K_B/L_B · (α_B/β_B)  →  K_M = ρ L_M K / (L − L_M + ρ L_M)
  return (rho * LM * e.K) / (e.L - LM + rho * LM);
}

/** The PPF, parametrised by labour in milk along the production contract curve. */
export function ppfPoint(e: ProductionEconomy, LM: number) {
  const KM = contractKM(e, LM);
  const milk = industryTFP(e.milk) * Math.pow(LM, e.milk.alpha) * Math.pow(KM, e.milk.beta);
  const benz = industryTFP(e.benz) * Math.pow(e.L - LM, e.benz.alpha) * Math.pow(e.K - KM, e.benz.beta);
  return { LM, KM, milk, benz };
}

export function ppf(e: ProductionEconomy, n = 160) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(ppfPoint(e, (e.L * i) / n));
  return pts;
}

/**
 * Marginal cost ratio at an allocation. With factor prices w (labour) and r
 * (capital), MC = w / MP_L = r / MP_K for a cost-minimising firm. Measured
 * through labour: MC_M / MC_B = MP_L^B / MP_L^M; through capital: MP_K^B / MP_K^M.
 * On the production contract curve (and with efficient splits) these agree and
 * equal the MRT, the slope of the PPF.
 */
export function mrtAt(e: ProductionEconomy, s: ProdState) {
  const fi = firmInputs(e, s);
  const [m1] = e.milk.firms;
  const [b1] = e.benz.firms;
  const viaL = mpL(b1.A, e.benz, fi.B1.L, fi.B1.K) / mpL(m1.A, e.milk, fi.M1.L, fi.M1.K);
  const viaK = mpK(b1.A, e.benz, fi.B1.L, fi.B1.K) / mpK(m1.A, e.milk, fi.M1.L, fi.M1.K);
  return { viaL, viaK };
}

export const mrsCD = (a: number, x: number, y: number) => (a / (1 - a)) * (y / Math.max(x, 1e-12));

/** All three efficiency conditions at a state, as gaps (0 = satisfied). */
export function conditions(e: ProductionEconomy, s: ProdState) {
  const fi = firmInputs(e, s);
  const out = outputs(e, s);
  const [m1, m2] = e.milk.firms;
  const [b1, b2] = e.benz.firms;
  const LB = e.L - s.LM;
  const KB = e.K - s.KM;
  const within = {
    milkMPL: [mpL(m1.A, e.milk, fi.M1.L, fi.M1.K), mpL(m2.A, e.milk, fi.M2.L, fi.M2.K)],
    milkMPK: [mpK(m1.A, e.milk, fi.M1.L, fi.M1.K), mpK(m2.A, e.milk, fi.M2.L, fi.M2.K)],
    benzMPL: [mpL(b1.A, e.benz, fi.B1.L, fi.B1.K), mpL(b2.A, e.benz, fi.B2.L, fi.B2.K)],
    benzMPK: [mpK(b1.A, e.benz, fi.B1.L, fi.B1.K), mpK(b2.A, e.benz, fi.B2.L, fi.B2.K)],
  };
  const mrtsM = mrts(e.milk, s.LM, s.KM);
  const mrtsB = mrts(e.benz, LB, KB);
  const [cA, cB] = e.consumers;
  const xA = s.xA * out.milk;
  const yA = s.yA * out.benz;
  const mrsA = mrsCD(cA.a, xA, yA);
  const mrsB = mrsCD(cB.a, out.milk - xA, out.benz - yA);
  const mrt = mrtAt(e, s);
  const rel = (a: number, b: number) => Math.abs(Math.log(a / b));
  return {
    out,
    within,
    mrtsM,
    mrtsB,
    mrsA,
    mrsB,
    mrt,
    gaps: {
      withinMilk: Math.max(rel(within.milkMPL[0], within.milkMPL[1]), rel(within.milkMPK[0], within.milkMPK[1])),
      withinBenz: Math.max(rel(within.benzMPL[0], within.benzMPL[1]), rel(within.benzMPK[0], within.benzMPK[1])),
      mrts: rel(mrtsM, mrtsB),
      mrs: rel(mrsA, mrsB),
      mrsMrt: rel(mrsA, mrt.viaL),
    },
  };
}

/**
 * The competitive equilibrium in which consumer A owns a share θ of all
 * resources (and so receives θ of the value of output). It satisfies all
 * three conditions at once. Solved by bisection along the PPF on
 * p = MRT = (ā/(1−ā)) · Benz/milk.
 */
export function competitive(e: ProductionEconomy, theta: number): ProdState {
  const [cA, cB] = e.consumers;
  const abar = theta * cA.a + (1 - theta) * cB.a;
  const g = (LM: number) => {
    const pt = ppfPoint(e, LM);
    const s = efficientState(e, LM, 0.5, 0.5);
    const mrt = mrtAt(e, s).viaL;
    return Math.log(mrt) - Math.log((abar / (1 - abar)) * (pt.benz / pt.milk));
  };
  const LM = bisect(g, 1e-6 * e.L, e.L * (1 - 1e-6));
  const pt = ppfPoint(e, LM);
  const p = (abar / (1 - abar)) * (pt.benz / pt.milk); // price of milk in Benz
  const V = p * pt.milk + pt.benz;
  const xA = (cA.a * theta * V) / p;
  const yA = (1 - cA.a) * theta * V;
  return { ...efficientState(e, LM, 0, 0), xA: xA / pt.milk, yA: yA / pt.benz };
}

export function efficientState(e: ProductionEconomy, LM: number, xA: number, yA: number): ProdState {
  const sM = efficientShare(e.milk);
  const sB = efficientShare(e.benz);
  return { LM, KM: contractKM(e, LM), sLM: sM, sKM: sM, sLB: sB, sKB: sB, xA, yA };
}
