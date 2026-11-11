/**
 * Fresh numbers on demand. Each generator draws parameters (retrying until
 * the answers are clean), states the problem in exam notation, and computes
 * every answer with the engine, never by hand.
 */
import { rng } from '../engine/aggregate';
import { boxAgents, isEfficient, solveEquilibria } from '../engine/exchange';
import { averageRule, efficientQ, unanimity, voluntaryLog, samuelsonLog } from '../engine/publicgood';
import { optimumConstantMD, permitMarket, pollutingMarket, pricesVsQuantities, uniformStandard } from '../engine/externality';
import { did, didGrowth } from '../engine/evidence';
import { fraction, mrs } from '../engine/utility';
import { LongQ } from './bank';

const isClean = (v: number, den = 12) => /^-?\d+(\/\d+)?$/.test(fraction(v, den));
const fr = (v: number) => fraction(v, 12);

export interface Generator {
  id: string;
  title: string;
  lab: string;
  make: (seed: number) => LongQ;
}

/* ---------------------------------------------------------------- */

function exchange(seed: number): LongQ {
  const r = rng(seed);
  for (let tries = 0; tries < 400; tries++) {
    const k = r.pick([2, 3, 1 / 2, 1 / 3]);
    const T = r.pick([12, 15, 20]);
    const ex = r.int(1, T - 1);
    const ey = r.int(1, T - 1);
    const box = { A: { kind: 'linear' as const, a: 1, b: k }, B: { kind: 'cd' as const, a: 1, b: 1 }, X: T, Y: T };
    const eqs = solveEquilibria(boxAgents(box, [ex, ey]));
    if (eqs.length !== 1) continue;
    const e = eqs[0];
    const xA = e.bundles[0].x;
    const yA = e.bundles[0].y;
    if (![e.p, xA, yA].every((v) => isClean(v))) continue;
    const mA = mrs(box.A, ex, ey).lo;
    const mB = mrs(box.B, T - ex, T - ey).lo;
    if (Math.abs(mA - mB) < 1e-9) continue;
    const ka = k === 1 ? '' : fr(k).includes('/') ? `\\tfrac{${fr(k).split('/')[0]}}{${fr(k).split('/')[1]}}` : fr(k);
    const corner = xA < 1e-9 || yA < 1e-9;
    return {
      id: `gen-ex-${seed}`,
      source: 'generated',
      title: 'Exchange: a linear and a Cobb–Douglas consumer',
      points: 10,
      lab: 'box',
      intro: `Two consumers, two goods. $U_A = X_A + ${ka}Y_A$, $U_B = X_BY_B$. Endowments: A has $(${ex}, ${ey})$, B has $(${T - ex}, ${T - ey})$. Normalise $p_Y = 1$.`,
      parts: [
        {
          label: 'a',
          points: 2,
          prompt: 'Compute both MRS at the endowment. Is it Pareto efficient?',
          fields: [
            { label: 'MRS_A', answer: mA },
            { label: 'MRS_B', answer: mB },
          ],
          model: `$MRS_A = MU_X/MU_Y = 1/${ka || 1} = ${fr(mA)}$, $MRS_B = Y_B/X_B = ${fr(mB)}$. Interior and unequal, so not efficient (${isEfficient(box, ex, ey) ? 'efficient' : 'a lens of mutual gains exists'}).`,
        },
        {
          label: 'b',
          points: 2,
          prompt: 'Describe the contract curve (interior part, and any part on the edges).',
          fields: [{ label: 'interior: Y_B / X_B =', answer: mA }],
          model: `Interior: $MRS_B = MRS_A$, i.e. $Y_B/X_B = ${fr(mA)}$ (a ray from B's origin). Where that ray leaves the box, the curve continues along the edge on which A holds none of the good A values relatively less, with $MRS_A \\le MRS_B$ (or $\\ge$) replacing equality.`,
        },
        {
          label: 'c',
          points: 3,
          prompt: 'Find the competitive equilibrium price ratio $p_X/p_Y$.',
          fields: [{ label: 'p_X / p_Y', answer: e.p }],
          model: corner
            ? `Guess a corner: at the equilibrium price A specialises (MRS_A ${xA < 1e-9 ? '<' : '>'} p). B spends half her wealth on each good. Clearing the X market gives $p^* = ${fr(e.p)}$.`
            : `Interior: A is indifferent along his budget only at $p = MRS_A = ${fr(mA)}$; B's demand then clears the market. $p^* = ${fr(e.p)}$.`,
        },
        {
          label: 'd',
          points: 3,
          prompt: 'Equilibrium allocation of A. Is it efficient?',
          fields: [
            { label: 'X_A', answer: xA },
            { label: 'Y_A', answer: yA },
          ],
          model: `A ends at $(${fr(xA)}, ${fr(yA)})$, B at $(${fr(T - xA)}, ${fr(T - yA)})$. ${corner ? 'A corner, yet efficient: the MRS differ but A holds none of the good he values less.' : 'Interior with equal MRS.'} First welfare theorem.`,
        },
      ],
    };
  }
  throw new Error('no clean exchange problem found');
}

