import { describe, expect, it } from 'vitest';
import { checkNum, parseNum, scoreMC } from './scoring';
import { GENERATORS } from './generators';
import { MCQS, SHORTS } from './bank';

describe('multiple-choice scoring', () => {
  it('3 for exact, −1 per mismatch, floor 0', () => {
    expect(scoreMC(7, [5, 6], [5, 6]).score).toBe(3);
    expect(scoreMC(7, [5, 6], [5]).score).toBe(2);
    expect(scoreMC(7, [5, 6], [5, 0]).score).toBe(1);
    expect(scoreMC(7, [2, 3, 5], [0, 1, 4]).score).toBe(0);
    expect(scoreMC(7, [2, 3, 5], []).score).toBe(0);
  });
  it('single choice: right 3, wrong 1, blank 2', () => {
    expect(scoreMC(6, [3], [3]).score).toBe(3);
    expect(scoreMC(6, [3], [1]).score).toBe(1);
    expect(scoreMC(6, [3], []).score).toBe(2);
  });
  it('single-choice questions have exactly one answer, all answers exist', () => {
    for (const q of MCQS) {
      if (q.single) expect(q.correct.length).toBe(1);
      for (const c of q.correct) expect(c).toBeLessThan(q.options.length);
    }
  });
  it('bank is well formed', () => {
    expect(new Set(MCQS.map((q) => q.id)).size).toBe(MCQS.length);
    expect(new Set(SHORTS.map((q) => q.id)).size).toBe(SHORTS.length);
    for (const q of SHORTS) expect(q.rubric.reduce((s, r) => s + r.pts, 0)).toBe(q.points);
  });
});

describe('number parsing', () => {
  it('fractions, commas, minus signs', () => {
    expect(parseNum('2/3')).toBeCloseTo(2 / 3);
    expect(parseNum('2,500')).toBe(2500);
    expect(parseNum('−100')).toBe(-100);
    expect(checkNum('10/3', 10 / 3)).toBe(true);
    expect(checkNum('3.33', 10 / 3)).toBe(true);
    expect(checkNum('3.3', 10 / 3)).toBe(false);
  });
});

describe('generators', () => {
  for (const g of GENERATORS) {
    it(`${g.id}: 25 seeds give finite, well-formed problems`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const q = g.make(seed);
        expect(q.parts.length).toBeGreaterThan(0);
        expect(q.parts.reduce((s, p) => s + p.points, 0)).toBe(q.points);
        for (const p of q.parts) for (const f of p.fields ?? []) expect(Number.isFinite(f.answer)).toBe(true);
      }
    });
  }
  it('public-good generator: x is positive (the high demander pays more)', () => {
    const g = GENERATORS.find((x) => x.id === 'publicgood')!;
    for (let seed = 1; seed <= 25; seed++) {
      const part = g.make(seed).parts.find((p) => p.label === 'd')!;
      expect(part.fields![0].answer).toBeGreaterThan(0);
    }
  });
  it('different seeds give different numbers', () => {
    const a = GENERATORS[1].make(1).intro;
    const b = GENERATORS[1].make(2).intro;
    expect(a).not.toBe(b);
  });
});
