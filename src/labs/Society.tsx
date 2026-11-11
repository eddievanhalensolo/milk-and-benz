import { useMemo, useState } from 'react';
import { PageHead } from '../App';
import { FIRST } from '../engine/market';
import { W, bestTransfer, contourUB, ede, epsFromSlider, leakyFrontier, welfareParts } from '../engine/society';
import { useNames } from '../store';
import { Area, Curve, Dot, Handle, Label, Plot, Seg } from '../ui/plot';
import { Check, Lemma, Predict, Readouts, Slider, TeX, ViewTitle, f2 } from '../ui/kit';

const epsLabel = (eps: number) => (eps === 0 ? 'utilitarian (sum)' : !isFinite(eps) ? 'Rawlsian (min)' : `ε = ${f2(eps, 2)}`);

export default function Society() {
  const N = useNames();
  const [us, setUs] = useState([9, 6, 4.5, 3, 7.5, 1.5]);
  const [t, setT] = useState(0);
  const [apart, setApart] = useState(false);
  const eps = epsFromSlider(t);
  const names = us.map((_, i) => (N.lens ? `U${'ABCDEF'[i]}` : FIRST[i]));
  const wp = welfareParts(us, names, eps);
  const e = ede(us, eps);
  const yMax = 12;

  // leaky bucket
  const [leak, setLeak] = useState(0.3);
  const [transfer, setTransfer] = useState(0);
  const cR = 100;
  const cP = 20;
  const rho = 0.5;
  const fr0 = useMemo(() => leakyFrontier(cR, cP, 0, rho), []);
  const frL = useMemo(() => leakyFrontier(cR, cP, leak, rho), [leak]);
  const best = bestTransfer(cR, cP, leak, rho, eps);
  const uR = Math.sqrt(cR - transfer);
  const uP = Math.sqrt(cP + (1 - leak) * transfer);
  const wNow = W([uR, uP], eps);

  // Pareto vs W
  const [pt, setPt] = useState<[number, number]>([5, 5]);
  const [cand, setCand] = useState<[number, number]>([8, 3.5]);
  const w0 = W(pt, eps);
  const wC = W(cand, eps);
  const isPareto = cand[0] >= pt[0] - 1e-9 && cand[1] >= pt[1] - 1e-9;
  const wUp = wC >= w0 - 1e-9;

  return (
    <div>
      <PageHead num="4" title="Society" />
      <p className="lede">
        There is no social utility to measure; there are {us.length} {N.persons}, each with a utility, and a rule <TeX>W</TeX> for ranking their lists. The
        rule is a choice. Drag the bars.
      </p>
      <div className="controls">
        <Slider label="inequality aversion" value={t} min={0} max={1} step={0.005} onChange={setT} fmt={() => epsLabel(eps)} width={420} />
      </div>
      <div className="cols-wide">
        <div className="card">
          <ViewTitle zoom="The individuals" name="utility bars" />
          <Plot w={640} h={330} x={[-0.5, us.length - 0.5]} y={[0, yMax]} xTicks={[]} yLabel="utility" margin={{ l: 40, b: 30 }}>
            {us.map((u, i) => (
              <g key={i}>
                <Seg a={[i, 0]} b={[i, u]} stroke={u === Math.min(...us) ? 'var(--accent)' : 'var(--ink)'} width={46} opacity={0.18} />
                <Seg a={[i - 0.32, u]} b={[i + 0.32, u]} stroke="var(--ink)" width={1.6} />
                <Handle x={i} y={u} r={5} onDrag={(_, y) => setUs(us.map((v, j) => (j === i ? Math.max(0.1, Math.min(yMax, y)) : v)))} />
                <Label x={i} y={0} dy={-6} anchor="middle" size={12.5} italic>
                  {names[i]}
                </Label>
                {apart && (
                  <Label x={i} y={u} dy={-12} anchor="middle" size={11} italic={false} color="var(--accent)">
                    {isFinite(eps) && eps !== 0 ? `φ = ${f2(wp.phi.parts[i].value, 2)}` : f2(u, 2)}
                  </Label>
                )}
              </g>
            ))}
            <Seg a={[-0.5, e]} b={[us.length - 0.5, e]} stroke="var(--accent)" width={1.4} dash="6 4" />
            <Label x={us.length - 0.5} y={e} dx={-4} dy={-6} anchor="end" color="var(--accent)" size={12.5}>
              equally-distributed equivalent = {f2(e, 2)}
            </Label>
          </Plot>
          <Check checked={apart} onChange={setApart}>
            take W apart into the terms it adds up
          </Check>
        </div>
        <div>
          <div className="card">
            <h4>W, computed from the bars</h4>
            <div style={{ fontSize: 15 }}>
              {eps === 0 && <TeX block>{`W = \\sum_i U_i = ${us.map((u) => f2(u, 1)).join(' + ')} = ${f2(wp.W, 2)}`}</TeX>}
              {!isFinite(eps) && <TeX block>{`W = n\\cdot\\min_i U_i = ${us.length} \\times ${f2(Math.min(...us), 2)} = ${f2(wp.W, 2)}`}</TeX>}
              {eps > 0 && isFinite(eps) && (
                <TeX block>{`W = n\\Big(\\tfrac1n\\sum_i U_i^{1-\\varepsilon}\\Big)^{\\frac{1}{1-\\varepsilon}} = ${us.length}\\times ${f2(e, 3)} = ${f2(wp.W, 2)}`}</TeX>
              )}
            </div>
            <p className="small">
              W is scaled so that it equals <TeX>n</TeX> times the equally-distributed equivalent: the utility which, given to everybody, would be just as
              good as the actual list. Utilitarian: the mean. Rawlsian: the minimum. In between, inequality costs something.
            </p>
            <Readouts
              rows={[
                ['mean utility', f2(us.reduce((a, b) => a + b, 0) / us.length, 3)],
                ['EDE', f2(e, 3)],
                ['cost of inequality (1 − EDE/mean)', `${f2((1 - e / (us.reduce((a, b) => a + b, 0) / us.length)) * 100, 1)}%`],
              ]}
            />
          </div>
          <Lemma tag="Remark" quiet>
            Comparing W across lists requires utilities that are cardinal and comparable across people. In the Edgeworth preset <TeX>{'U_A = X+3Y'}</TeX>{' '}
            runs to 48 and <TeX>{'U_B = XY'}</TeX> to 144; a utilitarian W there mostly listens to B. That is a property of the numbers chosen, not of the
            people.
          </Lemma>
        </div>
      </div>

      <h3>A Pareto improvement is not the same as “W does not fall”</h3>
      <div className="cols-wide">
        <div className="card">
          <Plot w={600} h={360} x={[0, 12]} y={[0, 12]} xLabel={`U of ${N.A}`} yLabel={`U of ${N.B}`}>
            {/* W-not-falling region: above the contour through pt */}
            <Area
              pts={[
                ...Array.from({ length: 121 }, (_, k) => [k / 10, Math.min(12, contourUB(k / 10, w0, eps))] as [number, number]),
                [12, 12],
                [0, 12],
              ]}
              fill="rgba(93,109,132,0.12)"
            />
            <Area pts={[pt, [12, pt[1]], [12, 12], [pt[0], 12]]} fill="rgba(61,107,79,0.18)" />
            <Curve fn={(x) => contourUB(x, w0, eps)} stroke="var(--B)" width={1.2} />
            <Seg a={pt} b={[12, pt[1]]} stroke="var(--good)" width={1} dash="3 3" />
            <Seg a={pt} b={[pt[0], 12]} stroke="var(--good)" width={1} dash="3 3" />
            <Label x={11.8} y={pt[1]} dy={14} anchor="end" color="var(--good)" size={12}>
              Pareto improvements (NE quadrant)
            </Label>
            <Label x={2.2} y={11.4} color="var(--B)" size={12}>
              W does not fall (above the contour)
            </Label>
            <Handle x={pt[0]} y={pt[1]} onDrag={(x, y) => setPt([Math.max(0.2, Math.min(11.5, x)), Math.max(0.2, Math.min(11.5, y))])} label="now" />
            <Handle
              x={cand[0]}
              y={cand[1]}
              fill={isPareto ? 'var(--good)' : wUp ? 'var(--accent)' : 'var(--ink-3)'}
              onDrag={(x, y) => setCand([Math.max(0.1, Math.min(11.9, x)), Math.max(0.1, Math.min(11.9, y))])}
              label="policy"
            />
            <Seg a={pt} b={cand} stroke="var(--ink-3)" width={0.8} arrow />
          </Plot>
        </div>
        <div>
          <Readouts
            rows={[
              ['W now', f2(w0, 3)],
              ['W after the policy', f2(wC, 3)],
              ['Pareto improvement?', <span key="p" className={'pill ' + (isPareto ? 'yes' : 'no')}>{isPareto ? 'yes' : 'no'}</span>],
              ['W does not fall?', <span key="w" className={'pill ' + (wUp ? 'yes' : 'no')}>{wUp ? 'yes' : 'no'}</span>],
            ]}
          />
          {wUp && !isPareto && (
            <Lemma tag="Look">
              W rises (or stays), yet {cand[0] < pt[0] ? N.A : N.B} is worse off. Every Pareto improvement lies in the green quadrant, which is inside the
              grey region for any W that increases in each utility; the converse fails everywhere in the grey region outside the quadrant.
            </Lemma>
          )}
          {isPareto && (
            <Lemma tag="Lemma">
              A Pareto improvement raises (weakly) <i>every</i> W increasing in each <TeX>{'U_i'}</TeX>. No value judgement is needed to approve it, which is
              why economists like it, and why it decides so little.
            </Lemma>
          )}
          <Predict
            id="society-mc3a"
            question="“A reform helps someone and hurts no one exactly when it does not lower W.” True?"
            options={['true', 'only the “only if” direction is true', 'only the “if” direction is true']}
            answer={1}
            explain={
              <>
                Pareto improvement ⇒ W does not fall (for W increasing in each U). The converse fails: drag the policy point into the grey area outside the
                green quadrant.
              </>
            }
          />
        </div>
      </div>

      <h3>Redistribution with a leaky bucket</h3>
      <div className="cols-wide">
        <div className="card">
          <Plot w={600} h={340} x={[0, Math.sqrt(cR + cP) * 1.05]} y={[0, Math.sqrt(cR + cP) * 1.05]} xLabel={`U of ${N.lens ? 'the rich' : 'Bruno (rich)'}`} yLabel={`U of ${N.lens ? 'the poor' : 'Clara (poor)'}`}>
            <Curve pts={fr0.map((f) => [f.uRich, f.uPoor])} stroke="var(--silver)" width={1.2} dash="4 3" />
            <Curve pts={frL.map((f) => [f.uRich, f.uPoor])} stroke="var(--accent)" width={1.6} />
            {[0.8, 1, 1.2].map((k) => (
              <Curve key={k} fn={(x) => contourUB(x, best.W * k, eps)} stroke="var(--B)" width={k === 1 ? 1 : 0.5} dash={k === 1 ? undefined : '3 3'} />
            ))}
            <Dot x={Math.sqrt(cR)} y={Math.sqrt(cP)} hollow r={4} />
            <Label x={Math.sqrt(cR)} y={Math.sqrt(cP)} dx={6} dy={14} size={12}>
              no transfer
            </Label>
            <Dot x={Math.sqrt(cR - best.t)} y={Math.sqrt(cP + (1 - leak) * best.t)} r={5} fill="none" stroke="var(--ink)" />
            <Dot x={uR} y={uP} r={4.5} fill="var(--accent)" />
            <Label x={fr0[Math.floor(fr0.length * 0.2)].uRich} y={fr0[Math.floor(fr0.length * 0.2)].uPoor} dx={6} size={12} color="var(--ink-3)">
              no leak
            </Label>
          </Plot>
          <div className="small muted">
            Incomes 100 and 20, <TeX>{'u(c) = \\sqrt c'}</TeX>. Every euro taken from the rich arrives as <TeX>{`${f2(1 - leak, 2)}`}</TeX> euro: the frontier
            shrinks (red) inside the no-leak frontier (dashed). Circle: the W-best transfer.
          </div>
        </div>
        <div>
          <Slider label="leak" value={leak} min={0} max={0.9} step={0.01} onChange={setLeak} />
          <Slider label="transfer" value={transfer} min={0} max={cR} step={0.5} onChange={setTransfer} />
          <Readouts
            rows={[
              ['W at your transfer', f2(wNow, 3)],
              ['best transfer for this W', f2(best.t, 1)],
              ['W at best', f2(best.W, 3)],
            ]}
          />
          <Lemma tag="Lemma">
            Equity and efficiency trade off only because the bucket leaks. Utilitarian W transfers until{' '}
            <TeX>{"u'(c_R) = (1-\\lambda)\\,u'(c_P)"}</TeX>, stopping short of equality; Rawlsian W transfers until the poor are no longer the worst off, at
            any leak below 100%. The slider above sets which W you are.
          </Lemma>
        </div>
      </div>
    </div>
  );
}