/* ---------------------------------------------------------------- */

function publicGood(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 2000; t++) {
    const aA = 2 * r.int(5, 12) + 1;
    const bB = r.pick([0.5, 1]);
    const aB = r.int(6, 16);
    const Q = r.int(3, 6);
    const MC = aA - Q + aB - bB * Q;
    if (MC <= 4 || MC % 2 !== 0) continue;
    const rs = [
      { id: 'A', name: 'A', alpha: aA, beta: 1 },
      { id: 'B', name: 'B', alpha: aB, beta: bB },
    ];
    if (aA - Q <= 0 || aB - bB * Q <= 0) continue;
    if (Math.abs(efficientQ(rs, MC) - Q) > 1e-6) continue;
    const half = MC / 2;
    const even = averageRule(rs, [half, half]);
    const pre = averageRule(rs, [half, half], 1);
    if (even.requests.some((v) => !isClean(v, 2))) continue;
    // the higher demander is whoever requests more at the even share
    const hi = even.requests[0] >= even.requests[1] ? 0 : 1;
    if (Math.abs(even.requests[0] - even.requests[1]) < 1e-9) continue;
    const un = unanimity(rs[hi], rs[1 - hi], MC);
    if (!isClean(un.x, 2) || un.x <= 0) continue;
    const dB = bB === 1 ? `Q = ${aB} - P` : `Q = ${aB * 2} - 2P`;
    return {
      id: `gen-pg-${seed}`,
      source: 'generated',
      title: 'Public good: the average rule',
      points: 12,
      lab: 'road/mechanism',
      intro: `Ann’s demand for paths: $Q = ${aA} - P$. Ben’s: $${dB}$. $MC = ${MC}$. Each resident is told her tax price per path first ($a + b = MC$); the council then builds the mean request, rounded down.`,
      parts: [
        { label: 'a', points: 2, prompt: 'Socially optimal number of paths?', fields: [{ label: 'Q*', answer: Q }], model: `Vertical sum: $SMB = ${aA + aB} - ${fr(1 + bB)}Q = ${MC}$ ⇒ $Q^* = ${Q}$.` },
        {
          label: 'b',
          points: 3,
          prompt: 'Even shares: requests and paths built?',
          fields: [
            { label: 'Ann requests', answer: even.requests[0] },
            { label: 'Ben requests', answer: even.requests[1] },
            { label: 'built', answer: even.total },
          ],
          model: `Each pays ${half}. Requests ${fr(even.requests[0])} and ${fr(even.requests[1])} (negative requests are 0), average ${fr(even.average)} → ${even.total} built. ${even.total < Q ? 'Under-provision: the low-benefit resident faces too high a price.' : even.total > Q ? 'Over-provision: the keen resident drags the average above the optimum.' : 'Here it happens to hit the optimum.'}`,
        },
        {
          label: 'c',
          points: 3,
          prompt: 'One path pre-built, same taxes. Average requested, total built?',
          fields: [
            { label: 'average', answer: pre.average },
            { label: 'total', answer: pre.total },
          ],
          model: `Requests fall to ${fr(pre.requests[0])} and ${fr(pre.requests[1])}; average ${fr(pre.average)} → ${pre.built}; total ${pre.total} (vs ${even.total} before): ${pre.total === even.total ? 'full' : pre.total < even.total + 1 ? 'partial' : 'no'} crowding-out.`,
        },
        {
          label: 'd',
          points: 4,
          prompt: `Shares ${half} + x for the higher demander and ${half} − x for the other. x for unanimity, and the quantity?`,
          fields: [
            { label: 'x', answer: un.x },
            { label: 'quantity', answer: un.Q },
          ],
          model: `Add the two conditions: $\\sum MB = MC$ ⇒ $Q = ${fr(un.Q)}$; then $x = ${fr(un.x)}$. Optimal (Lindahl), but each has an incentive to understate demand.`,
        },
      ],
    };
  }
  throw new Error('no clean public-good problem');
}

