/**
 * Utility families for two goods (x = milk / X, y = Benz / Y).
 *
 * Every family exposes the same small interface: utility, marginal rate of
 * substitution (as an interval, because kinks have a fan of supporting slopes),
 * the demand *correspondence* (a segment on the budget line, because linear
 * preferences are indifferent along it at one price), the lower boundary of an
 * upper-contour set (to draw indifference curves and lenses) and the
 * expenditure function (for money-metric welfare).
 *
 * MRS here is always |dy/dx| along an indifference curve = MU_x / MU_y.
 */

export type Utility =
  | { kind: 'cd'; a: number; b: number } // U = x^a y^b
  | { kind: 'linear'; a: number; b: number } // U = a x + b y
  | { kind: 'leontief'; a: number; b: number } // U = min(x/a, y/b)
  | { kind: 'ql'; v: number }; // U = y + v ln(1 + x)

export interface Interval {
  lo: number;
  hi: number;
}

/** Demand as a segment on the budget line: single-valued when the ends coincide. */
export interface DemandSeg {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const EPS = 1e-12;

export function U(u: Utility, x: number, y: number): number {
  x = Math.max(0, x);
  y = Math.max(0, y);
  switch (u.kind) {
    case 'cd':
      return Math.pow(x, u.a) * Math.pow(y, u.b);
    case 'linear':
      return u.a * x + u.b * y;
    case 'leontief':
      return Math.min(x / u.a, y / u.b);
    case 'ql':
      return y + u.v * Math.log(1 + x);
  }
}

/** MRS = MU_x/MU_y as an interval. Infinity is allowed (y worthless at the margin). */
export function mrs(u: Utility, x: number, y: number): Interval {
  switch (u.kind) {
    case 'cd': {
      if (x <= EPS && y <= EPS) return { lo: 0, hi: Infinity };
      if (x <= EPS) return { lo: Infinity, hi: Infinity };
      const m = (u.a / u.b) * (y / x);
      return { lo: m, hi: m };
    }
    case 'linear': {
      const m = u.a / u.b;
      return { lo: m, hi: m };
    }
    case 'leontief': {
      const rx = x / u.a;
      const ry = y / u.b;
      if (Math.abs(rx - ry) <= 1e-9 * Math.max(1, rx, ry)) return { lo: 0, hi: Infinity };
      // x binding (rx < ry): more x helps, more y does not → MRS = ∞
      return rx < ry ? { lo: Infinity, hi: Infinity } : { lo: 0, hi: 0 };
    }
    case 'ql': {
      const m = u.v / (1 + x);
      return { lo: m, hi: m };
    }
  }
}

/** A single representative MRS (finite when the family allows it). */
export function mrsPoint(u: Utility, x: number, y: number): number {
  const r = mrs(u, x, y);
  if (r.lo === r.hi) return r.lo;
  if (!isFinite(r.hi)) return isFinite(r.lo) && r.lo > 0 ? r.lo * 2 : NaN;
  return (r.lo + r.hi) / 2;
}

/**
 * Demand correspondence at prices (px, py) and wealth m.
 * Returns a segment on the budget line px x + py y = m (all families here are
 * locally non-satiated, so the budget is exhausted).
 */
export function demand(u: Utility, px: number, py: number, m: number): DemandSeg {
  m = Math.max(0, m);
  const pt = (x: number, y: number): DemandSeg => ({ x0: x, y0: y, x1: x, y1: y });
  switch (u.kind) {
    case 'cd': {
      const s = u.a + u.b;
      return pt(((u.a / s) * m) / px, ((u.b / s) * m) / py);
    }
    case 'linear': {
      const bx = u.a / px; // bang per buck
      const by = u.b / py;
      const rel = (bx - by) / Math.max(bx, by);
      if (rel > 1e-12) return pt(m / px, 0);
      if (rel < -1e-12) return pt(0, m / py);
      return { x0: m / px, y0: 0, x1: 0, y1: m / py };
    }
    case 'leontief': {
      // x = a t, y = b t with px a t + py b t = m
      const t = m / (px * u.a + py * u.b);
      return pt(u.a * t, u.b * t);
    }
    case 'ql': {
      // interior: v/(1+x) = px/py  →  x = v py/px − 1
      let x = Math.max(0, (u.v * py) / px - 1);
      let y = (m - px * x) / py;
      if (y < 0) {
        x = m / px;
        y = 0;
      }
      return pt(x, y);
    }
  }
}

/** Point on the demand segment: θ = 0 → (x0,y0), θ = 1 → (x1,y1). */
export function pick(d: DemandSeg, theta = 0.5): [number, number] {
  return [d.x0 + theta * (d.x1 - d.x0), d.y0 + theta * (d.y1 - d.y0)];
}

export function segX(d: DemandSeg): Interval {
  return { lo: Math.min(d.x0, d.x1), hi: Math.max(d.x0, d.x1) };
}

/**
 * Lower boundary of the upper-contour set: inf { y ≥ 0 : U(x, y) ≥ level }.
 * Infinity when no y suffices. This is the indifference curve as a function of x.
 */
export function icY(u: Utility, x: number, level: number): number {
  x = Math.max(0, x);
  switch (u.kind) {
    case 'cd': {
      if (level <= 0) return 0;
      if (x <= EPS) return Infinity;
      return Math.pow(level / Math.pow(x, u.a), 1 / u.b);
    }
    case 'linear':
      return Math.max(0, (level - u.a * x) / u.b);
    case 'leontief':
      if (level <= 0) return 0;
      return x / u.a >= level - 1e-12 ? u.b * level : Infinity;
    case 'ql':
      return Math.max(0, level - u.v * Math.log(1 + x));
  }
}

/** x-coordinates where an indifference curve has a kink or a vertical piece (for exact drawing). */
export function icKinks(u: Utility, level: number): number[] {
  return u.kind === 'leontief' ? [u.a * level] : [];
}

/** Indirect utility. */
export function V(u: Utility, px: number, py: number, m: number): number {
  const d = demand(u, px, py, m);
  return U(u, d.x0, d.y0);
}

/**
 * Expenditure function e(px, py, level) = min { px x + py y : U ≥ level }.
 * Closed form where cheap; bisection on indirect utility otherwise (V is
 * increasing in m for every family here).
 */
export function expenditure(u: Utility, px: number, py: number, level: number): number {
  switch (u.kind) {
    case 'cd': {
      if (level <= 0) return 0;
      const s = u.a + u.b;
      const k = Math.pow(u.a / (s * px), u.a) * Math.pow(u.b / (s * py), u.b);
      return Math.pow(level / k, 1 / s);
    }
    case 'linear':
      return Math.max(0, level) * Math.min(px / u.a, py / u.b);
    case 'leontief':
      return Math.max(0, level) * (px * u.a + py * u.b);
    default: {
      let lo = 0;
      let hi = 1;
      while (V(u, px, py, hi) < level && hi < 1e12) hi *= 2;
      for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (V(u, px, py, mid) >= level) hi = mid;
        else lo = mid;
      }
      return hi;
    }
  }
}

