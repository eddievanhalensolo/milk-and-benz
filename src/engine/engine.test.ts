import { describe, expect, it } from 'vitest';
import {
  EXAM_BOX,
  EXAM_ENDOWMENT,
  boxAgents,
  boxMRS,
  contractCurve,
  isEfficient,
  lens,
  rationedHoldings,
  solveEquilibria,
  totals,
  upf,
  uA,
  uB,
} from './exchange';
import { U, demand, expenditure, mrs } from './utility';
import {
  EXAM_MC,
  EXAM_RESIDENTS,
  averageRule,
  bestLindahlLie,
  bestStatement,
  efficientQ,
  payoffFromStatement,
  samuelsonLog,
  unanimity,
  voluntaryLog,
} from './publicgood';
import {
  EXAM_POLLUTERS,
  EXAM_PVQ,
  abatementSupply,
  coase,
  optimumConstantMD,
  permitMarket,
  pollutingMarket,
  marketUnderTax,
  marketDWL,
  pricesVsQuantities,
  smcAbate,
  smcKinks,
  taxOutcome,
  uniformStandard,
} from './externality';
import { EXAM_DID, crowdOutEstimate, did, didGrowth, preTrend } from './evidence';
import { allaisSurplus, makeFarmers, taxedEquilibrium, needles, dispersion } from './market';
import { W, contourUB, ede, bestTransfer } from './society';
import { DEFAULT_PRODUCTION, competitive, conditions, efficientShare, ppfPoint } from './production';
import { DEFAULT_BOX3, contractPoint, equilibrium3, gradientAngle } from './exchange3';

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol);

describe('exchange preset: U_A = X + 3Y, U_B = XY, endowments (3,3), (9,9)', () => {
  const b = EXAM_BOX;
  it('MRS at the endowment: A = 1/3, B = 1, so not efficient', () => {
    const m = boxMRS(b, 3, 3);
    close(m.A.lo, 1 / 3);
    close(m.B.lo, 1);
    expect(isEfficient(b, 3, 3)).toBe(false);
  });

  it('interior contract curve is Y_B = X_B/3 (i.e. Y_A = 8 + X_A/3); then the edge X_A = 0', () => {
    const cc = contractCurve(b, 300);
    let interior = 0;
    let edge = 0;
    for (const pt of cc) {
      if (pt.x > 1e-6) {
        close(b.Y - pt.y, (b.X - pt.x) / 3, 1e-4);
        interior++;
      } else {
        expect(pt.y).toBeLessThanOrEqual(8 + 1e-4);
        edge++;
      }
    }
    expect(interior).toBeGreaterThan(50);
    expect(edge).toBeGreaterThan(50);
  });

  it('points on the edge are efficient although MRS_A < MRS_B there (Kuhn–Tucker, not tangency)', () => {
    expect(isEfficient(b, 0, 24 / 5)).toBe(true);
    const m = boxMRS(b, 0, 24 / 5);
    expect(m.A.lo).toBeLessThan(m.B.lo);
    expect(isEfficient(b, 3, 9)).toBe(true); // interior: Y_A = 8 + 3/3
    expect(isEfficient(b, 3, 8)).toBe(false);
  });

  it('competitive equilibrium is a corner: p = 3/5, A = (0, 24/5), B = (12, 36/5)', () => {
    const eqs = solveEquilibria(boxAgents(b, EXAM_ENDOWMENT));
    expect(eqs.length).toBe(1);
    const e = eqs[0];
    close(e.p, 3 / 5, 1e-8);
    close(e.bundles[0].x, 0, 1e-8);
    close(e.bundles[0].y, 24 / 5, 1e-8);
    close(e.bundles[1].x, 12, 1e-8);
    close(e.bundles[1].y, 36 / 5, 1e-8);
    expect(isEfficient(b, e.bundles[0].x, e.bundles[0].y)).toBe(true); // first welfare theorem
  });

  it('the lens exists at the endowment and vanishes on the contract curve', () => {
    expect(lens(b, 3, 3)).not.toBeNull();
    expect(lens(b, 3, 9)).toBeNull();
    expect(lens(b, 0, 24 / 5)).toBeNull();
  });

  it('a small trade (A gives 3 X for 2 Y) makes both better off', () => {
    expect(uA(b, 0, 5)).toBeGreaterThan(uA(b, 3, 3));
    expect(uB(b, 0, 5)).toBeGreaterThan(uB(b, 3, 3));
  });

  it('UPF: edge maps to U_B = 144 − 4U_A, interior to U_B = (48 − U_A)²/12', () => {
    for (const pt of upf(b, 200)) {
      if (pt.uA <= 24) close(pt.uB, 144 - 4 * pt.uA, 1e-3);
      else close(pt.uB, (48 - pt.uA) ** 2 / 12, 1e-3);
    }
  });

  it('second welfare theorem: after a lump-sum transfer the market lands on another efficient point', () => {
    const eqs = solveEquilibria(boxAgents(b, [8, 8]));
    expect(eqs.length).toBe(1);
    const e = eqs[0];
    expect(isEfficient(b, e.bundles[0].x, e.bundles[0].y)).toBe(true);
    // interior now: p = MRS_A = 1/3
    close(e.p, 1 / 3, 1e-8);
  });
});

