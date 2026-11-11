import { useMemo, useState } from 'react';
import { PageHead } from '../App';
import { CrowdOutSetup, EXAM_DID, crowdOutEstimate, did, didGrowth } from '../engine/evidence';
import { useNames } from '../store';
import { Curve, Dot, Handle, Label, Plot, Seg } from '../ui/plot';
import { Lemma, Predict, Readouts, Seg as SegCtl, Slider, Tabs, TeX, ViewTitle, f2, usePredicted } from '../ui/kit';

export default function Evidence({ sub }: { sub: string }) {
  const tab = sub === 'crowdout' ? 'crowdout' : 'did';
  const N = useNames();
  return (
    <div>
      <PageHead num="8" title="Evidence" />
      <p className="lede">
        {N.lens ? 'City T subsidises childcare; city C does not.' : 'Obermilch subsidises the farmers’ crèche; Untermilch does not.'} Did the subsidy change what families spend? The theory of the earlier labs says what
        could happen; this lab is about how one finds out.
      </p>
      <Tabs
        value={tab}
        onChange={(t) => (window.location.hash = '#/evidence/' + t)}
        tabs={[
          { v: 'did', label: 'Difference-in-differences' },
          { v: 'crowdout', label: 'The crowd-out regression' },
        ]}
      />
      {tab === 'did' ? <DiD /> : <CrowdOut />}
    </div>
  );
}

