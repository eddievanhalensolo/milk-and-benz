/**
 * Two farmers, three goods (milk, Benz, chalk): the Edgeworth box in 3D.
 *
 * Restricted to Cobb–Douglas preferences U = Π x_j^{a_j} with Σ a_j = 1, for
 * which the contract curve has a closed form. Parametrise it by s ∈ [0, 1],
 * A's share of the economy's value: with V = 1,
 *   p_j(s) = (s a^A_j + (1 − s) a^B_j) / Ω_j,   x^A_j = s a^A_j / p_j.
 * Every point of this curve is a competitive equilibrium for some lump-sum
 * redistribution (second welfare theorem), hence Pareto efficient.
 */
import { bisect } from './aggregate';

export type Vec3 = [number, number, number];

export interface Box3 {
  aA: Vec3;
  aB: Vec3;
  omega: Vec3;
}

export const u3 = (a: Vec3, x: Vec3) => a.reduce((s, ai, j) => s * Math.pow(Math.max(x[j], 0), ai), 1);

export function grad3(a: Vec3, x: Vec3): Vec3 {
  const u = u3(a, x);
  return a.map((ai, j) => (ai * u) / Math.max(x[j], 1e-12)) as Vec3;
}

export function pricesAt(b: Box3, s: number): Vec3 {
  return b.omega.map((w, j) => (s * b.aA[j] + (1 - s) * b.aB[j]) / w) as Vec3;
}

export function contractPoint(b: Box3, s: number): Vec3 {
  const p = pricesAt(b, s);
  return p.map((pj, j) => (s * b.aA[j]) / pj) as Vec3;
}

export function contractCurve3(b: Box3, n = 120): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i++) out.push(contractPoint(b, i / n));
  return out;
}

/** Competitive equilibrium from A's endowment eA: s such that s = p(s) · eA. */
export function equilibrium3(b: Box3, eA: Vec3) {
  const g = (s: number) => pricesAt(b, s).reduce((acc, pj, j) => acc + pj * eA[j], 0) - s;
  const s = bisect(g, 0, 1);
  const p = pricesAt(b, s);
  return { s, p, xA: contractPoint(b, s), relPrices: p.map((v) => v / p[1]) as Vec3 };
}

/** Angle (radians) between A's gradient and B's gradient at an allocation: 0 ⇔ efficient (interior). */
export function gradientAngle(b: Box3, xA: Vec3): number {
  const xB = b.omega.map((w, j) => w - xA[j]) as Vec3;
  const gA = grad3(b.aA, xA);
  const gB = grad3(b.aB, xB);
  const dot = gA.reduce((s, v, j) => s + v * gB[j], 0);
  const na = Math.hypot(...gA);
  const nb = Math.hypot(...gB);
  return Math.acos(Math.max(-1, Math.min(1, dot / (na * nb))));
}

/** MRS of good j for good k (MU_j / MU_k). */
export const mrs3 = (a: Vec3, x: Vec3, j: number, k: number) => (a[j] / a[k]) * (x[k] / Math.max(x[j], 1e-12));

/** Demand of a CD agent at prices p with wealth m. */
export const demand3 = (a: Vec3, p: Vec3, m: number) => a.map((aj, j) => (aj * m) / p[j]) as Vec3;

/** Tâtonnement step on p_milk and p_chalk with p_Benz = 1 (animation only). */
export function tatonnement3(b: Box3, eA: Vec3, p: Vec3, speed = 0.1): Vec3 {
  const eB = b.omega.map((w, j) => w - eA[j]) as Vec3;
  const mA = p.reduce((s, v, j) => s + v * eA[j], 0);
  const mB = p.reduce((s, v, j) => s + v * eB[j], 0);
  const dA = demand3(b.aA, p, mA);
  const dB = demand3(b.aB, p, mB);
  const z = dA.map((v, j) => (v + dB[j] - b.omega[j]) / b.omega[j]);
  return [p[0] * Math.exp(speed * z[0]), 1, p[2] * Math.exp(speed * z[2])];
}

export function plans3(b: Box3, eA: Vec3, p: Vec3) {
  const eB = b.omega.map((w, j) => w - eA[j]) as Vec3;
  const mA = p.reduce((s, v, j) => s + v * eA[j], 0);
  const mB = p.reduce((s, v, j) => s + v * eB[j], 0);
  const dA = demand3(b.aA, p, mA);
  const dB = demand3(b.aB, p, mB);
  return { dA, dB, excess: dA.map((v, j) => v + dB[j] - b.omega[j]) as Vec3 };
}

export const DEFAULT_BOX3: Box3 = {
  aA: [0.5, 0.3, 0.2],
  aB: [0.2, 0.3, 0.5],
  omega: [10, 10, 10],
};