describe('solver robustness', () => {
  it('handles linear-vs-linear (equilibrium at a kink price, set-valued demand)', () => {
    const agents = [
      { id: 'A', name: 'A', u: { kind: 'linear' as const, a: 1, b: 2 }, e: [5, 5] as [number, number] },
      { id: 'B', name: 'B', u: { kind: 'linear' as const, a: 2, b: 1 }, e: [5, 5] as [number, number] },
    ];
    const eqs = solveEquilibria(agents);
    expect(eqs.length).toBeGreaterThan(0);
    for (const e of eqs) {
      const sx = e.bundles.reduce((s, v) => s + v.x, 0);
      const sy = e.bundles.reduce((s, v) => s + v.y, 0);
      close(sx, 10, 1e-6);
      close(sy, 10, 1e-6);
    }
  });

  it('handles Leontief and quasi-linear', () => {
    const agents = [
      { id: 'A', name: 'A', u: { kind: 'leontief' as const, a: 1, b: 1 }, e: [8, 2] as [number, number] },
      { id: 'B', name: 'B', u: { kind: 'ql' as const, v: 6 }, e: [2, 8] as [number, number] },
    ];
    const eqs = solveEquilibria(agents);
    expect(eqs.length).toBe(1);
    const e = eqs[0];
    close(e.bundles[0].x + e.bundles[1].x, 10, 1e-6);
    close(e.bundles[0].y + e.bundles[1].y, 10, 1e-6);
  });

  it('expenditure inverts indirect utility for every family', () => {
    const fams = [
      { kind: 'cd' as const, a: 0.3, b: 0.7 },
      { kind: 'linear' as const, a: 1, b: 2 },
      { kind: 'leontief' as const, a: 1, b: 2 },
      { kind: 'ql' as const, v: 5 },
    ];
    for (const u of fams) {
      const d = demand(u, 2, 1, 30);
      const lvl = U(u, d.x0, d.y0);
      close(expenditure(u, 2, 1, lvl), 30, 1e-6);
    }
  });

  it('Leontief MRS at the kink is the whole fan [0, ∞]', () => {
    const r = mrs({ kind: 'leontief', a: 1, b: 1 }, 3, 3);
    expect(r.lo).toBe(0);
    expect(r.hi).toBe(Infinity);
  });
});