/* ---------------------------------------------------------------- */

function polluters(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 2000; t++) {
    const cA = r.int(1, 6);
    const cB = r.int(1, 6);
    if (cA === cB) continue;
    const E = r.pick([60, 80, 100, 120]);
    const MD = r.pick([60, 72, 90, 120, 144, 160, 180, 240]);
    const fs = [
      { id: 'A', name: 'A', emissions: E, a: 0, c: cA },
      { id: 'B', name: 'B', emissions: E, a: 0, c: cB },
    ];
    const opt = optimumConstantMD(fs, MD);
    if (opt.q.some((q) => q >= E || !isClean(q, 1))) continue;
    const each = opt.total / 2;
    if (!isClean(each, 2)) continue;
    const us = uniformStandard(fs, each);
    const permits = E - each;
    const pm = permitMarket(fs, [permits, permits]);
    const sell = pm.trades.find((x) => x.role === 'sells');
    const slope = (cA * cB) / (cA + cB);
    return {
      id: `gen-pol-${seed}`,
      source: 'generated',
      title: 'Two polluters, four instruments',
      points: 14,
      lab: 'lake/polluters',
      intro: `Firms A and B each emit ${E}. Marginal costs of reduction: $MC_A = ${cA}Q_A$, $MC_B = ${cB}Q_B$. Firms’ benefit from reduction is 0; $MD = ${MD}$.`,
      parts: [
        {
          label: 'a',
          points: 2,
          prompt: 'Efficient abatement for each firm?',
          fields: [
            { label: 'Q_A', answer: opt.q[0] },
            { label: 'Q_B', answer: opt.q[1] },
          ],
          model: `$MC_i = MD$: $Q_A = ${MD}/${cA} = ${fr(opt.q[0])}$, $Q_B = ${MD}/${cB} = ${fr(opt.q[1])}$; total ${fr(opt.total)}.`,
        },
        {
          label: 'b',
          points: 3,
          prompt: 'Each firm must reduce the same amount, with the same total. MCs, and total cost vs. optimum?',
          fields: [
            { label: 'MC_A', answer: us.mc[0] },
            { label: 'MC_B', answer: us.mc[1] },
            { label: 'total cost (standard)', answer: us.costs.total },
            { label: 'total cost (optimum)', answer: opt.costs.total },
          ],
          model: `Each reduces ${fr(each)}: $MC_A = ${fr(us.mc[0])}$, $MC_B = ${fr(us.mc[1])}$. Costs $\\tfrac{c}{2}Q^2$ summed: ${fr(us.costs.total)} vs ${fr(opt.costs.total)}.`,
        },
        { label: 'c', points: 2, prompt: 'Pigouvian tax?', fields: [{ label: 'tax', answer: MD }], model: `$T = MD = ${MD}$; each firm sets $MC_i = T$.` },
        {
          label: 'd',
          points: 4,
          prompt: `Each firm receives ${fr(permits)} tradable permits. Permits sold by the seller, and the price?`,
          fields: [
            { label: 'permits sold', answer: sell ? sell.net : 0 },
            { label: 'price', answer: pm.price },
          ],
          model: `Trade until $MC_A = MC_B$: the low-cost firm (${sell?.id}) sells ${fr(sell?.net ?? 0)} permits at ${fr(pm.price)}.`,
        },
        {
          label: 'e',
          points: 3,
          prompt: 'Aggregate SMC of total reduction: slope? (SMC = k·Q_T)',
          fields: [{ label: 'k', answer: slope }],
          model: `$Q_T = P/${cA} + P/${cB}$ ⇒ $SMC = ${fr(slope)}Q_T$ (horizontal sum).`,
        },
      ],
    };
  }
  throw new Error('no clean polluter problem');
}

