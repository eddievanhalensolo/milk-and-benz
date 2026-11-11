import { useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { PageHead } from '../App';
import {
  Box,
  EXAM_BOX,
  EXAM_ENDOWMENT,
  boxAgents,
  boxMRS,
  clearingBundles,
  contractCurve,
  demandAt,
  excessX,
  isEfficient,
  lens,
  rationedHoldings,
  solveEquilibria,
  tatonnementStep,
  uA,
  uB,
  upf,
} from '../engine/exchange';
import { U, Utility, formula, icKinks, icY, mrs, pick, fraction } from '../engine/utility';
import { W, contourUB, epsFromSlider } from '../engine/society';
import { useNames } from '../store';
import { Area, Curve, Dot, Handle, Label, Plot, sampleCurve, usePlot } from '../ui/plot';
import { Check, Gate, Lemma, Predict, Readouts, Seg as SegCtl, Slider, TeX, ViewTitle, f2 } from '../ui/kit';
import { IndividualView, mrsText } from './shared';

type Preset = 'linear' | 'cd' | 'leontief' | 'ql' | 'custom';

const PRESETS: Record<Exclude<Preset, 'custom'>, { box: Box; eA: [number, number]; label: string }> = {
  linear: { box: EXAM_BOX, eA: EXAM_ENDOWMENT, label: 'linear: X + 3Y vs XY' },
  cd: {
    box: { A: { kind: 'cd', a: 0.3, b: 0.7 }, B: { kind: 'cd', a: 0.7, b: 0.3 }, X: 10, Y: 10 },
    eA: [8, 2],
    label: 'two Cobb–Douglas',
  },
  leontief: {
    box: { A: { kind: 'leontief', a: 1, b: 1 }, B: { kind: 'cd', a: 0.5, b: 0.5 }, X: 10, Y: 10 },
    eA: [7, 2],
    label: 'complements vs CD',
  },
  ql: {
    box: { A: { kind: 'ql', v: 4 }, B: { kind: 'cd', a: 0.4, b: 0.6 }, X: 10, Y: 10 },
    eA: [1, 8],
    label: 'quasi-linear vs CD',
  },
};

interface EdgeState {
  preset: Preset;
  box: Box;
  eA: [number, number];
  alloc: [number, number];
  p: number;
  running: boolean;
  settled: boolean;
  who: 'A' | 'B';
  showLens: boolean;
  showCC: boolean;
  showPrice: boolean;
  ineq: number;
  transferNote: string;
  set: (s: Partial<EdgeState>) => void;
}

export const useEdge = create<EdgeState>((set) => ({
  preset: 'linear',
  box: EXAM_BOX,
  eA: EXAM_ENDOWMENT,
  alloc: EXAM_ENDOWMENT,
  p: 1.5,
  running: false,
  settled: false,
  who: 'A',
  showLens: true,
  showCC: true,
  showPrice: true,
  ineq: 0,
  transferNote: '',
  set: (s) => set(s),
}));

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function familyOptions(): { v: Utility['kind']; label: string }[] {
  return [
    { v: 'cd', label: 'Cobb–Douglas' },
    { v: 'linear', label: 'substitutes' },
    { v: 'leontief', label: 'complements' },
    { v: 'ql', label: 'quasi-linear' },
  ];
}

function defaultFor(kind: Utility['kind']): Utility {
  switch (kind) {
    case 'cd':
      return { kind: 'cd', a: 0.5, b: 0.5 };
    case 'linear':
      return { kind: 'linear', a: 1, b: 2 };
    case 'leontief':
      return { kind: 'leontief', a: 1, b: 1 };
    case 'ql':
      return { kind: 'ql', v: 4 };
  }
}

function UtilityEditor({ u, onChange, who }: { u: Utility; onChange: (u: Utility) => void; who: string }) {
  return (
    <div className="controls" style={{ margin: '2px 0' }}>
      <span className="small" style={{ width: 54 }}>
        {who}
      </span>
      <select value={u.kind} onChange={(e) => onChange(defaultFor(e.target.value as Utility['kind']))}>
        {familyOptions().map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      {u.kind === 'cd' && <Slider label="weight on X" value={u.a / (u.a + u.b)} min={0.1} max={0.9} onChange={(v) => onChange({ kind: 'cd', a: v, b: 1 - v })} width={200} />}
      {u.kind === 'linear' && <Slider label="MRS a/b" value={u.a / u.b} min={0.1} max={3} onChange={(v) => onChange({ kind: 'linear', a: v, b: 1 })} width={200} />}
      {u.kind === 'leontief' && <Slider label="Y per X" value={u.b / u.a} min={0.25} max={3} onChange={(v) => onChange({ kind: 'leontief', a: 1, b: v })} width={200} />}
      {u.kind === 'ql' && <Slider label="v" value={u.v} min={0.5} max={12} onChange={(v) => onChange({ kind: 'ql', v })} width={200} />}
    </div>
  );
}

/** Top and right edges of the box, with B's axes measured from the opposite corner. */
function BoxFrame({ X, Y }: { X: number; Y: number }) {
  const s = usePlot();
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={s.sx(0)} x2={s.sx(X)} y1={s.sy(Y)} y2={s.sy(Y)} stroke="var(--B)" strokeWidth={1} />
      <line x1={s.sx(X)} x2={s.sx(X)} y1={s.sy(0)} y2={s.sy(Y)} stroke="var(--B)" strokeWidth={1} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={s.sx(X * t)} x2={s.sx(X * t)} y1={s.sy(Y)} y2={s.sy(Y) + 4} stroke="var(--B)" />
          <line x1={s.sx(X)} x2={s.sx(X) - 4} y1={s.sy(Y * t)} y2={s.sy(Y * t)} stroke="var(--B)" />
        </g>
      ))}
    </g>
  );
}