describe('public good (Ann & Ben)', () => {
  const rs = EXAM_RESIDENTS;
  it('efficient quantity 8', () => close(efficientQ(rs, EXAM_MC), 8));
  it('even shares: requests 12 and 0, 6 built', () => {
    const r = averageRule(rs, [8, 8]);
    close(r.requests[0], 12);
    close(r.requests[1], 0);
    expect(r.total).toBe(6);
  });
  it('one unit pre-built: requests 11 and 0, average 5.5 → 5, total still 6 (full crowd-out)', () => {
    const r = averageRule(rs, [8, 8], 1);
    close(r.requests[0], 11);
    close(r.requests[1], 0);
    close(r.average, 5.5);
    expect(r.built).toBe(5);
    expect(r.total).toBe(6);
  });
  it('unanimity at x = 4 with quantity 8', () => {
    const u = unanimity(rs[0], rs[1], EXAM_MC);
    close(u.x, 4);
    close(u.Q, 8);
  });
  it('over-provision example: P = 24 − Q, P = 6 − Q/2 → optimum 4, requests 12 and 0, average 6', () => {
    const rs2 = [
      { id: 'A', name: 'A', alpha: 24, beta: 1 },
      { id: 'B', name: 'B', alpha: 6, beta: 0.5 },
    ];
    close(efficientQ(rs2, 24), 4);
    const r = averageRule(rs2, [12, 12]);
    close(r.requests[0], 12);
    close(r.requests[1], 0);
    expect(r.total).toBe(6);
  });
  it('lying pays under the average rule: Ann states 16, gets 8, and is better off', () => {
    const truth = payoffFromStatement(rs, [8, 8], 0, 12);
    const lie = payoffFromStatement(rs, [8, 8], 0, 16);
    expect(lie.total).toBe(8);
    close(truth.payoff, 54);
    close(lie.payoff, 64);
    expect(bestStatement(rs, [8, 8], 0).payoff).toBeGreaterThanOrEqual(64 - 1e-9);
  });
  it('lying pays under 8 ± x: Ann under-reports her demand', () => {
    const best = bestLindahlLie(rs[0], rs[1], EXAM_MC);
    expect(best.alpha).toBeLessThan(20);
    close(best.Q, 6, 0.05);
  });
  it('HW2 Q8: Paul and Scott hire 20 each (M = 40), optimum 200/3, 10 public police crowd out fully', () => {
    const ne = voluntaryLog(4, 2, [100, 100]);
    close(ne.contributions[0], 20, 1e-6);
    close(ne.M, 40, 1e-6);
    close(samuelsonLog(4, 2, [100, 100]), 200 / 3, 1e-9);
    const gov = voluntaryLog(4, 2, [100, 100], 10);
    close(gov.M, 40, 1e-6);
  });
});

describe('two polluters', () => {
  const fs = EXAM_POLLUTERS;
  it('optimum Q_A = 60, Q_B = 20', () => {
    const o = optimumConstantMD(fs, 120);
    close(o.q[0], 60);
    close(o.q[1], 20);
    close(o.costs.total, 4800);
  });
  it('uniform standard of 40 each: MC 80 and 240, cost 6,400 vs 4,800', () => {
    const u = uniformStandard(fs, 40);
    close(u.mc[0], 80);
    close(u.mc[1], 240);
    close(u.costs.total, 6400);
  });
  it('tax 120 reproduces the optimum', () => {
    const t = taxOutcome(fs, 120);
    close(t.q[0], 60);
    close(t.q[1], 20);
  });
  it('40 permits each: A sells 20 to B at 120', () => {
    const m = permitMarket(fs, [40, 40]);
    close(m.price, 120, 1e-6);
    close(m.trades[0].net, 20, 1e-6);
    expect(m.trades[0].role).toBe('sells');
    close(m.trades[1].net, -20, 1e-6);
    expect(m.trades[1].role).toBe('buys');
    close(m.withTrade.costs.total, 4800, 1e-3);
    close(m.noTrade.costs.total, 6400, 1e-3);
  });
  it('aggregate SMC = (3/2) Q_T, with kinks where firms hit the 80 cap', () => {
    close(smcAbate(fs, 80), 120, 1e-6);
    close(smcAbate(fs, 30), 45, 1e-6);
    close(abatementSupply(fs, 120).total, 80);
    // A is capped at P = 160, B at P = 480
    const k = smcKinks(fs).map((p) => p.P);
    expect(k).toContain(160);
    expect(k).toContain(480);
    close(abatementSupply(fs, 240).total, 80 + 40);
  });
});