/** Hicksian demand for x: the cheapest bundle reaching `level`. */
export function hicksX(u: Utility, px: number, py: number, level: number): number {
  const m = expenditure(u, px, py, level);
  return pick(demand(u, px, py, m))[0];
}

/** Formula in course notation (KaTeX), with variable names, e.g. ("X_A", "Y_A"). */
export function formula(u: Utility, X = 'X', Y = 'Y'): string {
  const n = (v: number) => fmtNum(v);
  switch (u.kind) {
    case 'cd': {
      const ea = u.a === 1 ? '' : `^{${n(u.a)}}`;
      const eb = u.b === 1 ? '' : `^{${n(u.b)}}`;
      return `${X}${ea}\\,${Y}${eb}`;
    }
    case 'linear':
      return `${u.a === 1 ? '' : n(u.a)}${X} + ${u.b === 1 ? '' : n(u.b)}${Y}`;
    case 'leontief':
      return `\\min\\{${u.a === 1 ? X : `${X}/${n(u.a)}`},\\ ${u.b === 1 ? Y : `${Y}/${n(u.b)}`}\\}`;
    case 'ql':
      return `${Y} + ${n(u.v)}\\ln(1+${X})`;
  }
}

export function familyName(u: Utility): string {
  return {
    cd: 'Cobb–Douglas',
    linear: 'perfect substitutes',
    leontief: 'perfect complements',
    ql: 'quasi-linear',
  }[u.kind];
}

export function fmtNum(v: number, digits = 3): string {
  if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
  const r = Math.round(v);
  if (Math.abs(v - r) < 1e-9) return String(r);
  return String(Number(v.toFixed(digits)));
}

/** Best small-denominator fraction, for answers like 2/3 and 10/3. */
export function fraction(v: number, maxDen = 12): string {
  if (!isFinite(v)) return fmtNum(v);
  for (let d = 1; d <= maxDen; d++) {
    const n = Math.round(v * d);
    if (Math.abs(n / d - v) < 1e-7) return d === 1 ? String(n) : `${n}/${d}`;
  }
  return fmtNum(v);
}
