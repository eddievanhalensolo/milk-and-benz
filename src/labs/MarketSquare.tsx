import React, { useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { PageHead } from '../App';
import { Bundle, demandAt, excessX, marketDemandX, rationedHoldings, solveEquilibria, tatonnementStep, totals } from '../engine/exchange';
import { allaisSurplus, dispersion, histogram, makeFarmers, needles, taxedEquilibrium } from '../engine/market';
import { pick } from '../engine/utility';
import { useNames } from '../store';
import { Curve, Dot, Label, Needle, Plot, Seg } from '../ui/plot';
import { Check, LabLink, Lemma, Predict, Readouts, Slider, TeX, ViewTitle, f2 } from '../ui/kit';
import { IndividualView } from './shared';

interface SquareState {
  n: number;
  seed: number;
  spread: number;
  tau: number;
  p: number;
  phase: 'closed' | 'running' | 'open';
  ramp: number; // 0..1: how far the stalls have opened (only for the animation)
  sel: number;
  apart: boolean;
  set: (s: Partial<SquareState>) => void;
}

const useSquare = create<SquareState>((set) => ({
  n: 40,
  seed: 7,
  spread: 1,
  tau: 0,
  p: 0.3,
  phase: 'closed',
  ramp: 0,
  sel: 0,
  apart: false,
  set: (s) => set(s),
}));

export default function MarketSquare() {
  const st = useSquare();
  const N = useNames();
  const farmers = useMemo(() => makeFarmers(st.n, st.seed, st.spread), [st.n, st.seed, st.spread]);
  const eq = useMemo(() => solveEquilibria(farmers)[0], [farmers]);
  const taxed = useMemo(() => (st.tau > 0 ? taxedEquilibrium(farmers, st.tau) : null), [farmers, st.tau]);
  const dwl = useMemo(() => (taxed ? allaisSurplus(farmers, taxed.choices).surplus : 0), [farmers, taxed]);
  const [X, Y] = totals(farmers);

  // animation
  const raf = useRef<number>();
  useEffect(() => {
    if (st.phase !== 'running') return;
    let frames = 0;
    const tick = () => {
      const s = useSquare.getState();
      const fs = makeFarmers(s.n, s.seed, s.spread);
      const target = solveEquilibria(fs)[0];
      const ramp = Math.min(1, s.ramp + 0.012);
      const np = ramp < 1 ? s.p : tatonnementStep(fs, s.p, 0.018);
      frames++;
      if (ramp >= 1 && (Math.abs(Math.log(np / target.p)) < 1e-3 || frames > 900)) {
        s.set({ p: target.p, ramp: 1, phase: 'open' });
        return;
      }
      s.set({ p: np, ramp });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [st.phase]);

  // what is on screen
  let holdings: Bundle[];
  let price = st.p;
  if (taxed) {
    holdings = taxed.choices.map((c) => ({ x: c.x, y: c.y }));
    price = taxed.p;
  } else if (st.phase === 'closed') {
    holdings = farmers.map((f) => ({ x: f.e[0], y: f.e[1] }));
  } else {
    const r = rationedHoldings(farmers, st.p);
    holdings = r.map((h, i) => ({
      x: farmers[i].e[0] + st.ramp * (h.x - farmers[i].e[0]),
      y: farmers[i].e[1] + st.ramp * (h.y - farmers[i].e[1]),
    }));
  }
  const mrsAll = needles(farmers, holdings);
  const disp = dispersion(mrsAll);
  const lo = Math.max(1e-3, eq.p / 12);
  const hi = eq.p * 12;
  const bins = 37;
  const hist = histogram(mrsAll, lo, hi, bins);
  const hmax = Math.max(...hist, 1);
  const z = excessX(farmers, st.p);
  const zx = (z.lo + z.hi) / 2;

  const xMax = Math.max(...farmers.map((f) => f.e[0]), ...holdings.map((h) => h.x)) * 1.08;
  const yMax = Math.max(...farmers.map((f) => f.e[1]), ...holdings.map((h) => h.y)) * 1.08;
  const sel = Math.min(st.sel, farmers.length - 1);
  const side = (i: number) => (taxed ? taxed.choices[i].side : 'none');
  const colorOf = (i: number) => (taxed ? (side(i) === 'buyer' ? 'var(--accent)' : side(i) === 'seller' ? 'var(--B)' : 'var(--silver)') : 'var(--ink)');

  // market demand curve for milk (price on the vertical axis)
  const pGrid = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i <= 90; i++) out.push(eq.p * Math.pow(10, -0.9 + (1.8 * i) / 90));
    return out;
  }, [eq.p]);
  const demandPts = pGrid.map((pp) => [marketDemandX(farmers, pp).total, pp] as [number, number]);
  const indiv = st.apart ? farmers.map((f, i) => pGrid.map((pp) => [pick(demandAt(f, pp))[0], pp] as [number, number])) : [];
  const dMax = Math.max(...demandPts.map((d) => d[0])) * 0.8;

  const reset = () => st.set({ phase: 'closed', ramp: 0, p: eq.p * 3, tau: 0 });

  return (
    <div>
      <PageHead num="3b" title="More farmers: the market square" />
      <p className="lede">
        With three or more farmers the Edgeworth box dies: the flipped-origin trick encodes feasibility for exactly two people. What survives is the
        condition. At an efficient allocation every farmer’s MRS is the same, and in a market it equals the price ratio. So the n-person Edgeworth box
        is the market itself. Each dot is a farmer at their current holding; the needle through it is the slope of their indifference curve there.
      </p>
      <div className="controls">
        <Slider label="farmers N" value={st.n} min={2} max={250} step={1} onChange={(v) => st.set({ n: v, phase: 'closed', ramp: 0, sel: 0 })} fmt={(v) => String(v)} width={260} />
        <Slider label="heterogeneity of tastes" value={st.spread} min={0} max={1.4} onChange={(v) => st.set({ spread: v, phase: 'closed', ramp: 0 })} width={260} />
        <button onClick={() => st.set({ seed: st.seed + 1, phase: 'closed', ramp: 0 })}>new village</button>
      </div>
      <div className="controls">
        <button className="primary" disabled={st.phase === 'running' || st.tau > 0} onClick={() => st.set({ phase: 'running', ramp: 0, p: st.phase === 'closed' ? eq.p * 3 : st.p })}>
          open the market
        </button>
        <button onClick={reset}>close it (back to endowments)</button>
        <Slider
          label={<>tax per ton traded, τ</>}
          value={st.tau}
          min={0}
          max={Math.round(eq.p * 60) / 100}
          step={eq.p / 200}
          fmt={(v) => f2(v, 3)}
          onChange={(v) => st.set({ tau: v, phase: v > 0 ? 'open' : st.phase, ramp: 1 })}
          width={300}
        />
      </div>

      <div className="cols-wide">
        <div className="card">
          <ViewTitle zoom="The market — everyone at once" name={`${st.n} ${N.persons}`} />
          <Plot w={640} h={430} x={[0, xMax]} y={[0, yMax]} xLabel={N.x} yLabel={N.y} margin={{ l: 40, b: 36 }}>
            {holdings.map((h, i) => (
              <g key={i}>
                <Needle x={h.x} y={h.y} mrs={mrsAll[i]} len={st.n > 120 ? 7 : 10} stroke={colorOf(i)} width={1.1} opacity={0.85} />
                <Dot x={h.x} y={h.y} r={i === sel ? 4.5 : st.n > 120 ? 1.6 : 2.2} fill={i === sel ? 'var(--accent)' : colorOf(i)} onClick={() => st.set({ sel: i })} title={farmers[i].name} />
              </g>
            ))}
            {/* the price compass: a short segment with slope −p */}
            <Seg a={[xMax * 0.72, yMax * 0.93]} b={[xMax * 0.72 + yMax * 0.12 / price, yMax * 0.81]} stroke="var(--accent)" width={2} />
            <Label x={xMax * 0.72} y={yMax * 0.93} dy={-6} color="var(--accent)" size={12}>
              slope of the price line, −p
            </Label>
            {taxed && (
              <>
                <Seg a={[xMax * 0.72, yMax * 0.74]} b={[xMax * 0.72 + yMax * 0.12 / (price + st.tau), yMax * 0.62]} stroke="var(--accent)" width={1} dash="3 2" />
                <Label x={xMax * 0.72} y={yMax * 0.74} dy={-6} color="var(--accent)" size={12}>
                  buyers face −(p + τ)
                </Label>
              </>
            )}
          </Plot>
          <div className="small muted">
            {taxed ? (
              <>
                Red: buyers of {N.x}, aligned with <TeX>{'p+\\tau'}</TeX>. Steel: sellers, aligned with <TeX>p</TeX>. Grey: farmers the wedge keeps out of the
                market entirely.
              </>
            ) : (
              <>Click a farmer to open their individual view. {st.phase === 'closed' ? 'Before trade the needles point every which way.' : ''}</>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <ViewTitle zoom="The market — the price" name="MRS histogram" />
            <Plot w={380} h={170} x={[0, bins]} y={[0, hmax * 1.1]} axes={false} margin={{ l: 10, r: 10, t: 6, b: 22 }}>
              {hist.map((c, k) => (
                <Seg key={k} a={[k + 0.5, 0]} b={[k + 0.5, c]} stroke="var(--ink)" width={6} opacity={0.75} />
              ))}
              {[price, taxed ? price + st.tau : null].map((v, k) =>
                v ? (
                  <g key={k}>
                    <Seg a={[((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * bins, 0]} b={[((Math.log(v) - Math.log(lo)) / (Math.log(hi) - Math.log(lo))) * bins, hmax * 1.1]} stroke="var(--accent)" dash="3 2" />
                  </g>
                ) : null,
              )}
              <Seg a={[0, 0]} b={[bins, 0]} stroke="var(--ink)" />
            </Plot>
            <div className="small muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>MRS {f2(lo, 3)}</span>
              <span>log scale; red line = p</span>
              <span>{f2(hi, 2)}</span>
            </div>
            <Readouts
              rows={[
                ['price p', `${f2(price, 4)}  (equilibrium ${f2(eq.p, 4)})`],
                [`excess demand, ${N.x}`, taxed || st.phase === 'closed' ? '—' : `${f2(zx, 2)} t`],
                [`excess demand, ${N.y}`, taxed || st.phase === 'closed' ? '—' : `${f2(-st.p * zx, 2)}`],
                ['spread of MRS (sd of log)', f2(disp, 4)],
                ...(taxed
                  ? ([
                      ['buyers / sellers / out', `${taxed.choices.filter((c) => c.side === 'buyer').length} / ${taxed.choices.filter((c) => c.side === 'seller').length} / ${taxed.choices.filter((c) => c.side === 'none').length}`],
                      [`${N.x} traded`, `${f2(taxed.volume, 1)} t (rebate ${f2(taxed.rebate, 4)} each)`],
                      ['deadweight loss', <b key="d">{f2(dwl, 4)} {N.y}</b>],
                    ] as [string, React.ReactNode][])
                  : []),
              ]}
            />
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <ViewTitle zoom="The market — demand" name={st.apart ? 'taken apart' : 'click the curve'} />
            <Plot w={380} h={250} x={[0, dMax]} y={[0, eq.p * 3]} xLabel={`${N.x} demanded`} yLabel="p" margin={{ l: 46 }}>
              {indiv.map((pts, i) => (
                <Curve key={i} pts={pts} stroke={i === sel ? 'var(--accent)' : 'var(--steel)'} width={i === sel ? 1.4 : 0.5} opacity={i === sel ? 1 : 0.6} />
              ))}
              <Curve pts={demandPts} stroke="var(--ink)" width={st.apart ? 1 : 1.6} onClick={() => st.set({ apart: !st.apart })} />
              <Seg a={[X, 0]} b={[X, eq.p * 3]} stroke="var(--ink-3)" dash="4 3" />
              <Label x={X} y={eq.p * 2.7} dx={5} size={11}>
                total stock
              </Label>
              <Seg a={[0, price]} b={[dMax, price]} stroke="var(--accent)" width={0.8} />
              <Dot x={X} y={eq.p} fill="var(--accent)" r={3.5} />
              {!st.apart && (
                <Label x={demandPts[30][0]} y={demandPts[30][1]} dx={6} dy={-4} size={12}>
                  market demand = Σ individual demands
                </Label>
              )}
            </Plot>
            <Check checked={st.apart} onChange={(v) => st.set({ apart: v })}>
              show the {st.n} pieces it is the horizontal sum of
            </Check>
          </div>
        </div>
      </div>

      <div className="cols2" style={{ marginTop: 18 }}>
        <div className="card">
          <IndividualView
            agent={farmers[sel]}
            holding={holdings[sel]}
            p={price + (taxed && side(sel) === 'buyer' ? st.tau : 0)}
            X={xMax}
            Y={yMax}
            names={{ x: N.x, y: N.y, lens: N.lens }}
            color="var(--ink)"
            w={420}
            h={300}
          />
        </div>
        <div>
          <Predict
            id="square-align"
            question="When the market opens, the price moves until excess demand is zero. What happens to the needles?"
            options={['they stay scattered: everyone has different tastes', 'they all become parallel to the price line', 'they align only for farmers with the same tastes']}
            answer={1}
            explain={
              <>
                Every farmer optimises against the same price, so at an interior optimum <TeX>{'MRS_i = p'}</TeX> for all <TeX>i</TeX>. Different tastes and
                endowments put them at different bundles, but with the same slope. That common slope is Pareto efficiency for n people.
              </>
            }
          />
          <Lemma tag="Lemma (the essence of the market)">
            No farmer knows anyone else’s utility. Each only reads one number, <TeX>p</TeX>, and replies with a plan. The price carries the information
            about cost and benefit, rises when plans ask for more {N.x} than exists and falls when they ask for less, and stops exactly where all plans are
            mutually consistent. Consistency at a common price is what equalises the MRS.
          </Lemma>
          <Lemma tag="Lemma (wedge)">
            A tax τ on each ton traded makes buyers equate <TeX>{'MRS = p + \\tau'}</TeX> and sellers <TeX>{'MRS = p'}</TeX>. The needles settle into two
            groups that disagree, so mutually beneficial trades remain unexploited. Their money value, with the revenue rebated lump-sum, is the
            deadweight loss shown above.
          </Lemma>
          <p className="aside small">
            How the animation is honest: while the price is still wrong, trades are provisional (Edgeworth’s recontracting) and the long side of the
            market is rationed pro rata, so every holding stays on its farmer’s budget line and the allocation is always feasible. At the equilibrium price
            nobody is rationed. The reported equilibrium comes from the solver, not the animation.
          </p>
        </div>
      </div>

      <p className="small">
        Back to two people: <LabLink to="box">§2</LabLink>. Same logic with production: <LabLink to="production">§5</LabLink>.
      </p>
    </div>
  );
}