/* ---------------------------------------------------------------- */

function pvq(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 2000; t++) {
    const m = r.pick([1, 2, 4 / 3, 1 / 2, 3]);
    const n = r.pick([1, 2, 1 / 2, 3]);
    const Q = r.pick([60, 80, 90, 100, 150]);
    const b0 = Math.round((m + n) * Q);
    if (Math.abs(b0 - (m + n) * Q) > 1e-9) continue;
    const dc = r.pick([-40, -30, -20, 20, 30, 40, 60]);
    const db = r.pick([-40, -30, -20, 0, 20, 30]);
    const s = { c0: 0, m, b0, n, dc, db };
    const res = pricesVsQuantities(s);
    if (![res.qPerceived, res.tax, res.qTax, res.dwlQuantity, res.dwlTax].every((v) => isClean(v, 6))) continue;
    if (res.qPerceived <= 0) continue;
    const over = dc > 0 ? `over-estimates the cost by ${dc}` : `under-estimates the cost by ${-dc}`;
    const ben = db === 0 ? 'knows the benefit' : db > 0 ? `over-estimates the benefit by ${db}` : `under-estimates the benefit by ${-db}`;
    return {
      id: `gen-pvq-${seed}`,
      source: 'generated',
      title: 'Prices vs quantities with a wrong regulator',
      points: 9,
      lab: 'lake/regulator',
      intro: `$SMC = ${fr(m)}Q_T$ and $SMB = ${b0} - ${fr(n)}Q_T$. For every Q the government ${over} and ${ben}.`,
      parts: [
        {
          label: 'a',
          points: 3,
          prompt: 'True and perceived optimum?',
          fields: [
            { label: 'true Q*', answer: res.qStar },
            { label: 'perceived Q^c', answer: res.qPerceived },
          ],
          model: `True: $${fr(m)}Q = ${b0} - ${fr(n)}Q$ ⇒ ${fr(res.qStar)}. Perceived: $${dc} + ${fr(m)}Q = ${b0 + db} - ${fr(n)}Q$ ⇒ ${fr(res.qPerceived)}.`,
        },
        {
          label: 'b',
          points: 2,
          prompt: 'The regulator sets a tax equal to marginal damage on its own (wrong) curves. Tax rate, and how much do firms abate?',
          fields: [
            { label: 'tax', answer: res.tax },
            { label: 'firms’ Q', answer: res.qTax },
          ],
          model: `$T = SMB^c(Q^c) = ${fr(res.tax)}$; firms set the true $SMC = T$: $Q = ${fr(res.qTax)}$.`,
        },
        {
          label: 'c',
          points: 4,
          prompt: 'DWL of each instrument. Which is better?',
          fields: [
            { label: 'DWL quantity', answer: res.dwlQuantity },
            { label: 'DWL tax', answer: res.dwlTax },
          ],
          model: `$\\tfrac12(m+n)(\\text{miss})^2$: quantity ${fr(res.dwlQuantity)}, tax ${fr(res.dwlTax)}. ${res.dwlTax < res.dwlQuantity ? 'Tax better.' : res.dwlTax > res.dwlQuantity ? 'Quantity better.' : 'A tie.'}`,
        },
      ],
    };
  }
  throw new Error('no clean pvq problem');
}

/* ---------------------------------------------------------------- */

