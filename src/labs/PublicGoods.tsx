import { useMemo, useState } from 'react';
import { create } from 'zustand';
import { PageHead } from '../App';
import {
  EXAM_MC,
  Resident,
  averageRule,
  bestLindahlLie,
  bestStatement,
  efficientQ,
  horizontalDemand,
  lindahlLie,
  mb,
  payoffFromStatement,
  samuelsonLog,
  smb,
  unanimity,
  voluntaryLinear,
  voluntaryLog,
  wanted,
} from '../engine/publicgood';
import { useNames } from '../store';
import { Curve, Dot, Drop, Label, Plot, Seg } from '../ui/plot';
import { Check, LabLink, Lemma, Predict, Readouts, Slider, Tabs, TeX, ViewTitle, f2, usePredicted } from '../ui/kit';

type Tab = 'sum' | 'free' | 'mechanism' | 'lie' | 'provision';

const usePG = create<{
  rA: Resident;
  rB: Resident;
  MC: number;
  shareA: number;
  prebuilt: number;
  x: number;
  set: (s: object) => void;
}>((set) => ({
  rA: { id: 'A', name: 'A', alpha: 20, beta: 1 },
  rB: { id: 'B', name: 'B', alpha: 8, beta: 0.5 },
  MC: EXAM_MC,
  shareA: 8,
  prebuilt: 0,
  x: 0,
  set: (s) => set(s),
}));

function useResidents() {
  const st = usePG();
  const N = useNames();
  const nA = N.lens ? 'Ann' : 'Greta';
  const nB = N.lens ? 'Ben' : 'Hugo';
  return { ...st, rs: [{ ...st.rA, name: nA }, { ...st.rB, name: nB }] as Resident[], nA, nB };
}

export default function PublicGoods({ sub }: { sub: string }) {
  const tab = (['sum', 'free', 'mechanism', 'lie', 'provision'].includes(sub) ? sub : 'mechanism') as Tab;
  const N = useNames();
  return (
    <div>
      <PageHead num="7" title="Public goods: the Milchstraße" />
      <p className="lede">
        The road from the farms to town, the Milchstraße, is used by everyone and wanted by everyone, and nobody wants to pay for it. A kilometre of
        road ridden by {N.lens ? 'Ann' : 'Greta'} is not one fewer for {N.lens ? 'Ben' : 'Hugo'} (non-rival), and nobody can be kept off it
        (non-excludable).
      </p>
      <Tabs
        value={tab}
        onChange={(t) => (window.location.hash = '#/road/' + t)}
        tabs={[
          { v: 'sum', label: 'Milk adds across, road adds up' },
          { v: 'free', label: 'Free-riding' },
          { v: 'mechanism', label: 'The town’s mechanism' },
          { v: 'lie', label: 'Lie about your demand' },
          { v: 'provision', label: 'Who should build it' },
        ]}
      />
      {tab === 'sum' && <SumTab />}
      {tab === 'free' && <FreeTab />}
      {tab === 'mechanism' && <MechanismTab />}
      {tab === 'lie' && <LieTab />}
      {tab === 'provision' && <ProvisionTab />}
    </div>
  );
}

