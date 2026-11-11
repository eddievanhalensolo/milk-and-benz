/**
 * Every aggregate in the app is a sum over individuals and carries its parts,
 * so that any total on screen can be taken apart into the people it came from.
 */
export interface Part {
  id: string;
  value: number;
}

export interface Aggregate {
  total: number;
  parts: Part[];
}

export function aggregate(parts: Part[]): Aggregate {
  return { total: parts.reduce((s, p) => s + p.value, 0), parts };
}

/** Bisection for an increasing or decreasing continuous function on [lo, hi]. */
export function bisect(f: (x: number) => number, lo: number, hi: number, iters = 200): number {
  let flo = f(lo);
  for (let i = 0; i < iters; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (Math.sign(fm) === Math.sign(flo)) {
      lo = mid;
      flo = fm;
    } else hi = mid;
    if (hi - lo <= 1e-14 * Math.max(1, Math.abs(lo))) break;
  }
  return (lo + hi) / 2;
}

/** Golden-section maximisation of a unimodal function. */
export function goldenMax(f: (x: number) => number, lo: number, hi: number, iters = 80): number {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  for (let i = 0; i < iters; i++) {
    if (fc >= fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  return (a + b) / 2;
}

/** Seeded PRNG (mulberry32) so simulations and generated problems are reproducible. */
export function rng(seed: number) {
  let t = seed >>> 0;
  const next = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    uniform: (a: number, b: number) => a + (b - a) * next(),
    int: (a: number, b: number) => a + Math.floor(next() * (b - a + 1)),
    pick: <T>(xs: T[]) => xs[Math.floor(next() * xs.length)],
    normal: () => {
      const u1 = Math.max(next(), 1e-12);
      const u2 = next();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
  };
}