function diffInDiff(seed: number): LongQ {
  const r = rng(seed);
  const tPre = r.int(8, 20) * 100 + 50;
  const cPre = r.int(8, 20) * 100;
  const tPost = tPre + r.int(-2, 8) * 100;
  const cPost = cPre + r.int(-2, 8) * 100;
  const c = { treatPre: tPre, treatPost: tPost, ctrlPre: cPre, ctrlPost: cPost };
  const d = did(c);
  const g = didGrowth(c);
  return {
    id: `gen-did-${seed}`,
    source: 'generated',
    title: 'Difference-in-differences',
    points: 6,
    lab: 'evidence/did',
    intro: `A policy hits city T but not city C. Average outcome before/after: T ${tPre} → ${tPost}; C ${cPre} → ${cPost}.`,
    parts: [
      {
        label: 'a',
        points: 3,
        prompt: 'DiD estimate in levels?',
        fields: [
          { label: 'change in T', answer: d.dT },
          { label: 'change in C', answer: d.dC },
          { label: 'DiD', answer: d.estimate },
        ],
        model: `$(${tPost} - ${tPre}) - (${cPost} - ${cPre}) = ${d.estimate}$.`,
      },
      {
        label: 'b',
        points: 3,
        prompt: 'DiD in growth rates (percentage points, one decimal)?',
        fields: [{ label: 'DiD (pp)', answer: g.estimate * 100, tol: 0.06 }],
        model: `$${(g.gT * 100).toFixed(1)}\\% - ${(g.gC * 100).toFixed(1)}\\% = ${(g.estimate * 100).toFixed(1)}$ pp. ${Math.sign(g.estimate) !== Math.sign(d.estimate) ? 'Note the sign flips between levels and growth: the parallel-trend assumption decides the answer.' : ''}`,
      },
    ],
  };
}

/* ---------------------------------------------------------------- */

function voluntary(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 500; t++) {
    const a = r.int(1, 5);
    const b = r.int(1, 4);
    const m = r.pick([60, 100, 120, 150]);
    const G0 = r.pick([5, 10, 15]);
    const ne = voluntaryLog(a, b, [m, m]);
    const opt = samuelsonLog(a, b, [m, m]);
    if (!isClean(ne.contributions[0], 6) || !isClean(opt, 6)) continue;
    const gov = voluntaryLog(a, b, [m, m], G0);
    if (gov.contributions[0] <= 1e-9) continue;
    return {
      id: `gen-vc-${seed}`,
      source: 'generated',
      title: 'Voluntary contributions and crowd-out',
      points: 9,
      lab: 'road/free',
      intro: `Two residents, each with income ${m} and $U = ${a}\\ln x_i + ${b}\\ln M$, $M = M_1 + M_2$. Prices are 1.`,
      parts: [
        {
          label: 'a',
          points: 3,
          prompt: 'Nash equilibrium: each contribution and total M?',
          fields: [
            { label: 'each', answer: ne.contributions[0] },
            { label: 'M', answer: ne.M },
          ],
          model: `Best response $g_i = (${b}(${m}) - ${a}M_{-i})/${a + b}$; symmetric: $g = ${b}\\cdot${m}/(${a}\\cdot 2 + ${b}) = ${fr(ne.contributions[0])}$, $M = ${fr(ne.M)}$.`,
        },
        { label: 'b', points: 3, prompt: 'Socially optimal M?', fields: [{ label: 'M*', answer: opt }], model: `$\\sum MRS = 1$ ⇒ $M^* = 2\\cdot${b}\\cdot${m}/${a + b} = ${fr(opt)}$.` },
        {
          label: 'c',
          points: 3,
          prompt: `The government provides ${G0}, taxing each ${G0 / 2}. New total M?`,
          fields: [{ label: 'M', answer: gov.M }],
          model: `Each cuts her contribution by ${G0 / 2}; $M = ${fr(gov.M)}$: full crowd-out.`,
        },
      ],
    };
  }
  throw new Error('no clean voluntary problem');
}

/* ---------------------------------------------------------------- */