function ResidentSliders() {
  const st = useResidents();
  return (
    <div className="card">
      <h4>Residents</h4>
      <Slider label={`${st.nA}: intercept`} value={st.rA.alpha} min={4} max={30} step={0.5} onChange={(v) => st.set({ rA: { ...st.rA, alpha: v } })} />
      <Slider label={`${st.nA}: slope`} value={st.rA.beta} min={0.25} max={3} step={0.05} onChange={(v) => st.set({ rA: { ...st.rA, beta: v } })} />
      <Slider label={`${st.nB}: intercept`} value={st.rB.alpha} min={2} max={30} step={0.5} onChange={(v) => st.set({ rB: { ...st.rB, alpha: v } })} />
      <Slider label={`${st.nB}: slope`} value={st.rB.beta} min={0.25} max={3} step={0.05} onChange={(v) => st.set({ rB: { ...st.rB, beta: v } })} />
      <Slider label="MC per path" value={st.MC} min={4} max={40} step={1} onChange={(v) => st.set({ MC: v, shareA: v / 2 })} />
      <button
        className="ghost"
        onClick={() => st.set({ rA: { id: 'A', name: 'A', alpha: 20, beta: 1 }, rB: { id: 'B', name: 'B', alpha: 8, beta: 0.5 }, MC: EXAM_MC, shareA: EXAM_MC / 2, prebuilt: 0 })}
      >
        default numbers
      </button>
      <div className="small muted">
        Inverse demands: <TeX>{`MB = ${st.rA.alpha} - ${f2(st.rA.beta)}Q`}</TeX> and <TeX>{`MB = ${st.rB.alpha} - ${f2(st.rB.beta)}Q`}</TeX>.
      </div>
    </div>
  );
}

/* ================================================================== */

function SumTab() {
  const st = useResidents();
  const [apart, setApart] = useState(true);
  const qStar = efficientQ(st.rs, st.MC);
  const qMax = Math.max(...st.rs.map((r) => r.alpha / r.beta)) * 1.05;
  const pMax = (st.rA.alpha + st.rB.alpha) * 1.1;
  return (
    <div className="cols3">
      <div className="card">
        <ViewTitle zoom="Private good" name="milk: add quantities" />
        <Plot w={360} h={300} x={[0, horizontalDemand(st.rs, 0).total * 1.05]} y={[0, pMax * 0.7]} xLabel="Q" yLabel="P">
          {st.rs.map((r, i) => (
            <Curve key={i} fn={(q) => r.alpha - r.beta * q} from={0} to={r.alpha / r.beta} stroke={i ? 'var(--B)' : 'var(--A)'} width={0.9} dash="4 3" />
          ))}
          <Curve
            pts={Array.from({ length: 101 }, (_, k) => {
              const P = (Math.max(st.rA.alpha, st.rB.alpha) * k) / 100;
              return [horizontalDemand(st.rs, P).total, P] as [number, number];
            })}
            stroke="var(--ink)"
            width={1.6}
          />
          <Label x={horizontalDemand(st.rs, st.rA.alpha * 0.3).total} y={st.rA.alpha * 0.3} dx={4} dy={-4} size={12}>
            Σ quantities at each price
          </Label>
        </Plot>
        <p className="small">
          A ton of milk drunk by {st.nA} cannot be drunk by {st.nB}. At a common price each buys her own quantity; market demand adds horizontally.
        </p>
      </div>
      <div className="card">
        <ViewTitle zoom="Public good" name="road: add willingness to pay" />
        <Plot w={420} h={320} x={[0, qMax]} y={[0, pMax]} xLabel="paths Q" yLabel="$ per path">
          {apart &&
            [0.15, 0.3, 0.45].map((t) => {
              const q = qMax * t;
              const a = mb(st.rs[0], q);
              const b = mb(st.rs[1], q);
              return (
                <g key={t}>
                  <Seg a={[q, 0]} b={[q, a]} stroke="var(--A)" width={4} opacity={0.35} />
                  <Seg a={[q, a]} b={[q, a + b]} stroke="var(--B)" width={4} opacity={0.35} />
                </g>
              );
            })}
          {st.rs.map((r, i) => (
            <Curve key={i} fn={(q) => mb(r, q)} stroke={i ? 'var(--B)' : 'var(--A)'} width={apart ? 1.1 : 0.6} dash={apart ? undefined : '3 3'} />
          ))}
          <Curve fn={(q) => smb(st.rs, q).total} stroke="var(--ink)" width={1.8} onClick={() => setApart(!apart)} />
          <Seg a={[0, st.MC]} b={[qMax, st.MC]} stroke="var(--accent)" />
          <Label x={qMax * 0.97} y={st.MC} dy={-5} anchor="end" color="var(--accent)" size={12}>
            MC = {st.MC}
          </Label>
          <Label x={qMax * 0.05} y={smb(st.rs, qMax * 0.05).total} dx={4} dy={-5} size={12}>
            SMB = Σ MB_i (click)
          </Label>
          <Label x={st.rA.alpha / st.rA.beta * 0.6} y={mb(st.rs[0], (st.rA.alpha / st.rA.beta) * 0.6)} dx={4} dy={12} color="var(--A)" size={12}>
            {st.nA}
          </Label>
          <Label x={st.rB.alpha / st.rB.beta * 0.8} y={mb(st.rs[1], (st.rB.alpha / st.rB.beta) * 0.8)} dx={4} dy={-4} color="var(--B)" size={12}>
            {st.nB}
          </Label>
          <Drop x={qStar} y={st.MC} />
          <Dot x={qStar} y={st.MC} r={4} fill="var(--accent)" />
          <Label x={qStar} y={0} dx={3} dy={-4} color="var(--accent)" size={12}>
            Q* = {f2(qStar)}
          </Label>
        </Plot>
        <Check checked={apart} onChange={setApart}>
          stack the individual willingness to pay
        </Check>
        <Lemma tag="Samuelson">
          Everyone consumes the same road, so the social value of one more path is the <i>sum</i> of what each would pay for it:{' '}
          <TeX>{'\\sum_i MB_i(Q^*) = MC'}</TeX>. Note the kink where a resident’s MB reaches zero: beyond it, the SMB is only the other’s.
        </Lemma>
      </div>
      <ResidentSliders />
    </div>
  );
}