function DiD() {
  const N = useNames();
  const T = N.lens ? 'City T' : 'Obermilch';
  const C = N.lens ? 'City C' : 'Untermilch';
  const [c, setC] = useState(EXAM_DID);
  const [bend, setBend] = useState(0); // differential pre-trend of the treated city
  const [mode, setMode] = useState<'level' | 'growth'>('level');
  const [peek, setPeek] = useState(false);
  const shown = usePredicted('did-exam-sign') || peek;
  const ctrlPre2 = c.ctrlPre - 100;
  const treatPre2 = c.treatPre - 100 - bend;
  const d = did(c);
  const g = didGrowth(c);
  const placebo = c.treatPre - treatPre2 - (c.ctrlPre - ctrlPre2);
  const cf = mode === 'level' ? d.counterfactual : g.counterfactual;
  const est = mode === 'level' ? d.estimate : c.treatPost - cf;
  const yMin = Math.min(treatPre2, ctrlPre2, c.treatPre, c.ctrlPre, c.treatPost, c.ctrlPost, cf) - 150;
  const yMax = Math.max(c.treatPost, c.ctrlPost, cf, c.treatPre, c.ctrlPre) + 150;
  const xs = [0, 1, 2];
  const snap = (v: number) => Math.round(v / 10) * 10;
  return (
    <div>
      <div className="cols-wide">
        <div className="card">
          <ViewTitle zoom="Two cities, three dates" name="drag the four points" />
          <Plot w={620} h={380} x={[-0.3, 2.4]} y={[yMin, yMax]} xTicks={[]} yLabel="average monthly childcare spending">
            <Seg a={[1.5, yMin]} b={[1.5, yMax]} stroke="var(--rule)" width={1} dash="2 3" />
            <Label x={1.5} y={yMax} dx={4} dy={14} size={11} color="var(--ink-3)">
              policy
            </Label>
            {['two years before', 'before', 'after'].map((l, i) => (
              <Label key={l} x={xs[i]} y={yMin} dy={-6} anchor="middle" size={11.5}>
                {l}
              </Label>
            ))}
            <Curve pts={[[0, ctrlPre2], [1, c.ctrlPre], [2, c.ctrlPost]]} stroke="var(--B)" width={1.6} />
            <Curve pts={[[0, treatPre2], [1, c.treatPre], [2, c.treatPost]]} stroke="var(--A)" width={1.6} />
            {shown && (
              <>
                <Curve pts={[[1, c.treatPre], [2, cf]]} stroke="var(--A)" width={1} dash="5 4" />
                <Seg a={[2.12, cf]} b={[2.12, c.treatPost]} stroke="var(--accent)" width={1.6} arrow />
                <Label x={2.15} y={(cf + c.treatPost) / 2} dx={4} color="var(--accent)" size={12.5}>
                  {mode === 'level' ? f2(est, 0) : `${f2(g.estimate * 100, 1)} pp`}
                </Label>
                <Label x={2} y={cf} dx={-8} dy={14} anchor="end" size={11.5} color="var(--A)">
                  {T} had it followed {C}’s {mode === 'level' ? 'change' : 'growth rate'}
                </Label>
              </>
            )}
            <Label x={0} y={treatPre2} dx={-6} dy={-6} anchor="end" color="var(--A)" size={12}>
              {T}
            </Label>
            <Label x={0} y={ctrlPre2} dx={-6} dy={14} anchor="end" color="var(--B)" size={12}>
              {C}
            </Label>
            <Dot x={0} y={treatPre2} r={3} fill="var(--A)" />
            <Dot x={0} y={ctrlPre2} r={3} fill="var(--B)" />
            <Handle x={1} y={c.treatPre} fill="var(--A)" onDrag={(_, y) => setC({ ...c, treatPre: snap(y) })} />
            <Handle x={2} y={c.treatPost} fill="var(--A)" onDrag={(_, y) => setC({ ...c, treatPost: snap(y) })} />
            <Handle x={1} y={c.ctrlPre} fill="var(--B)" onDrag={(_, y) => setC({ ...c, ctrlPre: snap(y) })} />
            <Handle x={2} y={c.ctrlPost} fill="var(--B)" onDrag={(_, y) => setC({ ...c, ctrlPost: snap(y) })} />
          </Plot>
        </div>
        <div>
          <div className="controls">
            <SegCtl
              value={mode}
              options={[
                { v: 'level', label: 'levels' },
                { v: 'growth', label: 'growth rates' },
              ]}
              onChange={setMode}
            />
            <button className="ghost" onClick={() => setC(EXAM_DID)}>
              default numbers
            </button>
          </div>
          <Slider label="bend the pre-period" value={bend} min={-300} max={300} step={10} onChange={setBend} fmt={(v) => String(v)} />
          <table className="tbl">
            <thead>
              <tr>
                <th />
                <th>before</th>
                <th>after</th>
                <th>difference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="txt">{T} (treatment)</td>
                <td>{c.treatPre}</td>
                <td>{c.treatPost}</td>
                <td>{mode === 'level' ? d.dT : `${f2(g.gT * 100, 1)}%`}</td>
              </tr>
              <tr>
                <td className="txt">{C} (control)</td>
                <td>{c.ctrlPre}</td>
                <td>{c.ctrlPost}</td>
                <td>{mode === 'level' ? d.dC : `${f2(g.gC * 100, 1)}%`}</td>
              </tr>
              <tr className="best">
                <td className="txt">difference-in-differences</td>
                <td />
                <td />
                <td>{shown ? (mode === 'level' ? d.estimate : `${f2(g.estimate * 100, 1)} pp`) : '?'}</td>
              </tr>
            </tbody>
          </table>
          {!shown && (
            <div className="small muted">
              The estimate and the counterfactual appear once you have predicted below, or{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); setPeek(true); }}>
                show them now
              </a>
              .
            </div>
          )}
          <Readouts
            rows={[
              ['pre-trend placebo (should be 0)', <span key="p" className={'pill ' + (placebo === 0 ? 'yes' : 'no')}>{placebo}</span>],
              ['levels estimate', shown ? f2(d.estimate, 0) : '—'],
              ['growth-rate estimate', shown ? `${f2(g.estimate * 100, 2)} pp ≈ ${f2(g.estimate * c.treatPre, 0)} at ${T}’s base` : '—'],
            ]}
          />
          <Lemma tag="Identifying assumption">
            Without the policy, {T} would have changed by as much as {C} did (parallel trends). It cannot be tested, because that world was not observed. Its
            visible shadow is the pre-period: if the two lines ran parallel before, the assumption is more believable. Bend the pre-period and the placebo
            stops being zero.
          </Lemma>
          <Lemma tag="Levels or growth?" quiet>
            Parallel in levels and parallel in growth rates are different assumptions, and they can give different answers (switch above and compare).
            Which one is right is a judgement about the cities, not a matter of arithmetic.
          </Lemma>
        </div>
      </div>
      <Predict
        id="did-exam-sign"
        question={`Childcare spending rose in ${T} (800 → 1150) after the subsidy. What does DiD say the subsidy did to family spending?`}
        options={['raised it by 350', 'raised it by 50', 'lowered it by 50', 'nothing']}
        answer={2}
        explain={<>{C} rose by 400 without any subsidy. Against that counterfactual, {T}’s 350 is 50 less: the subsidy reduced family spending by 50.</>}
      />
    </div>
  );
}