function marketExternality(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 2000; t++) {
    const d1 = r.pick([1, 2]);
    const s1 = r.pick([1, 2]);
    const md1 = r.pick([0, 1, 2]);
    const s0 = r.pick([10, 20, 40]);
    const md0 = r.pick([10, 20, 30, 60]);
    const Qo = r.int(10, 40);
    const d0 = s0 + md0 + (d1 + s1 + md1) * Qo;
    const m = { d0, d1, s0, s1, md0, md1 };
    const res = pollutingMarket(m);
    if (![res.qMarket, res.dwl].every((v) => isClean(v, 4))) continue;
    return {
      id: `gen-mx-${seed}`,
      source: 'generated',
      title: 'A market with a negative externality',
      points: 8,
      lab: 'lake/market',
      intro: `Private marginal benefit $MB = ${d0} - ${d1}Q$, private marginal cost $MC = ${s0} + ${s1}Q$, marginal damage $MD = ${md0}${md1 ? ` + ${md1}Q` : ''}$.`,
      parts: [
        { label: 'a', points: 2, prompt: 'Market quantity?', fields: [{ label: 'Q_m', answer: res.qMarket }], model: `$MB = MC$ ⇒ ${fr(res.qMarket)}.` },
        { label: 'b', points: 2, prompt: 'Social optimum?', fields: [{ label: 'Q*', answer: res.qOpt }], model: `$MB = MC + MD$ ⇒ ${fr(res.qOpt)}.` },
        { label: 'c', points: 2, prompt: 'Pigouvian tax?', fields: [{ label: 'tax', answer: res.pigou }], model: `$T = MD(Q^*) = ${fr(res.pigou)}$.` },
        { label: 'd', points: 2, prompt: 'DWL without the tax?', fields: [{ label: 'DWL', answer: res.dwl }], model: `Triangle: $\\tfrac12 (Q_m - Q^*)(SMC(Q_m) - MB(Q_m)) = ${fr(res.dwl)}$.` },
      ],
    };
  }
  throw new Error('no clean market externality');
}

/* ---------------------------------------------------------------- */

function subsidy(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 2000; t++) {
    const b = r.pick([5, 10, 20]);
    const c = r.pick([10, 20, 30]);
    const P0 = r.int(10, 40);
    const A = (b + c) * P0;
    const s = r.pick([3, 5, 6, 10, 15]);
    const Q0 = c * P0;
    const Pd = (A - c * s) / (b + c);
    const Q1 = A - b * Pd;
    const Ps = Pd + s;
    if (Pd <= 0) continue;
    const CS0 = (0.5 * Q0 * Q0) / b;
    const PS0 = 0.5 * Q0 * P0;
    const CS1 = (0.5 * Q1 * Q1) / b;
    const PS1 = 0.5 * Q1 * Ps;
    const dwl = 0.5 * s * (Q1 - Q0);
    if (![Pd, Q1, CS1, PS1, dwl].every((v) => isClean(v, 4))) continue;
    return {
      id: `gen-sub-${seed}`,
      source: 'generated',
      title: 'Surplus and the deadweight loss of a subsidy',
      points: 10,
      lab: 'lake/market',
      intro: `Demand $Q = ${A} - ${b}P$, supply $Q = ${c}P$. Then a subsidy of ${s} per unit is paid to producers.`,
      parts: [
        {
          label: 'a',
          points: 4,
          prompt: 'Free-market price, quantity, CS and PS?',
          fields: [
            { label: 'P', answer: P0 },
            { label: 'Q', answer: Q0 },
            { label: 'CS', answer: CS0 },
            { label: 'PS', answer: PS0 },
          ],
          model: `$${A} - ${b}P = ${c}P$ ⇒ $P = ${P0}$, $Q = ${Q0}$. CS $= \\tfrac12 Q (${A}/${b} - P) = ${fr(CS0)}$, PS $= \\tfrac12 QP = ${fr(PS0)}$.`,
        },
        {
          label: 'b',
          points: 6,
          prompt: 'With the subsidy: buyers’ price, quantity, CS, PS, DWL?',
          fields: [
            { label: 'buyers’ price', answer: Pd },
            { label: 'Q', answer: Q1 },
            { label: 'CS', answer: CS1 },
            { label: 'PS', answer: PS1 },
            { label: 'DWL', answer: dwl },
          ],
          model: `$${A} - ${b}P_d = ${c}(P_d + ${s})$ ⇒ $P_d = ${fr(Pd)}$, $P_s = ${fr(Ps)}$, $Q = ${fr(Q1)}$. CS ${fr(CS1)}, PS ${fr(PS1)}; cost to government ${fr(s * Q1)}; DWL $= \\tfrac12 \\cdot ${s} \\cdot (${fr(Q1)} - ${Q0}) = ${fr(dwl)}$: units whose cost exceeds their value are now produced.`,
        },
      ],
    };
  }
  throw new Error('no clean subsidy problem');
}

