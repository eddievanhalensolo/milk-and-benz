import React, { useState } from 'react';
import { PageHead } from '../App';
import { U, Utility, demand, formula, icKinks, icY, mrs, pick } from '../engine/utility';
import { addictive, altruism, bliss, habitPath, homeProduction } from '../engine/consumer';
import { useNames } from '../store';
import { Curve, Dot, Drop, Handle, Label, Needle, Plot, Seg, sampleCurve } from '../ui/plot';
import { LabLink, Lemma, Predict, Readouts, Seg as SegCtl, Slider, TeX, ViewTitle, f2 } from '../ui/kit';

type Case = 'classic' | 'subst' | 'compl' | 'home' | 'altruism' | 'addict' | 'habit' | 'bliss';

const CASES: { v: Case; label: string; breaks: boolean }[] = [
  { v: 'classic', label: 'Cobb–Douglas', breaks: false },
  { v: 'subst', label: 'substitutes', breaks: false },
  { v: 'compl', label: 'complements', breaks: false },
  { v: 'home', label: 'home production', breaks: false },
  { v: 'altruism', label: 'altruism', breaks: false },
  { v: 'addict', label: 'MU does not diminish', breaks: true },
  { v: 'habit', label: 'tastes move with consumption', breaks: true },
  { v: 'bliss', label: 'more is not better', breaks: true },
];