function CrowdOut() {
  const [s, setS] = useState<CrowdOutSetup>({ n: 400, seed: 5, b1: -0.6, alpha: 1, taste: 0, politics: 1, reverse: 0 });
  const r = useMemo(() => crowdOutEstimate(s), [s]);
  const drift = useMemo(
    () => Array.from({ length: 21 }, (_, k) => [k / 10, crowdOutEstimate({ ...s, n: 1500, taste: k / 10 }).b1Hat] as [number, number]),
    [s.b1, s.politics, s.reverse, s.alpha, s.seed],
  );
  const Gs = r.data.G;
  const Ps = r.data.P;
  const gMax = Math.max(...Gs) * 1.05;
  const pMin = Math.min(...Ps) - 10;
  const pMax = Math.max(...Ps) + 10;
  const gBar = Gs.reduce((a, b) => a + b, 0) / Gs.length;
  const pBar = Ps.reduce((a, b) => a + b, 0) / Ps.length;
  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        {s.n} towns. <TeX>{'P_i = b_0 + b_1 G_i + \\alpha X_i + e_i'}</TeX>: private spending on the crèche, government spending, an observed control.
        Hidden from the econometrician: each town’s taste <TeX>{'\\theta_i'}</TeX> for crèches.
      </p>
      <div className="cols-wide">
        <div className="card">
          <ViewTitle zoom="Society, sampled" name="each dot a town" />
          <Plot w={600} h={360} x={[0, gMax]} y={[pMin, pMax]} xLabel="government spending G" yLabel="private spending P">
            {Gs.map((g, i) => (
              <Dot key={i} x={g} y={Ps[i]} r={1.6} fill="var(--ink-2)" />
            ))}
            <Curve fn={(g) => pBar + r.b1Hat * (g - gBar)} stroke="var(--accent)" width={1.8} />
            <Curve fn={(g) => pBar + s.b1 * (g - gBar)} stroke="var(--good)" width={1.2} dash="5 4" />
            <Label x={gMax * 0.95} y={pBar + r.b1Hat * (gMax * 0.95 - gBar)} dy={-6} anchor="end" color="var(--accent)" size={12}>
              OLS slope {f2(r.b1Hat, 3)}
            </Label>
            <Label x={gMax * 0.95} y={pBar + s.b1 * (gMax * 0.95 - gBar)} dy={14} anchor="end" color="var(--good)" size={12}>
              true b₁ = {f2(s.b1, 2)}
            </Label>
          </Plot>
        </div>
        <div>
          <Slider label="true crowd-out b₁" value={s.b1} min={-1} max={0} step={0.05} onChange={(v) => setS({ ...s, b1: v })} />
          <Slider label="hidden taste → P" value={s.taste} min={0} max={2} step={0.05} onChange={(v) => setS({ ...s, taste: v })} />
          <Slider label="taste → G (politics)" value={s.politics} min={0} max={2} step={0.05} onChange={(v) => setS({ ...s, politics: v })} />
          <Slider label="low P → more G (reverse)" value={s.reverse} min={0} max={2} step={0.05} onChange={(v) => setS({ ...s, reverse: v })} />
          <button className="ghost" onClick={() => setS({ ...s, seed: s.seed + 1 })}>
            draw another sample
          </button>
          <Readouts
            rows={[
              [<TeX key="b">{'\\hat b_1'}</TeX>, `${f2(r.b1Hat, 3)} (se ${f2(r.se, 3)})`],
              ['true b₁', f2(s.b1, 2)],
              ['bias', f2(r.bias, 3)],
              ['if θ were observed', f2(r.b1Oracle, 3)],
            ]}
          />
          <Plot w={380} h={170} x={[0, 2]} y={[-1.4, 0.6]} xLabel="taste strength" yLabel="b̂₁" margin={{ l: 40 }}>
            <Seg a={[0, s.b1]} b={[2, s.b1]} stroke="var(--good)" dash="4 3" />
            <Curve pts={drift} stroke="var(--accent)" width={1.5} />
            <Dot x={s.taste} y={r.b1Hat} r={3.5} fill="var(--accent)" />
          </Plot>
          <div className="small muted">How the estimate drifts as the hidden taste strengthens (other settings fixed).</div>
        </div>
      </div>
      <Lemma tag="Lemma (omitted variable)">
        Towns that like crèches spend more privately <i>and</i> elect councils that spend more publicly. The regression credits the taste’s effect on P to G,
        pushing <TeX>{'\\hat b_1'}</TeX> towards 0: crowd-out is <b>underestimated</b>. Reverse causality runs the other way: councils subsidise where families
        spend little, making <TeX>{'\\hat b_1'}</TeX> more negative and crowd-out <b>overestimated</b>.
      </Lemma>
    </div>
  );
}