/* ---------------------------------------------------------------- */

/**
 * Consumer choice with a subsidy on the first k units of Y (half price), as
 * in homework 1, Q4. The budget set is not convex (cheap units first), so
 * both segments' optima are compared.
 */
function consumerSubsidy(seed: number): LongQ {
  const r = rng(seed);
  for (let t = 0; t < 3000; t++) {
    const a = r.pick([0.25, 0.5, 0.75]);
    const m = r.pick([60, 80, 100, 120]);
    const px = r.pick([2, 4, 5]);
    const py = r.pick([4, 5, 10]);
    const k = r.pick([2, 3, 4, 5, 6]);
    const U = (x: number, y: number) => Math.pow(x, a) * Math.pow(y, 1 - a);
    const x0 = (a * m) / px;
    const y0 = ((1 - a) * m) / py;
    // segment 1: y ≤ k at price py/2
    let y1 = ((1 - a) * m) / (py / 2);
    let x1 = (a * m) / px;
    if (y1 > k) {
      y1 = k;
      x1 = (m - (py / 2) * k) / px;
    }
    // segment 2: y ≥ k at price py with the subsidy as extra income
    const m2 = m + (py / 2) * k;
    let y2 = ((1 - a) * m2) / py;
    let x2 = (a * m2) / px;
    if (y2 < k) {
      y2 = k;
      x2 = (m - (py / 2) * k) / px;
    }
    const pick1 = U(x1, y1) >= U(x2, y2);
    const xs = pick1 ? x1 : x2;
    const ys = pick1 ? y1 : y2;
    if (![x0, y0, xs, ys].every((v) => isClean(v, 4))) continue;
    if (Math.abs(U(x1, y1) - U(x2, y2)) < 1e-6 && (x1 !== x2 || y1 !== y2)) continue;
    const kink = Math.abs(ys - k) < 1e-9;
    return {
      id: `gen-cs-${seed}`,
      source: 'generated',
      title: 'Consumer choice with a kinked subsidy',
      points: 8,
      lab: 'farmer',
      intro: `Income ${m}; $p_X = ${px}$, $p_Y = ${py}$; $U = X^{${a}}Y^{${1 - a}}$. The government then halves the price of Y for the first ${k} units only.`,
      parts: [
        {
          label: 'a',
          points: 3,
          prompt: 'Demand without the subsidy?',
          fields: [
            { label: 'X', answer: x0 },
            { label: 'Y', answer: y0 },
          ],
          model: `Cobb–Douglas spends shares ${a} and ${1 - a}: $X = ${a}\\cdot${m}/${px} = ${fr(x0)}$, $Y = ${1 - a}\\cdot${m}/${py} = ${fr(y0)}$.`,
        },
        {
          label: 'b',
          points: 5,
          prompt: 'Draw the new budget. What is chosen now?',
          fields: [
            { label: 'X', answer: xs },
            { label: 'Y', answer: ys },
          ],
          model: `The budget has slope $-p_X/(p_Y/2)$ up to $Y = ${k}$, then $-p_X/p_Y$; beyond the kink it is the old line shifted out by the subsidy ${fr((py / 2) * k)}. Best on the first piece: (${fr(x1)}, ${fr(y1)}); best on the second: (${fr(x2)}, ${fr(y2)}). ${kink ? 'The choice sits at the kink, Y = ' + k + '.' : 'The better of the two is the choice.'} Because the cheap units come first, the budget set is not convex: always compare both pieces.`,
        },
      ],
    };
  }
  throw new Error('no clean consumer problem');
}