/* ================================================================== */

function FreeTab() {
  const st = useResidents();
  const [n, setN] = useState(2);
  const [G0, setG0] = useState(0);
  const vl = voluntaryLinear(st.rs, st.MC);
  const qStar = efficientQ(st.rs, st.MC);
  const incomes = Array.from({ length: n }, () => 100);
  const ne = voluntaryLog(4, 2, incomes, G0);
  const opt = samuelsonLog(4, 2, incomes);
  const noGov = voluntaryLog(4, 2, incomes, 0);
  return (
    <div className="cols2">
      <div>
        <h3>With the two residents</h3>
        <p>
          Suppose there is no town council: each resident may chip in for paths. Each buys paths only while her <i>own</i> marginal benefit exceeds the
          full MC. The keenest resident stops where <TeX>{'MB_i = MC'}</TeX>; the others ride for free.
        </p>
        <Readouts
          rows={[
            ['each would buy alone', st.rs.map((r, i) => `${r.name}: ${f2(vl.each[i])}`).join(', ')],
            ['built voluntarily', f2(vl.Q)],
            ['efficient', f2(qStar)],
          ]}
        />
        {vl.Q === 0 && (
          <Lemma tag="Remark" quiet>
            At MC = {st.MC} neither resident values even the first path at its full cost, so nothing is built, although the road is worth{' '}
            {f2(smb(st.rs, 0).total)} per path to the two together. Lower MC and watch only one resident pay.
          </Lemma>
        )}
        <ResidentSliders />
      </div>
      <div>
        <h3>With log utility (homework 2, Q8)</h3>
        <p className="small">
          {n} residents, each with income 100 and <TeX>{'U = 4\\ln x_i + 2\\ln M'}</TeX>, where <TeX>{'M'}</TeX> is total road (police, in the homework)
          and each unit costs 1.
        </p>
        <Slider label="residents" value={n} min={2} max={20} step={1} onChange={setN} fmt={(v) => String(v)} />
        <Slider label="council builds G₀ (equal taxes)" value={G0} min={0} max={60} step={1} onChange={setG0} fmt={(v) => String(v)} />
        <Plot w={460} h={240} x={[0, 1]} y={[0, Math.max(opt, ne.M) * 1.2]} axes={false} margin={{ l: 10, r: 10, t: 10, b: 10 }}>
          <Seg a={[0.18, 0]} b={[0.18, G0]} stroke="var(--accent)" width={34} opacity={0.6} />
          <Seg a={[0.18, G0]} b={[0.18, ne.M]} stroke="var(--ink)" width={34} opacity={0.75} />
          <Label x={0.18} y={ne.M} dy={-6} anchor="middle" size={12}>
            Nash: {f2(ne.M)}
          </Label>
          <Seg a={[0.5, 0]} b={[0.5, noGov.M]} stroke="var(--ink)" width={34} opacity={0.35} />
          <Label x={0.5} y={noGov.M} dy={-6} anchor="middle" size={12}>
            without council: {f2(noGov.M)}
          </Label>
          <Seg a={[0.82, 0]} b={[0.82, opt]} stroke="var(--good)" width={34} opacity={0.6} />
          <Label x={0.82} y={opt} dy={-6} anchor="middle" size={12}>
            optimum: {f2(opt)}
          </Label>
        </Plot>
        <Readouts
          rows={[
            ['private contribution each', f2(ne.contributions[0], 3)],
            ['total M', f2(ne.M, 3)],
            ['crowd-out', G0 > 0 ? `${f2(((noGov.M + G0 - ne.M) / G0) * 100, 1)}% of G₀ replaced` : '—'],
          ]}
        />
        <Lemma tag="Lemma">
          In the Nash equilibrium each resident equates her own MRS to the price, ignoring the benefit to the others:{' '}
          <TeX>{'M^{NE} = \\dfrac{n\\,b\\,m}{a\\,n + b}'}</TeX>, short of the Samuelson level <TeX>{'M^* = \\dfrac{n\\,b\\,m}{a+b}'}</TeX> (where{' '}
          <TeX>{'\\sum_i MRS_i = 1'}</TeX>), and the gap grows with <TeX>n</TeX>. As long as
          residents still contribute, a council-built unit financed by their taxes replaces a privately built one one-for-one: <b>full crowd-out</b>.
        </Lemma>
        <Predict
          id="pg-crowdout"
          question="The council builds 10 paths, taxing the two residents 5 each. Total road?"
          options={['50: ten more than before', 'between 40 and 50', 'still 40']}
          answer={2}
          explain={<>Each resident cuts her own contribution by exactly what her tax paid for. Total stays 40: full crowd-out (until G₀ exceeds what they would have bought).</>}
        />
      </div>
    </div>
  );
}