function BoxFrameLabels({ X, Y }: { X: number; Y: number }) {
  const ticks = [0, 0.5, 1];
  return (
    <>
      {ticks.slice(1).map((t) => (
        <Label key={'x' + t} x={X * t} y={Y} dy={14} dx={t === 0 ? 8 : t === 1 ? -8 : 0} anchor="middle" size={10} italic={false} color="var(--B)">
          {String(X * (1 - t))}
        </Label>
      ))}
      {ticks.slice(1).map((t) => (
        <Label key={'y' + t} x={X} y={Y * t} dx={-8} dy={3} anchor="end" size={10} italic={false} color="var(--B)">
          {String(Y * (1 - t))}
        </Label>
      ))}
    </>
  );
}

export default function Edgeworth() {
  const st = useEdge();
  const N = useNames();
  const { box, eA, alloc, p } = st;
  const agents = useMemo(() => boxAgents(box, eA, [N.A, N.B]), [box, eA, N.A, N.B]);
  const cc = useMemo(() => contractCurve(box), [box]);
  const frontier = useMemo(() => upf(box), [box]);
  const eqs = useMemo(() => solveEquilibria(agents), [agents]);
  const eq = eqs.length ? eqs.reduce((b, e) => (Math.abs(Math.log(e.p / p)) < Math.abs(Math.log(b.p / p)) ? e : b)) : null;

  // ---- animation: tâtonnement with provisional (rationed) trades ----
  const raf = useRef<number>();
  useEffect(() => {
    if (!st.running) return;
    let frames = 0;
    const tick = () => {
      const s = useEdge.getState();
      const ags = boxAgents(s.box, s.eA);
      const target = solveEquilibria(ags);
      const tgt = target.length ? target.reduce((b, e) => (Math.abs(Math.log(e.p / s.p)) < Math.abs(Math.log(b.p / s.p)) ? e : b)) : null;
      const np = tatonnementStep(ags, s.p, 0.025);
      const h = rationedHoldings(ags, np);
      frames++;
      if (tgt && (Math.abs(Math.log(np / tgt.p)) < 1.5e-3 || frames > 600)) {
        s.set({ p: tgt.p, alloc: [tgt.bundles[0].x, tgt.bundles[0].y], running: false, settled: true });
        return;
      }
      s.set({ p: np, alloc: [h[0].x, h[0].y] });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [st.running]);

  const lvA = uA(box, alloc[0], alloc[1]);
  const lvB = uB(box, alloc[0], alloc[1]);
  const lensPts = st.showLens ? lens(box, alloc[0], alloc[1]) : null;
  const efficient = isEfficient(box, alloc[0], alloc[1]);
  const m = boxMRS(box, alloc[0], alloc[1]);
  const z = excessX(agents, p);
  // where demand is set-valued (a linear farmer at p = MRS) and some selection clears, show that selection
  const clears = z.lo <= 1e-9 && z.hi >= -1e-9;
  const setValued = z.hi - z.lo > 1e-9;
  const cb = clears ? clearingBundles(agents, p) : null;
  const planA: [number, number] = cb ? [cb[0].x, cb[0].y] : pick(demandAt(agents[0], p));
  const planBown: [number, number] = cb ? [cb[1].x, cb[1].y] : pick(demandAt(agents[1], p));
  const planB: [number, number] = [box.X - planBown[0], box.Y - planBown[1]];
  const zx = clears ? 0 : (z.lo + z.hi) / 2;
  const zy = -p * zx; // Walras' law

  const icA = (lvl: number) => sampleCurve((x) => icY(box.A, x, lvl), 0, box.X, icKinks(box.A, lvl));
  const icB = (lvl: number) =>
    sampleCurve((x) => box.Y - icY(box.B, box.X - x, lvl), 0, box.X, icKinks(box.B, lvl).map((k) => box.X - k));

  const setAlloc = (x: number, y: number) => st.set({ alloc: [clamp(x, 0, box.X), clamp(y, 0, box.Y)], settled: false, running: false });
  const setEndow = (x: number, y: number) => {
    const e: [number, number] = [clamp(x, 0, box.X), clamp(y, 0, box.Y)];
    st.set({ eA: e, alloc: e, settled: false, running: false, transferNote: '' });
  };

  const nearestOnCC = (x: number, y: number) => {
    let best = cc[0];
    let bd = Infinity;
    for (const pt of cc) {
      const d = (pt.x - x) ** 2 + (pt.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = pt;
      }
    }
    return best;
  };

  /** Second welfare theorem: a lump-sum transfer that makes the market deliver a chosen efficient point. */
  const deliver = (tx: number, ty: number) => {
    const mA = mrs(box.A, tx, ty);
    const mB = mrs(box.B, box.X - tx, box.Y - ty);
    // supporting prices for each farmer, given which edges they sit on
    const support = (r: { lo: number; hi: number }, x: number, y: number) => {
      if (x < 1e-9 && y < 1e-9) return [0, Infinity];
      if (x < 1e-9) return [r.lo, Infinity];
      if (y < 1e-9) return [0, r.hi];
      return [r.lo, r.hi];
    };
    const [a0, a1] = support(mA, tx, ty);
    const [b0, b1] = support(mB, box.X - tx, box.Y - ty);
    const lo = Math.max(a0, b0);
    const hi = Math.min(a1, b1);
    const pt = isFinite(hi) ? (lo > 0 ? Math.sqrt(lo * hi) : hi / 2 || 0.5) : lo * 1.0001 || 1;
    // move only Benz (a lump sum) so the new endowment lies on the line through the target
    let ne: [number, number] = [eA[0], ty + pt * (tx - eA[0])];
    if (ne[1] < 0 || ne[1] > box.Y) ne = [tx + (ty - eA[1]) / pt, eA[1]];
    ne = [clamp(ne[0], 0, box.X), clamp(ne[1], 0, box.Y)];
    const dy = ne[1] - eA[1];
    const dx = ne[0] - eA[0];
    const who = (d: number) => (d > 0 ? `${N.B} → ${N.A}` : `${N.A} → ${N.B}`);
    const note =
      Math.abs(dy) > 1e-9
        ? `Lump-sum transfer: ${f2(Math.abs(dy))} ${N.y} (${who(dy)}). Then the market is left alone.`
        : `Lump-sum transfer: ${f2(Math.abs(dx))} ${N.x} (${who(dx)}). Then the market is left alone.`;
    st.set({ eA: ne, alloc: ne, p: Math.max(0.05, pt * 1.8), settled: false, running: true, transferNote: note });
  };

  const loadPreset = (k: Preset) => {
    if (k === 'custom') return st.set({ preset: k });
    const pr = PRESETS[k];
    st.set({ preset: k, box: pr.box, eA: pr.eA, alloc: pr.eA, p: 1.5, settled: false, running: false, transferNote: '' });
  };

  // ---- society view ----
  const eps = epsFromSlider(st.ineq);
  const uAmax = U(box.A, box.X, box.Y);
  const uBmax = U(box.B, box.X, box.Y);
  const pts = frontier.map((f) => [f.uA, f.uB] as [number, number]);
  const wBest = frontier.reduce((b, f) => (W([f.uA, f.uB], eps) > W([b.uA, b.uB], eps) ? f : b), frontier[0]);
  const wHere = W([lvA, lvB], eps);
  const eqU = eq ? [uA(box, eq.bundles[0].x, eq.bundles[0].y), uB(box, eq.bundles[0].x, eq.bundles[0].y)] : null;

  const where = eq
    ? eq.bundles[0].x < 1e-6
      ? 1
      : eq.bundles[0].y < 1e-6
        ? 2
        : eq.bundles[1].x < 1e-6 || eq.bundles[1].y < 1e-6
          ? 3
          : 0
    : 0;

  const predictId = 'edge-where-' + st.preset + '-' + eA.map((v) => v.toFixed(2)).join(',');
  const sub = (s: string) => (N.lens ? `_${s}` : `_{\\text{${s === 'A' ? N.A[0] : N.B[0]}}}`);

  return (
    <div>
      <PageHead num="2" title="Two farmers: the Edgeworth box" />
      <p className="lede">
        {N.lens ? 'Consumer A' : 'Agnes'} measures from the bottom-left corner, {N.lens ? 'consumer B' : 'Bruno'} from the top-right. Every point of the box is
        a complete allocation of the {box.X} {N.lens ? 'units of X' : 'tons of milk'} and {box.Y} {N.lens ? 'units of Y' : 'Benz'} between them. Drag the
        filled dot (the allocation) or the hollow one (the endowment ω).
      </p>
      <div className="controls">
        <SegCtl
          value={st.preset}
          options={[
            { v: 'linear', label: 'linear vs XY' },
            { v: 'cd', label: 'two CD' },
            { v: 'leontief', label: 'complements' },
            { v: 'ql', label: 'quasi-linear' },
            { v: 'custom', label: 'custom' },
          ]}
          onChange={loadPreset}
        />
        <Check checked={st.showLens} onChange={(v) => st.set({ showLens: v })}>
          lens
        </Check>
        <Check checked={st.showCC} onChange={(v) => st.set({ showCC: v })}>
          contract curve
        </Check>
        <Check checked={st.showPrice} onChange={(v) => st.set({ showPrice: v })}>
          price line &amp; plans
        </Check>
      </div>
      {st.preset === 'custom' && (
        <div className="card" style={{ marginBottom: 10 }}>
          <UtilityEditor who={N.A} u={box.A} onChange={(u) => st.set({ box: { ...box, A: u }, settled: false })} />
          <UtilityEditor who={N.B} u={box.B} onChange={(u) => st.set({ box: { ...box, B: u }, settled: false })} />
        </div>
      )}

      <div className="cols3">
        {/* ---------------- individual ---------------- */}
        <div className="card">
          <div className="controls" style={{ marginTop: 0 }}>
            <SegCtl
              value={st.who}
              options={[
                { v: 'A', label: N.A },
                { v: 'B', label: N.B },
              ]}
              onChange={(v) => st.set({ who: v })}
            />
          </div>
          <IndividualView
            agent={agents[st.who === 'A' ? 0 : 1]}
            holding={st.who === 'A' ? { x: alloc[0], y: alloc[1] } : { x: box.X - alloc[0], y: box.Y - alloc[1] }}
            p={p}
            X={box.X}
            Y={box.Y}
            names={{ x: N.x, y: N.y, lens: N.lens }}
            color={st.who === 'A' ? 'var(--A)' : 'var(--B)'}
            w={360}
            h={320}
          />
        </div>

        {/* ---------------- the box (market) ---------------- */}
        <div className="card">
          <ViewTitle zoom="The market — two people" name="the box" />
          <div className="small">
            <TeX>{`U${sub('A')} = ${formula(box.A, N.lens ? 'X_A' : 'm', N.lens ? 'Y_A' : 'b')}`}</TeX>
            <span className="muted"> · </span>
            <TeX>{`U${sub('B')} = ${formula(box.B, N.lens ? 'X_B' : 'm', N.lens ? 'Y_B' : 'b')}`}</TeX>
          </div>
          <Plot
            w={460}
            h={440}
            x={[0, box.X]}
            y={[0, box.Y]}
            margin={{ t: 30, r: 34, l: 40, b: 38 }}
            xLabel={`${N.x} of ${N.A} →`}
            yLabel={`${N.y} of ${N.A}`}
            onBackgroundDrag={(x, y) => setAlloc(x, y)}
          >
            <BoxFrame X={box.X} Y={box.Y} />
            <BoxFrameLabels X={box.X} Y={box.Y} />
            {lensPts && <Area pts={lensPts} fill="var(--accent-soft)" />}
            {[0.55, 1.5].map((k) => (
              <Curve key={'a' + k} pts={icA(lvA * k)} stroke="var(--A)" width={0.6} opacity={0.3} />
            ))}
            {[0.55, 1.5].map((k) => (
              <Curve key={'b' + k} pts={icB(lvB * k)} stroke="var(--B)" width={0.6} opacity={0.3} />
            ))}
            <Curve pts={icA(lvA)} stroke="var(--A)" width={1.4} />
            <Curve pts={icB(lvB)} stroke="var(--B)" width={1.4} />
            {st.showCC && (
              <Curve
                pts={cc.map((c) => [c.x, c.y])}
                stroke="var(--accent)"
                width={2.2}
                opacity={0.55}
                onClick={() => undefined}
              />
            )}
            {st.showPrice && (
              <>
                <Curve fn={(x) => eA[1] - p * (x - eA[0])} stroke="var(--accent)" width={1.1} />
                <Dot x={planA[0]} y={planA[1]} fill="var(--A)" r={4} title={`${N.A}'s plan`} />
                <Dot x={planB[0]} y={planB[1]} fill="var(--B)" r={4} title={`${N.B}'s plan`} />
                <Label x={planA[0]} y={planA[1]} dx={6} dy={-6} color="var(--A)" size={12}>
                  {N.A} wants
                </Label>
                <Label x={planB[0]} y={planB[1]} dx={6} dy={14} color="var(--B)" size={12}>
                  {N.B} wants
                </Label>
              </>
            )}
            {eq && st.settled && <Dot x={eq.bundles[0].x} y={eq.bundles[0].y} r={6} fill="var(--accent)" />}
            <Handle x={eA[0]} y={eA[1]} onDrag={setEndow} hollow fill="var(--ink-2)" r={5} label="ω" title="endowment (drag)" />
            <Handle x={alloc[0]} y={alloc[1]} onDrag={setAlloc} fill="var(--ink)" r={6} title="allocation (drag)" />
            {st.showCC && cc.length > 10 && (
              <Label x={cc[Math.floor(cc.length * 0.72)].x} y={cc[Math.floor(cc.length * 0.72)].y} dx={8} dy={4} color="var(--accent)" size={12}>
                contract curve
              </Label>
            )}
          </Plot>
          <div className="small muted" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              O<sub>{N.lens ? 'A' : N.A[0]}</sub> bottom-left
            </span>
            <span>
              O<sub>{N.lens ? 'B' : N.B[0]}</sub> top-right; {N.B}’s {N.x} = {box.X} − x
            </span>
          </div>
          <div className="controls">
            <Slider
              label="price p"
              value={Math.log10(p)}
              min={-1.3}
              max={1.3}
              step={0.001}
              fmt={() => f2(p, 3)}
              onChange={(v) => st.set({ p: Math.pow(10, v), settled: false, running: false })}
              width={250}
            />
            <button className="primary" onClick={() => st.set({ running: !st.running, alloc: st.running ? alloc : eA, settled: false })}>
              {st.running ? 'pause' : 'let the price adjust'}
            </button>
            <button onClick={() => st.set({ alloc: eA, settled: false, running: false })}>back to ω</button>
          </div>
        </div>

        {/* ---------------- society ---------------- */}
        <div className="card">
          <ViewTitle zoom="Society" name="utility space" />
          <Plot
            w={360}
            h={320}
            x={[0, uAmax * 1.04]}
            y={[0, uBmax * 1.04]}
            xLabel={`U of ${N.A}`}
            yLabel={`U of ${N.B}`}
            onBackgroundClick={(ua) => {
              // click near the frontier: move the allocation to the efficient point with that U_A
              const f = frontier.reduce((b, q) => (Math.abs(q.uA - ua) < Math.abs(b.uA - ua) ? q : b));
              setAlloc(f.x, f.y);
            }}
          >
            <Area pts={[[lvA, lvB], [uAmax * 2, lvB], [uAmax * 2, uBmax * 2], [lvA, uBmax * 2]]} fill="rgba(61,107,79,0.08)" />
            {[0.5, 1, 1.5].map((k) => {
              const w = wHere * k;
              return <Curve key={k} fn={(ua) => contourUB(ua, w, eps)} stroke="var(--silver)" width={k === 1 ? 1 : 0.6} dash={k === 1 ? undefined : '3 3'} />;
            })}
            <Curve pts={pts} stroke="var(--accent)" width={1.8} />
            <Label x={pts[Math.floor(pts.length * 0.35)][0]} y={pts[Math.floor(pts.length * 0.35)][1]} dx={6} dy={-6} color="var(--accent)" size={12}>
              UPF
            </Label>
            <Dot x={uA(box, eA[0], eA[1])} y={uB(box, eA[0], eA[1])} hollow fill="var(--ink-2)" r={3.5} />
            {eqU && <Dot x={eqU[0]} y={eqU[1]} fill="var(--accent)" r={4} title="competitive equilibrium" />}
            <Dot x={wBest.uA} y={wBest.uB} fill="none" stroke="var(--ink)" r={6} />
            <Label x={wBest.uA} y={wBest.uB} dx={8} dy={-6} size={12}>
              W*
            </Label>
            <Dot x={lvA} y={lvB} fill="var(--ink)" r={4.5} />
          </Plot>
          <Slider
            label="inequality aversion"
            value={st.ineq}
            min={0}
            max={1}
            step={0.01}
            fmt={() => (eps === 0 ? 'sum' : !isFinite(eps) ? 'min' : 'ε=' + f2(eps, 1))}
            onChange={(v) => st.set({ ineq: v })}
          />
          <div className="small muted">
            Green: Pareto improvements on the current point. Grey: contours of <TeX>W</TeX> (solid through the current point). Click near the frontier to
            jump to that efficient allocation.
          </div>
        </div>
      </div>

      {/* ---------------- readouts & lemmas ---------------- */}
      <div className="cols3" style={{ marginTop: 18 }}>
        <div>
          <h4>At the allocation</h4>
          <Readouts
            rows={[
              [`${N.A} holds`, `(${f2(alloc[0])}, ${f2(alloc[1])})`],
              [`${N.B} holds`, `(${f2(box.X - alloc[0])}, ${f2(box.Y - alloc[1])})`],
              [<TeX key="a">{`MRS${sub('A')}`}</TeX>, mrsText(box.A, alloc[0], alloc[1])],
              [<TeX key="b">{`MRS${sub('B')}`}</TeX>, mrsText(box.B, box.X - alloc[0], box.Y - alloc[1])],
              ['Pareto efficient?', <span key="e" className={'pill ' + (efficient ? 'yes' : 'no')}>{efficient ? 'yes' : 'no — the lens is non-empty'}</span>],
            ]}
          />
          {efficient && Math.abs(m.A.lo - m.B.lo) > 1e-6 && isFinite(m.A.lo) && isFinite(m.B.lo) && (
            <Lemma tag="Edge">
              Efficient although <TeX>{`MRS${sub('A')} \\ne MRS${sub('B')}`}</TeX>. On the boundary the condition is an inequality: the farmer holding none of a
              good values it at most as much as the other does.
            </Lemma>
          )}
        </div>
        <div>
          <h4>The market at p = {f2(p, 3)}</h4>
          <Readouts
            rows={[
              [`${N.A}'s plan`, `(${f2(planA[0])}, ${f2(planA[1])})`],
              [`${N.B}'s plan`, `(${f2(planBown[0])}, ${f2(planBown[1])})`],
              [
                `excess demand, ${N.x}`,
                setValued
                  ? `[${f2(z.lo, 2)}, ${f2(z.hi, 2)}]: a set, someone is indifferent along the budget${clears ? '; 0 is in it' : ''}`
                  : `${f2(zx, 3)}  (${N.A} ${f2(z.parts[0].lo)}, ${N.B} ${f2(z.parts[1].lo)})`,
              ],
              [`excess demand, ${N.y}`, f2(zy, 3)],
              [
                'solver says',
                <Gate key="g" id={predictId}>
                  {eq ? `p* = ${fraction(eq.p)} (${f2(eq.p, 4)})${eqs.length > 1 ? ` · ${eqs.length} equilibria` : ''}` : 'none found'}
                </Gate>,
              ],
            ]}
          />
          {st.transferNote && <div className="small" style={{ marginTop: 6 }}>{st.transferNote}</div>}
          {st.settled && eq && (
            <Lemma tag="First welfare theorem">
              The plans now coincide at <TeX>{`p^* = ${fraction(eq.p)}`}</TeX>, and the allocation lies on the contract curve (efficient:{' '}
              {isEfficient(box, eq.bundles[0].x, eq.bundles[0].y) ? 'yes' : 'no'}).
            </Lemma>
          )}
        </div>
        <div>
          <h4>Second welfare theorem</h4>
          <p className="small" style={{ marginTop: 0 }}>
            Choose any point on the contract curve. The council moves the endowment by a lump-sum transfer, then steps aside; the market carries the
            box to the chosen point.
          </p>
          <div className="controls">
            {[0.2, 0.45, 0.7, 0.9].map((t) => {
              const c = cc[Math.floor(t * (cc.length - 1))];
              return (
                <button key={t} onClick={() => deliver(c.x, c.y)}>
                  target {Math.round(t * 100)}%
                </button>
              );
            })}
          </div>
          <div className="small muted">Percent = how far along the contract curve from {N.A}’s origin.</div>
          <Readouts
            rows={[
              ['W here', f2(wHere, 2)],
              ['W at W*', f2(W([wBest.uA, wBest.uB], eps), 2)],
            ]}
          />
        </div>
      </div>

      <Predict
        id={predictId}
        question={`From this endowment, where will the market settle?`}
        options={['in the interior', `on the edge where ${N.A} holds no ${N.x}`, `on the edge where ${N.A} holds no ${N.y}`, `on an edge of ${N.B}'s`]}
        answer={where}
        explain={
          eq ? (
            <>
              The solver finds <TeX>{`p^* = ${fraction(eq.p)}`}</TeX>, {N.A} ends at ({f2(eq.bundles[0].x)}, {f2(eq.bundles[0].y)}).{' '}
              {where === 1 && (
                <>
                  Since <TeX>{`MRS${sub('A')} = ${f2(mrs(box.A, 0, 1).lo, 3)} < p^*`}</TeX>, {N.A} sells every unit of {N.x}: a corner.
                </>
              )}{' '}
              Press “let the price adjust” to watch it happen.
            </>
          ) : (
            'No equilibrium found.'
          )
        }
      />

      <Lemma tag="Remark" quiet>
        Why the contract curve leaves the interior: along <TeX>{'X_A = 0'}</TeX> farmer A would like to give up even more <TeX>X</TeX> at B’s rate, but
        has none left. The tangency condition <TeX>{'MRS_A = MRS_B'}</TeX> is replaced by the Kuhn–Tucker inequality <TeX>{'MRS_A \\le MRS_B'}</TeX>.
        So unequal MRS does not prove an allocation inefficient: at a corner, <TeX>{'MRS_A < MRS_B'}</TeX> is compatible with Pareto efficiency. See it
        at the point <TeX>{'(0, 24/5)'}</TeX> in the first preset.
      </Lemma>

    </div>
  );
}
