/**
 * Evidence: difference-in-differences and the crowd-out regression.
 */
import { rng } from './aggregate';

export interface DiDCells {
  treatPre: number;
  treatPost: number;
  ctrlPre: number;
  ctrlPost: number;
}

export function did(c: DiDCells) {
  const dT = c.treatPost - c.treatPre;
  const dC = c.ctrlPost - c.ctrlPre;
  return { dT, dC, estimate: dT - dC, counterfactual: c.treatPre + dC };
}

/** The same comparison in growth rates (percent changes). */
export function didGrowth(c: DiDCells) {
  const gT = c.treatPost / c.treatPre - 1;
  const gC = c.ctrlPost / c.ctrlPre - 1;
  return { gT, gC, estimate: gT - gC, counterfactual: c.treatPre * (1 + gC) };
}

/** Log version (≈ growth for small changes). */
export function didLog(c: DiDCells) {
  return Math.log(c.treatPost / c.treatPre) - Math.log(c.ctrlPost / c.ctrlPre);
}

/** Placebo DiD on two pre-periods: zero under parallel pre-trends. */
export function preTrend(treatPre2: number, treatPre1: number, ctrlPre2: number, ctrlPre1: number) {
  return treatPre1 - treatPre2 - (ctrlPre1 - ctrlPre2);
}

export const EXAM_DID: DiDCells = { treatPre: 800, treatPost: 1150, ctrlPre: 900, ctrlPost: 1300 };

/* ------------------------------------------------------------------ */
/* Crowd-out regression P = b0 + b1 G + α X + e with a hidden taste θ   */
/* ------------------------------------------------------------------ */

export interface CrowdOutSetup {
  n: number;
  seed: number;
  b1: number; // true crowd-out (−1 full, 0 none)
  alpha: number; // effect of the observed control X
  taste: number; // δ: how strongly the hidden taste θ raises private spending P
  politics: number; // γ: how strongly θ raises government spending G (voters get what they like)
  reverse: number; // ρ: governments subsidise where private spending is low (reverse causality)
}

export interface Sample {
  G: number[];
  X: number[];
  P: number[];
  theta: number[];
}

export function simulateCrowdOut(s: CrowdOutSetup): Sample {
  const r = rng(s.seed);
  const G: number[] = [];
  const X: number[] = [];
  const P: number[] = [];
  const theta: number[] = [];
  for (let i = 0; i < s.n; i++) {
    const th = r.normal();
    const x = r.normal();
    const u = r.normal();
    const e = r.normal();
    // private spending absent any subsidy (latent need)
    const latent = 100 + s.alpha * 10 * x + s.taste * 20 * th + 10 * e;
    // government spends more where tastes are strong, and where latent private spending is low
    const g = Math.max(0, 50 + s.politics * 20 * th - s.reverse * 0.5 * (latent - 100) + 10 * u);
    const p = latent + s.b1 * g;
    G.push(g);
    X.push(x);
    P.push(p);
    theta.push(th);
  }
  return { G, X, P, theta };
}

/** OLS of y on [1, columns...]. Returns coefficients and their standard errors. */
export function ols(y: number[], cols: number[][]) {
  const n = y.length;
  const k = cols.length + 1;
  const Xrow = (i: number) => [1, ...cols.map((c) => c[i])];
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    const r = Xrow(i);
    for (let a = 0; a < k; a++) {
      Xty[a] += r[a] * y[i];
      for (let b = 0; b < k; b++) XtX[a][b] += r[a] * r[b];
    }
  }
  const inv = invert(XtX);
  const beta = inv.map((row) => row.reduce((s, v, j) => s + v * Xty[j], 0));
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const r = Xrow(i);
    const fit = r.reduce((s, v, j) => s + v * beta[j], 0);
    sse += (y[i] - fit) ** 2;
  }
  const s2 = sse / Math.max(1, n - k);
  const se = inv.map((row, j) => Math.sqrt(Math.max(0, s2 * row[j])));
  return { beta, se };
}

function invert(M: number[][]): number[][] {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c];
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c];
      for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map((row) => row.slice(n));
}

export function crowdOutEstimate(s: CrowdOutSetup) {
  const d = simulateCrowdOut(s);
  const naive = ols(d.P, [d.G, d.X]);
  const oracle = ols(d.P, [d.G, d.X, d.theta]);
  return {
    data: d,
    b1Hat: naive.beta[1],
    se: naive.se[1],
    b1Oracle: oracle.beta[1],
    bias: naive.beta[1] - s.b1,
  };
}