export default function OneFarmer() {
  const N = useNames();
  const [cs, setCs] = useState<Case>('classic');
  const [px, setPx] = useState(1);
  const [m, setM] = useState(12);
  const [a, setA] = useState(0.4);
  const [week, setWeek] = useState(0);
  const [probe, setProbe] = useState<[number, number] | null>(null);
  const py = 1;
  const X = 16;
  const Y = 16;
  const info = CASES.find((c) => c.v === cs)!;

  const u: Utility | null =
    cs === 'classic' ? { kind: 'cd', a, b: 1 - a } : cs === 'subst' ? { kind: 'linear', a: a / (1 - a), b: 1 } : cs === 'compl' ? { kind: 'leontief', a: 1, b: (1 - a) / a } : null;

  let best: [number, number] = [0, 0];
  let extra: React.ReactNode = null;
  let ics: React.ReactNode = null;
  let note: React.ReactNode = null;
  let budget: React.ReactNode = <Seg a={[0, m / py]} b={[m / px, 0]} stroke="var(--accent)" width={1.3} />;

  const icFrom = (g: (x: number) => number, kinks: number[] = [], key = 'ic', stroke = 'var(--ink)', w = 1.3, dash?: string) => (
    <Curve key={key} pts={sampleCurve(g, 0, X, kinks)} stroke={stroke} width={w} dash={dash} />
  );

  if (u) {
    const d = demand(u, px, py, m);
    best = pick(d);
    const lv = U(u, best[0], best[1]);
    ics = (
      <>
        {[0.45, 0.7, 1.4, 1.9].map((k) => icFrom((x) => icY(u, x, lv * k), icKinks(u, lv * k), 'f' + k, 'var(--ink)', 0.6))}
        {icFrom((x) => icY(u, x, lv), icKinks(u, lv), 'main')}
      </>
    );
    if (d.x0 !== d.x1) extra = <Seg a={[d.x0, d.y0]} b={[d.x1, d.y1]} stroke="var(--accent)" width={4} opacity={0.4} />;
    const r = mrs(u, best[0], best[1]);
    note =
      cs === 'classic' ? (
        <>
          Interior optimum: <TeX>{`MRS = \\tfrac{a}{1-a}\\tfrac{y}{x} = ${f2(r.lo, 3)} = p_x/p_y`}</TeX>.
        </>
      ) : cs === 'subst' ? (
        <>
          Constant <TeX>{`MRS = ${f2(r.lo, 3)}`}</TeX>. If it exceeds <TeX>{'p_x/p_y'}</TeX> the farmer buys only {N.x}; if below, only {N.y}; if equal, any
          point on the budget (the thick segment). A corner, not a breakdown.
        </>
      ) : (
        <>
          The optimum sits at the kink, where no single MRS exists: the price line is one of many supporting lines. Still a perfectly defined choice.
        </>
      );
  } else if (cs === 'addict') {
    const r = addictive(a, 1 - a, px, py, m);
    best = [r.best.x, r.best.y];
    const lvB = r.U(best[0], best[1]);
    const lvT = r.U(r.tangency.x, r.tangency.y);
    const ic = (lv: number) => (x: number) => (lv - a * x * x >= 0 ? Math.sqrt((lv - a * x * x) / (1 - a)) : NaN);
    ics = (
      <>
        {icFrom(ic(lvT), [], 't', 'var(--ink-3)', 1, '4 3')}
        {icFrom(ic(lvB), [], 'b')}
      </>
    );
    extra = (
      <>
        <Dot x={r.tangency.x} y={r.tangency.y} hollow r={4} fill="var(--ink-3)" />
        <Label x={r.tangency.x} y={r.tangency.y} dx={6} dy={-6} size={12}>
          MRS = p here, and it is the worst point on the budget
        </Label>
      </>
    );
    note = (
      <>
        <TeX>{'U = a x^2 + b y^2'}</TeX>: marginal utility grows with consumption. Indifference curves bow outwards, the tangency condition finds a{' '}
        <i>minimum</i>, and the farmer goes to a corner. Small price changes can flip the choice from all {N.x} to all {N.y}: demand jumps.
      </>
    );
  } else if (cs === 'bliss') {
    const xb = 4;
    const yb = 5;
    const r = bliss(xb, yb, px, py, m);
    best = [r.best.x, r.best.y];
    ics = (
      <>
        {[1, 2.5, 4].map((rad) => (
          <Curve key={rad} pts={Array.from({ length: 90 }, (_, k) => [xb + rad * Math.cos((k / 89) * 2 * Math.PI), yb + rad * Math.sin((k / 89) * 2 * Math.PI)] as [number, number])} stroke="var(--ink)" width={0.7} />
        ))}
      </>
    );
    extra = (
      <>
        <Dot x={xb} y={yb} r={3} fill="var(--ink)" />
        <Label x={xb} y={yb} dx={6} dy={-6} size={12}>
          bliss
        </Label>
      </>
    );
    note = (
      <>
        Indifference curves are circles around a bliss point. {r.unspent > 0 ? <>The farmer stops there and leaves {f2(r.unspent)} unspent: the budget does not bind and Walras’ law fails.</> : <>Here the budget still binds; raise income to see the farmer stop short.</>} Prices no
        longer carry the information the market relies on.
      </>
    );
  } else if (cs === 'habit') {
    const path = habitPath(a, 0.6, px, py, m, 8);
    const w = path[Math.min(week, path.length - 1)];
    best = [w.x, w.y];
    ics = (
      <>
        {path.slice(0, week + 1).map((p, i) => {
          const uu: Utility = { kind: 'cd', a: p.a, b: 1 - p.a };
          const lv = U(uu, p.x, p.y);
          return icFrom((x) => icY(uu, x, lv), [], 'h' + i, i === week ? 'var(--ink)' : 'var(--silver)', i === week ? 1.3 : 0.7);
        })}
      </>
    );
    extra = path.slice(0, week).map((p, i) => <Dot key={i} x={p.x} y={p.y} r={2.5} fill="var(--silver)" />);
    note = (
      <>
        Week {week + 1}: taste for {N.x} <TeX>{`a_t = ${f2(w.a, 3)}`}</TeX>. Same prices, same income, a different choice every week, and each week’s
        indifference map crosses the last. Which week’s utility should judge whether the farmer is better off? Preferences are no longer exogenous, so
        welfare comparisons lose their footing.
      </>
    );
  } else if (cs === 'home') {
    const c = 0.5 * px;
    const H = 4;
    const r = homeProduction(a, c, H, px, py, m);
    best = [r.x, r.y];
    budget = <Curve pts={Array.from({ length: 81 }, (_, k) => [(r.xMax * k) / 80, (m - r.cost((r.xMax * k) / 80)) / py] as [number, number])} stroke="var(--accent)" width={1.3} />;
    const uu: Utility = { kind: 'cd', a, b: 1 - a };
    const lv = U(uu, r.x, r.y);
    ics = icFrom((x) => icY(uu, x, lv), [], 'home');
    note = (
      <>
        The first {H} t of {N.x} can be made at home for {f2(c)} {N.y} each; beyond that it is bought at {f2(px)}. The budget kinks but the set stays
        convex, and the farmer’s choice is as well-defined as ever. Home production does not need a market to be part of the model.
      </>
    );
  } else if (cs === 'altruism') {
    const r = altruism(a, 0.5, 1, px, py, m);
    best = [r.x, r.y];
    const uu: Utility = { kind: 'cd', a, b: 1 - a };
    const lv = U(uu, r.x, r.y);
    ics = icFrom((x) => icY(uu, x, lv), [], 'alt');
    budget = (
      <>
        <Seg a={[0, m / py]} b={[m / px, 0]} stroke="var(--accent)" width={1.3} />
        <Seg a={[0, (m - py * r.g) / py]} b={[(m - py * r.g) / px, 0]} stroke="var(--accent)" width={0.8} dash="4 3" />
      </>
    );
    note = (
      <>
        <TeX>{'U = a\\ln x + (1-a)\\ln y + \\gamma\\ln(y_{B} + g)'}</TeX>: the farmer cares about a neighbour’s Benz and gives <TeX>{`g = ${f2(r.g)}`}</TeX>. The
        gift is a third good with a price; the dashed line is what is left for herself. Altruism is a preference, not a breakdown.
      </>
    );
  }

  const pr = probe ?? best;
  const probeMRS = u ? mrs(u, pr[0], pr[1]).lo : NaN;

  return (
    <div>
      <PageHead num="1" title="One farmer" />
      <p className="lede">
        {N.lens ? `The consumer has income ${m} (p_Y = 1) and faces p_X = ${f2(px)}.` : `Agnes has ${m} cars’ worth of income (price of Benz = 1) and faces a price of milk of ${f2(px)}.`} She picks the best
        bundle she can afford. The theory says where; the switches below say when the theory stops saying anything.
      </p>
      <div className="controls">
        <SegCtl value={cs} options={CASES.filter((c) => !c.breaks).map((c) => ({ v: c.v, label: c.label }))} onChange={(v) => { setCs(v); setProbe(null); }} />
        <span className="muted small">breaks the model:</span>
        <SegCtl value={cs} options={CASES.filter((c) => c.breaks).map((c) => ({ v: c.v, label: c.label }))} onChange={(v) => { setCs(v); setProbe(null); setWeek(0); }} />
      </div>
      <div className="cols-wide">
        <div className="card">
          <ViewTitle zoom="The individual" name={info.label} />
          {u && (
            <div className="small">
              <TeX>{`U = ${formula(u, 'x', 'y')}`}</TeX>
            </div>
          )}
          <Plot w={620} h={440} x={[0, X]} y={[0, Y]} xLabel={N.x} yLabel={N.y} onBackgroundClick={(x, y) => u && setProbe([x, y])}>
            {ics}
            {budget}
            {extra}
            <Drop x={best[0]} y={best[1]} />
            <Dot x={best[0]} y={best[1]} r={5.5} fill="var(--accent)" />
            <Label x={best[0]} y={best[1]} dx={8} dy={-8} color="var(--accent)" size={12.5}>
              choice
            </Label>
            {u && probe && (
              <>
                <Needle x={probe[0]} y={probe[1]} mrs={probeMRS} len={22} stroke="var(--ink)" width={1.6} />
                <Handle x={probe[0]} y={probe[1]} onDrag={(x, y) => setProbe([Math.max(0.05, x), Math.max(0.05, y)])} r={5} />
              </>
            )}
          </Plot>
          {u && <div className="small muted">Click anywhere to drop a probe; its needle is the slope of the indifference curve there. Compare it with the budget line.</div>}
        </div>
        <div>
          <div className="card">
            <Slider label={`price of ${N.x}`} value={px} min={0.3} max={3} step={0.01} onChange={setPx} />
            <Slider label="income" value={m} min={2} max={16} step={0.1} onChange={setM} />
            <Slider label={`taste for ${N.x}`} value={a} min={0.1} max={0.9} step={0.01} onChange={setA} />
            {cs === 'habit' && (
              <div className="controls">
                <button className="primary" onClick={() => setWeek(Math.min(7, week + 1))}>
                  another week
                </button>
                <button className="ghost" onClick={() => setWeek(0)}>
                  start over
                </button>
              </div>
            )}
            <Readouts
              rows={[
                ['choice', `(${f2(best[0])}, ${f2(best[1])})`],
                ['price ratio', f2(px / py, 3)],
                ...(u && probe ? ([['MRS at the probe', f2(probeMRS, 3)]] as [string, string][]) : []),
                ...(u && probe
                  ? ([
                      [
                        'at the probe',
                        probeMRS > px / py
                          ? `she values ${N.x} more than it costs: trade ${N.y} for ${N.x}`
                          : probeMRS < px / py
                            ? `she values ${N.x} less than it costs: trade ${N.x} for ${N.y}`
                            : 'MRS = price ratio',
                      ],
                    ] as [string, string][])
                  : []),
              ]}
            />
          </div>
          <Lemma tag={info.breaks ? 'This breaks it' : 'This does not break it'} quiet={!info.breaks}>
            {note}
          </Lemma>
        </div>
      </div>
      <Predict
        id="farmer-breaks"
        question="Which of these violates the assumptions of the classical consumer model: goods that are perfect complements, or goods whose marginal utility rises with use?"
        options={['complements', 'rising marginal utility', 'both', 'neither']}
        answer={1}
        explain={<>Complements are a kink, still a well-defined optimum. Rising marginal utility turns the tangency into a minimum. Try both switches above.</>}
      />
      <p className="small">
        Next: two farmers, <LabLink to="box">§2</LabLink>.
      </p>
    </div>
  );
}