/* ---------------------------------------------------------------- */

function coaseBargain(seed: number): LongQ {
  const r = rng(seed);
  const b = r.pick([1, 2]);
  const d = r.pick([1, 2, 3]);
  const Qs = r.int(10, 40);
  const a = (b + d) * Qs;
  const Qp = a / b;
  const mbArea = (q0: number, q1: number) => a * (q1 - q0) - (b / 2) * (q1 * q1 - q0 * q0);
  const mdArea = (q0: number, q1: number) => (d / 2) * (q1 * q1 - q0 * q0);
  return {
    id: `gen-co-${seed}`,
    source: 'generated',
    title: 'Coase bargaining',
    points: 10,
    lab: 'lake/coase',
    intro: `A dairy’s marginal benefit from polluting is $MB = ${a} - ${b}Q$; the lake users’ marginal damage is $MD = ${d}Q$. Bargaining is costless.`,
    parts: [
      {
        label: 'a',
        points: 2,
        prompt: 'Pollution chosen by the dairy alone, and the efficient level?',
        fields: [
          { label: 'Q private', answer: Qp },
          { label: 'Q*', answer: Qs },
        ],
        model: `Alone: $MB = 0$ ⇒ $Q = ${fr(Qp)}$. Efficient: $MB = MD$ ⇒ $Q^* = ${Qs}$.`,
      },
      {
        label: 'b',
        points: 4,
        prompt: 'The dairy holds the right. Range of payments from the lake users that both would accept?',
        fields: [
          { label: 'minimum', answer: mbArea(Qs, Qp) },
          { label: 'maximum', answer: mdArea(Qs, Qp) },
        ],
        model: `The dairy needs at least its lost benefit $\\int_{${Qs}}^{${fr(Qp)}} MB = ${fr(mbArea(Qs, Qp))}$; the users gain at most $\\int MD = ${fr(mdArea(Qs, Qp))}$ over the same range.`,
      },
      {
        label: 'c',
        points: 4,
        prompt: 'The lake users hold the right. Range of payments from the dairy?',
        fields: [
          { label: 'minimum', answer: mdArea(0, Qs) },
          { label: 'maximum', answer: mbArea(0, Qs) },
        ],
        model: `Users need at least the damage $\\int_0^{${Qs}} MD = ${fr(mdArea(0, Qs))}$; the dairy will pay at most its benefit $${fr(mbArea(0, Qs))}$. Same $Q^*$, opposite direction of payment.`,
      },
    ],
  };
}

export const GENERATORS: Generator[] = [
  { id: 'consumer', title: 'Consumer choice with a kinked subsidy', lab: 'farmer', make: consumerSubsidy },
  { id: 'coase', title: 'Coase bargaining: who pays whom', lab: 'lake/coase', make: coaseBargain },
  { id: 'exchange', title: 'Exchange economy (Edgeworth box)', lab: 'box', make: exchange },
  { id: 'publicgood', title: 'Public good: average rule, crowd-out, Lindahl', lab: 'road/mechanism', make: publicGood },
  { id: 'polluters', title: 'Two polluters: standard, tax, permits, SMC', lab: 'lake/polluters', make: polluters },
  { id: 'pvq', title: 'Prices vs quantities with a wrong regulator', lab: 'lake/regulator', make: pvq },
  { id: 'did', title: 'Difference-in-differences', lab: 'evidence/did', make: diffInDiff },
  { id: 'voluntary', title: 'Voluntary contribution and crowd-out (log utility)', lab: 'road/free', make: voluntary },
  { id: 'market', title: 'Market with a negative externality', lab: 'lake/market', make: marketExternality },
  { id: 'subsidy', title: 'Surplus and the DWL of a subsidy', lab: 'lake/market', make: subsidy },
];