describe('prices vs quantities with a wrong regulator', () => {
  it('default numbers: true 80, perceived 60, tax 120, firms respond 80; DWL 500 vs 0', () => {
    const r = pricesVsQuantities(EXAM_PVQ);
    close(r.qStar, 80);
    close(r.qPerceived, 60);
    close(r.tax, 120);
    close(r.qTax, 80);
    close(r.dwlQuantity, 500);
    close(r.dwlTax, 0);
  });
  it('tax DWL > 0 when the numbers do not conspire', () => {
    const r = pricesVsQuantities({ ...EXAM_PVQ, db: 0 });
    expect(r.dwlTax).toBeGreaterThan(0);
  });
  it('Weitzman direction: flat SMB + cost error favours the tax; steep SMB favours quantities', () => {
    const flat = pricesVsQuantities({ c0: 0, m: 2, b0: 300, n: 0.1, dc: 40, db: 0 });
    expect(flat.dwlTax).toBeLessThan(flat.dwlQuantity);
    const steep = pricesVsQuantities({ c0: 0, m: 1, b0: 300, n: 10, dc: 40, db: 0 });
    expect(steep.dwlQuantity).toBeLessThan(steep.dwlTax);
  });
  it('HW2 Q5: MD = 300 + 5Q, MC = 100 + 2Q, MB = D0 − 2Q', () => {
    const m = { d0: 1000, d1: 2, s0: 100, s1: 2, md0: 300, md1: 5 };
    const r = pollutingMarket(m);
    close(r.qOpt, 600 / 9);
    close(r.pigou, 300 + (5 * 600) / 9);
    const truth = { ...m, d0: 900 };
    close(marketDWL(truth, 600 / 9), 0.5 * 9 * (100 / 9) ** 2, 1e-6);
    const qt = marketUnderTax(truth, r.pigou);
    close(qt, (800 - r.pigou) / 4);
    expect(marketDWL(truth, qt)).toBeGreaterThan(marketDWL(truth, 600 / 9));
  });
});

describe('Coase', () => {
  const base = { a: 100, b: 1, d: 1, parties: 1, tcPerParty: 0, power: 0.5, holdout: 0 };
  it('efficiency survives the assignment of the right; distribution flips', () => {
    const d = coase(base, 'dairy');
    const l = coase(base, 'lake');
    close(d.q, 50);
    close(l.q, 50);
    expect(d.efficient && l.efficient).toBe(true);
    expect(d.dairy).toBeGreaterThan(l.dairy);
    expect(l.lake).toBeGreaterThan(d.lake);
  });
  it('transaction costs and many parties break it', () => {
    expect(coase({ ...base, tcPerParty: 5000 }, 'dairy').efficient).toBe(false);
    expect(coase({ ...base, parties: 20 }, 'dairy').efficient).toBe(false);
    expect(coase({ ...base, parties: 20, holdout: 0.1 }, 'lake').deal).toBe(false);
  });
});

describe('diff-in-diff', () => {
  it('(1150 − 800) − (1300 − 900) = −50', () => close(did(EXAM_DID).estimate, -50));
  it('in growth rates: 43.75% − 44.4% ≈ −0.7 pp', () => close(didGrowth(EXAM_DID).estimate, 350 / 800 - 400 / 900, 1e-12));
  it('placebo on parallel pre-trends is zero', () => close(preTrend(900, 1000, 1000, 1100), 0));
  it('crowd-out regression: unbiased without hidden taste, biased toward zero with it', () => {
    const clean = crowdOutEstimate({ n: 20000, seed: 3, b1: -0.6, alpha: 1, taste: 0, politics: 1, reverse: 0 });
    close(clean.b1Hat, -0.6, 0.03);
    const biased = crowdOutEstimate({ n: 20000, seed: 3, b1: -0.6, alpha: 1, taste: 1, politics: 1, reverse: 0 });
    expect(biased.b1Hat).toBeGreaterThan(-0.6 + 0.2);
    close(biased.b1Oracle, -0.6, 0.03);
    const rev = crowdOutEstimate({ n: 20000, seed: 3, b1: -0.6, alpha: 1, taste: 0, politics: 0, reverse: 1 });
    expect(rev.b1Hat).toBeLessThan(-0.6 - 0.1);
  });
});