/* ================================================================== */

function MechanismTab() {
  const st = useResidents();
  const N = useNames();
  const shares = [st.shareA, st.MC - st.shareA];
  const res = averageRule(st.rs, shares, st.prebuilt);
  const [peek, setPeek] = useState(false);
  const shown = usePredicted('pg-even') || peek;
  const base = averageRule(st.rs, [st.MC / 2, st.MC / 2], 0);
  const qStar = efficientQ(st.rs, st.MC);
  // the high demander is whoever asks for more at the even share
  const high = wanted(st.rs[0], st.MC / 2) >= wanted(st.rs[1], st.MC / 2) ? 0 : 1;
  const un = unanimity(st.rs[high], st.rs[1 - high], st.MC);
  const qMax = Math.max(...st.rs.map((r) => r.alpha / r.beta)) * 1.05;
  const mbPrebuilt = (r: Resident, i: number) => (q: number) => mb(r, q + st.prebuilt);
  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        The council asks each resident how many paths she wants, knowing her tax price per path. It builds the <b>average</b> of the requests, rounded
        down. Tax prices sum to MC.
      </p>
      <div className="cols-wide">
        <div className="card">
          <Plot w={600} h={360} x={[0, qMax]} y={[0, Math.max(st.rA.alpha, st.rB.alpha) * 1.1]} xLabel="paths Q (additional)" yLabel="$ per path">
            {st.rs.map((r, i) => (
              <Curve key={i} fn={mbPrebuilt(r, i)} stroke={i ? 'var(--B)' : 'var(--A)'} width={1.4} />
            ))}
            {shares.map((t, i) => (
              <g key={i}>
                <Seg a={[0, t]} b={[qMax, t]} stroke={i ? 'var(--B)' : 'var(--A)'} dash="4 3" width={0.9} />
                <Label x={qMax * 0.98} y={t} dy={i ? 14 : -5} anchor="end" color={i ? 'var(--B)' : 'var(--A)'} size={12}>
                  {st.rs[i].name}’s tax price {f2(t)}
                </Label>
                {shown && res.requests[i] > 0 && <Drop x={res.requests[i]} y={t} />}
                {shown && <Dot x={res.requests[i]} y={Math.max(t, mb(st.rs[i], res.requests[i] + st.prebuilt))} r={4} fill={i ? 'var(--B)' : 'var(--A)'} />}
              </g>
            ))}
            {shown && <Seg a={[res.built, 0]} b={[res.built, st.rA.alpha]} stroke="var(--accent)" width={1.4} />}
            {shown && (
              <Label x={res.built} y={st.rA.alpha * 0.95} dx={5} color="var(--accent)" size={12}>
                built: {res.built}
              </Label>
            )}
            <Label x={st.rs[0].alpha * 0.1} y={mb(st.rs[0], st.rs[0].alpha * 0.1 + st.prebuilt)} dx={4} dy={-4} color="var(--A)" size={12}>
              {st.rs[0].name}
            </Label>
            <Label x={1} y={mb(st.rs[1], 1 + st.prebuilt)} dx={4} dy={14} color="var(--B)" size={12}>
              {st.rs[1].name}
            </Label>
          </Plot>
        </div>
        <div>
          <div className="card">
            <Slider label={`${st.nA}’s tax price a`} value={st.shareA} min={0} max={st.MC} step={0.5} onChange={(v) => st.set({ shareA: v })} />
            <Slider label="paths pre-built by the council" value={st.prebuilt} min={0} max={6} step={1} onChange={(v) => st.set({ prebuilt: v })} fmt={(v) => String(v)} />
            <div className="controls">
              <button onClick={() => st.set({ shareA: st.MC / 2 })}>even shares (a = b)</button>
              <button onClick={() => st.set({ shareA: un.taxHigh * (high === 0 ? 1 : 0) + un.taxLow * (high === 1 ? 1 : 0) })}>unanimity shares</button>
            </div>
            <Readouts
              rows={[
                ['requests', shown ? res.requests.map((r, i) => `${st.rs[i].name} ${f2(r)}`).join(', ') : '—'],
                ['average', shown ? f2(res.average) : '—'],
                ['built now (rounded down)', shown ? String(res.built) : '—'],
                ['total paths', shown ? <b key="t">{f2(res.total)}</b> : '—'],
                ['social optimum', f2(qStar)],
              ]}
            />
            {!shown && (
              <div className="small muted">
                Requests and the result appear once you have predicted below, or{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setPeek(true); }}>
                  show them now
                </a>
                .
              </div>
            )}
          </div>
          {shown && st.prebuilt > 0 && Math.abs(st.shareA - st.MC / 2) < 1e-9 && (
            <Lemma tag="Crowd-out">
              Without pre-building the town got {base.total}. Now it gets {res.total}.{' '}
              {res.total === base.total
                ? `Every pre-built path is offset by lower requests: full crowding-out.`
                : res.total > base.total
                  ? `Partial crowding-out: total rose by ${f2(res.total - base.total)} for ${st.prebuilt} pre-built.`
                  : ''}
            </Lemma>
          )}
          <Lemma tag="Personalised shares" quiet>
            Charge the high-demand resident <TeX>{`${f2(st.MC / 2)} + x`}</TeX> and the other <TeX>{`${f2(st.MC / 2)} - x`}</TeX>. Both request the same
            quantity at <TeX>{`x = ${f2(un.x)}`}</TeX>, and that quantity is <TeX>{`Q = ${f2(un.Q)}`}</TeX>: adding the two conditions gives{' '}
            <TeX>{'MB_A + MB_B = MC'}</TeX>, Samuelson’s rule. These are Lindahl prices.
          </Lemma>
        </div>
      </div>
      <Predict
        id="pg-even"
        question={`Default numbers, even shares a = b = 8. How many paths are built?`}
        options={['8, the optimum', '6', '12', '0']}
        answer={1}
        explain={
          <>
            {N.lens ? 'Ann' : 'Greta'} wants <TeX>{'20 - Q = 8 \\Rightarrow 12'}</TeX>, {N.lens ? 'Ben' : 'Hugo'} wants <TeX>{'8 - Q/2 = 8 \\Rightarrow 0'}</TeX>. The
            average 6 is built. Too few: at an even split, every path costs the less keen resident more than it is worth to her, so she asks for none and pulls the average down.
          </>
        }
      />
    </div>
  );
}

