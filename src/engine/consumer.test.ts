import { describe, expect, it } from 'vitest';
import { addictive, altruism, bliss, habitPath, homeProduction } from './consumer';

describe('one consumer: what breaks the model', () => {
  it('non-diminishing MU: the tangency is a minimum, the optimum a corner', () => {
    const r = addictive(1, 1, 1, 1, 10);
    expect(r.tangencyIsMinimum).toBe(true);
    expect(r.best.x === 0 || r.best.y === 0).toBe(true);
  });
  it('bliss point inside the budget leaves money unspent', () => {
    const r = bliss(3, 3, 1, 1, 10);
    expect(r.unspent).toBeCloseTo(4);
    const out = bliss(8, 8, 1, 1, 10);
    expect(out.unspent).toBe(0);
    expect(out.best.x + out.best.y).toBeCloseTo(10);
  });
  it('habit: same budget, drifting choices', () => {
    const p = habitPath(0.3, 0.5, 1, 1, 10, 6);
    expect(p[5].x).toBeGreaterThan(p[0].x);
    for (const w of p) expect(w.x + w.y).toBeCloseTo(10);
  });
});

describe('one consumer: what does not', () => {
  it('home production: unique optimum on a convex, kinked budget', () => {
    const r = homeProduction(0.5, 0.5, 4, 1, 1, 10);
    expect(r.cost(r.x) + r.y).toBeCloseTo(10, 6);
    expect(r.x).toBeGreaterThan(4); // cheap home milk, then more bought
  });
  it('altruism: the gift is a third good with a well-defined demand', () => {
    const r = altruism(0.5, 0.5, 0, 1, 1, 12);
    expect(r.g).toBeCloseTo(4);
    expect(r.x + r.y + r.g).toBeCloseTo(12);
    expect(altruism(0.5, 0.1, 10, 1, 1, 12).g).toBe(0);
  });
});