describe('market square', () => {
  const farmers = makeFarmers(60, 11);
  it('equilibrium holdings equalise every MRS (needles align)', () => {
    const eq = solveEquilibria(farmers)[0];
    const h = rationedHoldings(farmers, eq.p);
    const n = needles(farmers, h);
    for (const v of n) close(v, eq.p, 1e-6);
    expect(dispersion(needles(farmers, farmers.map((f) => ({ x: f.e[0], y: f.e[1] }))))).toBeGreaterThan(0.3);
  });
  it('rationed holdings are always feasible', () => {
    const [X, Y] = totals(farmers);
    for (const p of [0.02, 0.1, 0.5]) {
      const h = rationedHoldings(farmers, p);
      close(h.reduce((s, v) => s + v.x, 0), X, 1e-6);
      close(h.reduce((s, v) => s + v.y, 0), Y, 1e-6);
    }
  });
  it('a tax splits buyers (MRS = p + τ) from sellers (MRS = p); DWL grows from zero', () => {
    const t0 = taxedEquilibrium(farmers, 0);
    const d0 = allaisSurplus(farmers, t0.choices);
    close(d0.surplus, 0, 1e-6);
    const t = taxedEquilibrium(farmers, 0.03);
    t.choices.forEach((c, i) => {
      const m = needles([farmers[i]], [c])[0];
      if (c.side === 'buyer') close(m, t.p + 0.03, 1e-6);
      if (c.side === 'seller') close(m, t.p, 1e-6);
    });
    const [X, Y] = totals(farmers);
    close(t.choices.reduce((s, c) => s + c.x, 0), X, 1e-6);
    close(t.choices.reduce((s, c) => s + c.y, 0), Y, 1e-6);
    const d1 = allaisSurplus(farmers, t.choices).surplus;
    const d2 = allaisSurplus(farmers, taxedEquilibrium(farmers, 0.06).choices).surplus;
    expect(d1).toBeGreaterThan(0);
    expect(d2).toBeGreaterThan(d1);
  });
});

describe('society', () => {
  it('ε = 0 is the sum, ε = ∞ is n·min', () => {
    close(W([1, 4, 9], 0), 14);
    close(W([1, 4, 9], Infinity), 3);
    close(ede([4, 4], 2), 4);
  });
  it('Pareto improvement ≠ "W does not fall": a W-improvement can hurt someone', () => {
    // (10, 10) → (25, 1): W_util rises, B loses
    expect(W([25, 1], 0)).toBeGreaterThan(W([10, 10], 0));
    close(contourUB(5, 10, 0), 5);
  });
  it('leaky bucket: Rawls transfers more than utilitarian', () => {
    const r = bestTransfer(100, 20, 0.3, 0.5, Infinity);
    const u = bestTransfer(100, 20, 0.3, 0.5, 0);
    expect(r.t).toBeGreaterThan(u.t);
  });
});

describe('production', () => {
  const e = DEFAULT_PRODUCTION;
  it('competitive equilibrium satisfies all three conditions', () => {
    for (const th of [0.2, 0.5, 0.8]) {
      const s = competitive(e, th);
      const c = conditions(e, s);
      expect(c.gaps.withinMilk).toBeLessThan(1e-9);
      expect(c.gaps.withinBenz).toBeLessThan(1e-9);
      expect(c.gaps.mrts).toBeLessThan(1e-9);
      expect(c.gaps.mrs).toBeLessThan(1e-6);
      expect(c.gaps.mrsMrt).toBeLessThan(1e-6);
    }
  });
  it('the MRT equals the slope of the PPF', () => {
    const a = ppfPoint(e, 40);
    const b = ppfPoint(e, 40.0001);
    const slope = -(b.benz - a.benz) / (b.milk - a.milk);
    const s = competitive(e, 0.5);
    const c = conditions(e, { ...s, LM: 40, KM: a.KM });
    close(c.mrt.viaL, slope, 1e-3);
    close(c.mrt.viaL, c.mrt.viaK, 1e-9);
  });
  it('the efficient split favours the more productive firm', () => {
    expect(efficientShare(e.milk)).toBeLessThan(0.5);
  });
});

describe('three goods', () => {
  it('contract curve points have parallel gradients; equilibrium lies on it', () => {
    const b = DEFAULT_BOX3;
    for (const s of [0.2, 0.5, 0.8]) expect(gradientAngle(b, contractPoint(b, s))).toBeLessThan(1e-6);
    const eq = equilibrium3(b, [8, 2, 3]);
    expect(gradientAngle(b, eq.xA)).toBeLessThan(1e-6);
    const value = eq.p.reduce((s, v, j) => s + v * [8, 2, 3][j], 0);
    close(value, eq.p.reduce((s, v, j) => s + v * eq.xA[j], 0), 1e-9);
  });
});