/* ================================================================== */

function LieTab() {
  const st = useResidents();
  const N = useNames();
  const shares = [st.MC / 2, st.MC / 2];
  const truthful = Math.max(0, (st.rA.alpha - shares[0]) / st.rA.beta);
  const [stated, setStated] = useState(Math.round(truthful));
  const best = bestStatement(st.rs, shares, 0);
  const me = payoffFromStatement(st.rs, shares, 0, stated);
  const truth = payoffFromStatement(st.rs, shares, 0, truthful);
  const curve = useMemo(
    () => Array.from({ length: 161 }, (_, k) => [k / 4, payoffFromStatement(st.rs, shares, 0, k / 4).payoff] as [number, number]),
    [st.rA, st.rB, st.MC],
  );
  const ymin = Math.min(...curve.map((c) => c[1]));
  const ymax = Math.max(...curve.map((c) => c[1]));

  const high = st.rs[0];
  const low = st.rs[1];
  const [rep, setRep] = useState(high.alpha);
  const L = lindahlLie(high, low, st.MC, rep);
  const Lt = lindahlLie(high, low, st.MC, high.alpha);
  const Lb = bestLindahlLie(high, low, st.MC);
  const lcurve = useMemo(
    () => Array.from({ length: 121 }, (_, k) => {
      const a = st.MC / 2 + ((high.alpha * 1.4 - st.MC / 2) * k) / 120;
      return [a, lindahlLie(high, low, st.MC, a).payoff] as [number, number];
    }),
    [st.rA, st.rB, st.MC],
  );
  const lmin = Math.min(...lcurve.map((c) => c[1]));
  const lmax = Math.max(...lcurve.map((c) => c[1]));
  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        You are {st.nA} (true demand <TeX>{`MB = ${st.rA.alpha} - ${f2(st.rA.beta)}Q`}</TeX>). {st.nB} answers truthfully. The town cannot see inside
        your head.
      </p>
      <div className="cols2">
        <div className="card">
          <ViewTitle zoom="Average rule, even shares" name="what should you say?" />
          <Slider label="paths you request" value={stated} min={0} max={40} step={0.5} onChange={setStated} />
          <Plot w={480} h={260} x={[0, 40]} y={[Math.min(0, ymin) * 1.1, ymax * 1.15]} xLabel="your request" yLabel="your true surplus">
            <Curve pts={curve} stroke="var(--ink)" width={1.4} />
            <Seg a={[truthful, ymin * 1.1]} b={[truthful, ymax * 1.15]} stroke="var(--silver)" dash="3 3" />
            <Label x={truthful} y={ymax * 1.08} dx={4} size={12}>
              truthful
            </Label>
            <Dot x={stated} y={me.payoff} r={5} fill="var(--accent)" />
          </Plot>
          <Readouts
            rows={[
              ['truthful request', `${f2(truthful)} → ${truth.total} built → surplus ${f2(truth.payoff)}`],
              ['your request', `${f2(stated)} → ${me.total} built → surplus ${f2(me.payoff)}`],
              ['best request', `${f2(best.s)} → ${best.total} built → surplus ${f2(best.payoff)}`],
            ]}
          />
          <Lemma tag="It pays">
            You know {st.nB} will ask for {f2(me.requests[1])}. Exaggerating drags the average up toward what <i>you</i> want, and you pay only{' '}
            {f2(shares[0])} per path. The average rule rewards over-statement by the keen.
          </Lemma>
        </div>
        <div className="card">
          <ViewTitle zoom={`Personalised shares ${f2(st.MC / 2)} ± x`} name="report your demand curve" />
          <Slider label="intercept you report" value={rep} min={st.MC / 2} max={high.alpha * 1.4} step={0.1} onChange={setRep} />
          <Plot w={480} h={260} x={[st.MC / 2, high.alpha * 1.4]} y={[Math.min(0, lmin) * 1.1, lmax * 1.2]} xLabel="reported intercept" yLabel="your true surplus">
            <Curve pts={lcurve} stroke="var(--ink)" width={1.4} />
            <Seg a={[high.alpha, lmin * 1.1]} b={[high.alpha, lmax * 1.2]} stroke="var(--silver)" dash="3 3" />
            <Label x={high.alpha} y={lmax * 1.1} dx={4} size={12}>
              truthful
            </Label>
            <Dot x={rep} y={L.payoff} r={5} fill="var(--accent)" />
          </Plot>
          <Readouts
            rows={[
              ['truthful', `Q = ${f2(Lt.Q)}, your price ${f2(Lt.taxHigh)}, surplus ${f2(Lt.payoff)}`],
              ['your report', `Q = ${f2(L.Q)}, your price ${f2(L.taxHigh)}, surplus ${f2(L.payoff)}`],
              ['best report', `intercept ${f2(Lb.alpha)}, Q = ${f2(Lb.Q)}, surplus ${f2(Lb.payoff)}`],
            ]}
          />
          <Lemma tag="It pays, the other way">
            Under personalised prices your share rises with your stated keenness. Understating lowers your price by more than the road you lose is worth
            to you. That is the main concern: incentives to under-report, and with many {N.lens ? 'Anns' : 'Gretas'}, free-riding on the
            honest ones.
          </Lemma>
        </div>
      </div>
      <p className="aside">
        Note: in the other rooms each request is taken as sincere (residents state the quantity that maximises their own surplus given their tax price). This
        room is about what happens when they don’t.
      </p>
    </div>
  );
}

/* ================================================================== */

function ProvisionTab() {
  return (
    <div className="cols2">
      <div>
        <h3>Build it, or contract it out?</h3>
        <p>
          The council can pave the Milchstraße with its own crew or hire Paving Logic Ltd. Contracting out wins when costs matter most and the contract can
          pin down what is wanted. In-house production wins when:
        </p>
        <ul>
          <li>
            <b>what matters about the road cannot be written into a contract</b>: a contractor paid to save money will also save on the parts nobody can
            check;
          </li>
          <li>
            <b>the town wants everyone served alike</b>, whatever they could pay;
          </li>
          <li>
            <b>the council’s own crew is nearly as cheap</b>, and, with no profit to chase, it has less reason to skimp.
          </li>
        </ul>
        <p>
          When tastes differ a lot, markets do better: each farmer can buy a different amount. And a cheaper contractor is a reason to hire one, not a reason
          for the council to build itself.
        </p>
        <h3>Why public provision is hard</h3>
        <ol>
          <li>
            <b>Finding out what people want.</b> Residents gain by misreporting (previous room), and even honest wishes that pull in opposite directions
            do not add up to one answer.
          </li>
          <li>
            <b>Crowd-out.</b> Residents cut their own spending when the council builds, so a council-built path adds less than one path to the total, and
            the council’s money buys less than it seems to.
          </li>
          <li>
            <b>The council is not a benevolent planner.</b> Its members pursue goals of their own, and budgets and rules tie their hands.
          </li>
        </ol>
      </div>
      <div>
        <p className="aside small">
          Related: <LabLink to="evidence/crowdout">measuring crowd-out</LabLink> in §8.
        </p>
      </div>
    </div>
  );
}
