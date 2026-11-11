import { useMemo, useState } from 'react';
import { create } from 'zustand';
import { PageHead } from '../App';
import {
  EXAM_PVQ,
  Polluter,
  PvQ,
  abatementSupply,
  coase,
  costAbate,
  marketDWL,
  marketUnderTax,
  optimumConstantMD,
  permitMarket,
  pollutingMarket,
  pricesVsQuantities,
  smcAbate,
  smcKinks,
  taxOutcome,
  uniformStandard,
} from '../engine/externality';
import { useApp, useNames } from '../store';
import { Area, Curve, Dot, Drop, Label, Plot, Seg } from '../ui/plot';
import { Check, LabLink, Lemma, Predict, Readouts, Seg as SegCtl, Slider, Tabs, TeX, ViewTitle, f2, usePredicted } from '../ui/kit';

type Tab = 'market' | 'polluters' | 'regulator' | 'coase' | 'what';

export default function Externalities({ sub }: { sub: string }) {
  const tab = (['market', 'polluters', 'regulator', 'coase', 'what'].includes(sub) ? sub : 'polluters') as Tab;
  const go = (t: Tab) => (window.location.hash = '#/lake/' + t);
  return (
    <div>
      <PageHead num="6" title="Externalities: the lake" />
      <p className="lede">
        The farms’ manure runs into the lake; the Benz plant upstream adds its own contribution. Nobody pays for what reaches the water, so the price
        mechanism computes with the wrong costs. Five rooms:
      </p>
      <Tabs
        value={tab}
        onChange={go}
        tabs={[
          { v: 'market', label: 'Private vs social cost' },
          { v: 'polluters', label: 'Two polluters' },
          { v: 'regulator', label: 'The regulator is wrong' },
          { v: 'coase', label: 'Coase' },
          { v: 'what', label: 'What counts' },
        ]}
      />
      {tab === 'market' && <MarketTab />}
      {tab === 'polluters' && <PollutersTab />}
      {tab === 'regulator' && <RegulatorTab />}
      {tab === 'coase' && <CoaseTab />}
      {tab === 'what' && <WhatTab />}
    </div>
  );
}

/* ================================================================== */
/* 1. A polluting market                                               */
/* ================================================================== */

function MarketTab() {
  const [m, setM] = useState({ d0: 100, d1: 1, s0: 10, s1: 0.5, md0: 15, md1: 0.4 });
  const [tax, setTax] = useState(0);
  const [apart, setApart] = useState(false);
  const r = pollutingMarket(m);
  const q = marketUnderTax(m, tax);
  const dwl = marketDWL(m, q);
  const qMax = (m.d0 / m.d1) * 1.02;
  const pmc = (x: number) => m.s0 + m.s1 * x;
  const md = (x: number) => m.md0 + m.md1 * x;
  const smc = (x: number) => pmc(x) + md(x);
  const pmb = (x: number) => m.d0 - m.d1 * x;
  const tri: [number, number][] = [];
  const a = Math.min(q, r.qOpt);
  const b = Math.max(q, r.qOpt);
  for (let i = 0; i <= 40; i++) tri.push([a + ((b - a) * i) / 40, smc(a + ((b - a) * i) / 40)]);
  for (let i = 40; i >= 0; i--) tri.push([a + ((b - a) * i) / 40, pmb(a + ((b - a) * i) / 40)]);
  const yMax = Math.max(m.d0, smc(qMax * 0.8)) * 1.05;
  return (
    <div className="cols-wide">
      <div className="card">
        <ViewTitle zoom="The market for milk" name="manure is not on anyone's bill" />
        <Plot w={620} h={400} x={[0, qMax]} y={[0, yMax]} xLabel="milk Q" yLabel="€ per ton">
          {b - a > 1e-6 && <Area pts={tri} fill="var(--accent-soft)" />}
          <Curve fn={pmb} stroke="var(--ink)" width={1.5} />
          <Curve fn={pmc} stroke="var(--B)" width={1.5} />
          <Curve fn={smc} stroke="var(--accent)" width={1.5} onClick={() => setApart(!apart)} />
          {apart && <Curve fn={md} stroke="var(--accent)" width={0.8} dash="3 3" />}
          {apart && (
            <Label x={qMax * 0.75} y={md(qMax * 0.75)} dy={-5} color="var(--accent)" size={12}>
              MD (the lake's part)
            </Label>
          )}
          {apart &&
            [0.25, 0.5, 0.75].map((t) => (
              <g key={t}>
                <Seg a={[qMax * t * 0.8, 0]} b={[qMax * t * 0.8, pmc(qMax * t * 0.8)]} stroke="var(--B)" width={3} opacity={0.35} />
                <Seg a={[qMax * t * 0.8, pmc(qMax * t * 0.8)]} b={[qMax * t * 0.8, smc(qMax * t * 0.8)]} stroke="var(--accent)" width={3} opacity={0.35} />
              </g>
            ))}
          <Label x={qMax * 0.1} y={pmb(qMax * 0.1)} dy={-6} size={12}>
            PMB = SMB (demand)
          </Label>
          <Label x={qMax * 0.82} y={pmc(qMax * 0.82)} dy={14} color="var(--B)" size={12}>
            PMC (supply)
          </Label>
          <Label x={qMax * 0.45} y={smc(qMax * 0.45)} dx={4} dy={-6} color="var(--accent)" size={12}>
            SMC = PMC + MD {apart ? '' : '(click)'}
          </Label>
          <Drop x={r.qMarket} y={pmb(r.qMarket)} />
          <Drop x={r.qOpt} y={pmb(r.qOpt)} />
          <Dot x={r.qMarket} y={pmb(r.qMarket)} r={3.5} />
          <Dot x={r.qOpt} y={smc(r.qOpt)} r={3.5} fill="var(--accent)" />
          <Label x={r.qMarket} y={0} dx={3} dy={-4} size={12}>
            Q_market
          </Label>
          <Label x={r.qOpt} y={0} dx={3} dy={-18} size={12} color="var(--accent)">
            Q*
          </Label>
          {tax > 0 && <Curve fn={(x) => pmc(x) + tax} stroke="var(--B)" width={1} dash="5 3" />}
          {tax > 0 && <Dot x={q} y={pmb(q)} r={3.5} fill="var(--B)" />}
        </Plot>
      </div>
      <div>
        <div className="card">
          <h4>Parameters</h4>
          <Slider label="demand intercept" value={m.d0} min={60} max={140} step={1} onChange={(v) => setM({ ...m, d0: v })} />
          <Slider label="PMC slope" value={m.s1} min={0.1} max={2} onChange={(v) => setM({ ...m, s1: v })} />
          <Slider label="MD intercept" value={m.md0} min={0} max={50} step={1} onChange={(v) => setM({ ...m, md0: v })} />
          <Slider label="MD slope" value={m.md1} min={0} max={2} onChange={(v) => setM({ ...m, md1: v })} />
          <h4 style={{ marginTop: 12 }}>Policy</h4>
          <Slider label="tax per ton" value={tax} min={0} max={80} step={0.5} onChange={setTax} />
          <button onClick={() => setTax(Number(r.pigou.toFixed(2)))}>set the Pigouvian tax, MD(Q*)</button>
          <Readouts
            rows={[
              ['market quantity (no tax)', f2(r.qMarket)],
              ['social optimum Q*', f2(r.qOpt)],
              ['Pigouvian tax MD(Q*)', f2(r.pigou)],
              ['quantity under your tax', f2(q)],
              ['DWL', <b key="d">{f2(dwl)}</b>],
            ]}
          />
        </div>
        <Lemma tag="Lemma">
          The market equates PMB with PMC. The lake’s marginal damage is in nobody’s calculation, so every ton between <TeX>{'Q^*'}</TeX> and{' '}
          <TeX>{'Q_{market}'}</TeX> costs society more (SMC) than it is worth (SMB). The shaded triangle is that loss. A per-unit tax equal to{' '}
          <TeX>{'MD(Q^*)'}</TeX> puts the missing cost back on the bill and the market computes the right answer.
        </Lemma>
      </div>
    </div>
  );
}

/* ================================================================== */
/* 2. Two polluters                                                    */
/* ================================================================== */

type Instrument = 'none' | 'standard' | 'tax' | 'permits';

const usePoll = create<{
  cA: number;
  cB: number;
  E: number;
  MD: number;
  inst: Instrument;
  T: number;
  permitShareA: number;
  apart: boolean;
  set: (s: object) => void;
}>((set) => ({ cA: 2, cB: 6, E: 80, MD: 120, inst: 'permits', T: 120, permitShareA: 0.5, apart: false, set: (s) => set(s) }));

function PollutersTab() {
  const st = usePoll();
  const N = useNames();
  const nA = N.lens ? 'Firm A' : 'Hilltop Dairy';
  const nB = N.lens ? 'Firm B' : 'the Benz plant';
  const fs: Polluter[] = [
    { id: 'A', name: nA, emissions: st.E, a: 0, c: st.cA },
    { id: 'B', name: nB, emissions: st.E, a: 0, c: st.cB },
  ];
  const opt = optimumConstantMD(fs, st.MD);
  const each = opt.total / 2;
  const permitsTotal = 2 * st.E - opt.total;
  const permits = [permitsTotal * st.permitShareA, permitsTotal * (1 - st.permitShareA)];
  const pm = permitMarket(fs, permits);
  const outcomes = {
    none: { q: [0, 0], costs: { total: 0 }, mc: [0, 0], label: 'no policy' },
    standard: { ...uniformStandard(fs, each), label: `uniform standard: each abates ${f2(each)}` },
    tax: { ...taxOutcome(fs, st.T), label: `tax of ${f2(st.T)} per unit` },
    permits: { ...pm.withTrade, label: `${f2(permitsTotal)} tradable permits` },
  };
  const cur = outcomes[st.inst];
  const total = cur.q[0] + cur.q[1];
  const damageAvoided = st.MD * total;
  const net = damageAvoided - cur.costs.total;
  const best = st.MD * opt.total - opt.costs.total;
  const Pline = st.inst === 'tax' ? st.T : st.inst === 'permits' ? pm.price : st.inst === 'standard' ? null : null;
  const Qmax = 2 * st.E;
  const yMax = Math.max(st.MD * 1.6, st.cB * st.E * 0.7);
  const kinks = smcKinks(fs);

  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        Two polluters each emit {st.E}. Abating <TeX>Q</TeX> units costs {nA} <TeX>{`MC_A = ${st.cA}Q_A`}</TeX> and {nB} <TeX>{`MC_B = ${st.cB}Q_B`}</TeX> at the
        margin. Each unit abated spares the lake <TeX>{`MD = ${st.MD}`}</TeX>.
      </p>
      <div className="controls">
        <SegCtl
          value={st.inst}
          options={[
            { v: 'none', label: 'do nothing' },
            { v: 'standard', label: 'uniform standard' },
            { v: 'tax', label: 'tax' },
            { v: 'permits', label: 'tradable permits' },
          ]}
          onChange={(v) => st.set({ inst: v })}
        />
        {st.inst === 'tax' && <Slider label="tax T" value={st.T} min={0} max={400} step={1} onChange={(v) => st.set({ T: v })} />}
        {st.inst === 'permits' && (
          <Slider label={`share of permits to ${N.lens ? 'A' : 'the dairy'}`} value={st.permitShareA} min={0} max={1} step={0.01} onChange={(v) => st.set({ permitShareA: v })} />
        )}
        <button className="ghost" onClick={() => st.set({ cA: 2, cB: 6, E: 80, MD: 120, T: 120, permitShareA: 0.5 })}>
          default numbers
        </button>
      </div>
      <div className="cols2">
        <div className="card">
          <ViewTitle zoom="The individuals" name="each firm's marginal cost of abatement" />
          <Plot w={480} h={340} x={[0, st.E * 1.05]} y={[0, yMax]} xLabel="abatement Q_i" yLabel="$ per unit">
            <Curve fn={(q) => (q <= st.E ? st.cA * q : NaN)} stroke="var(--A)" width={1.5} />
            <Curve fn={(q) => (q <= st.E ? st.cB * q : NaN)} stroke="var(--B)" width={1.5} />
            <Label x={st.E * 0.85} y={st.cA * st.E * 0.85} dx={-4} dy={14} anchor="end" color="var(--A)" size={12}>
              MC_A = {st.cA}Q
            </Label>
            <Label x={(yMax * 0.85) / st.cB} y={yMax * 0.85} dx={6} color="var(--B)" size={12}>
              MC_B = {st.cB}Q
            </Label>
            <Seg a={[0, st.MD]} b={[st.E * 1.05, st.MD]} stroke="var(--accent)" dash="5 3" />
            <Label x={st.E * 1.0} y={st.MD} dy={-5} anchor="end" color="var(--accent)" size={12}>
              MD = {st.MD}
            </Label>
            {Pline !== null && Pline !== st.MD && <Seg a={[0, Pline]} b={[st.E * 1.05, Pline]} stroke="var(--ink-3)" dash="2 3" />}
            {[0, 1].map((i) => (
              <g key={i}>
                <Drop x={cur.q[i]} y={fs[i].c * cur.q[i]} />
                <Dot x={cur.q[i]} y={fs[i].c * cur.q[i]} r={4.5} fill={i === 0 ? 'var(--A)' : 'var(--B)'} />
              </g>
            ))}
          </Plot>
          <Readouts
            rows={[
              [nA, `abates ${f2(cur.q[0])}, MC = ${f2(cur.mc[0])}, cost ${f2(costAbate(fs[0], cur.q[0]), 0)}`],
              [nB, `abates ${f2(cur.q[1])}, MC = ${f2(cur.mc[1])}, cost ${f2(costAbate(fs[1], cur.q[1]), 0)}`],
            ]}
          />
        </div>
        <div className="card">
          <ViewTitle zoom="Society" name={st.apart ? 'SMC taken apart' : 'aggregate SMC (click it)'} />
          <Plot w={480} h={340} x={[0, Qmax * 1.02]} y={[0, yMax]} xLabel="total abatement Q_T" yLabel="$ per unit">
            {st.apart && <Curve fn={(q) => (q <= st.E ? st.cA * q : NaN)} stroke="var(--A)" width={0.8} dash="3 3" />}
            {st.apart && <Curve fn={(q) => (q <= st.E ? st.cB * q : NaN)} stroke="var(--B)" width={0.8} dash="3 3" />}
            {st.apart &&
              [0.3, 0.6, 0.9].map((t) => {
                const P = yMax * t;
                const s = abatementSupply(fs, P);
                return (
                  <g key={t}>
                    <Seg a={[0, P]} b={[s.parts[0].value, P]} stroke="var(--A)" width={3} opacity={0.4} />
                    <Seg a={[s.parts[0].value, P]} b={[s.total, P]} stroke="var(--B)" width={3} opacity={0.4} />
                  </g>
                );
              })}
            <Curve
              pts={[[0, 0], ...kinks.map((k) => [k.Q, k.P] as [number, number]), [Qmax, yMax * 2]]}
              stroke="var(--ink)"
              width={1.6}
              onClick={() => st.set({ apart: !st.apart })}
            />
            <Seg a={[0, st.MD]} b={[Qmax, st.MD]} stroke="var(--accent)" />
            <Label x={Qmax * 0.98} y={st.MD} dy={-5} anchor="end" color="var(--accent)" size={12}>
              SMB = MD
            </Label>
            <Label x={opt.total * 0.55} y={smcAbate(fs, opt.total * 0.55)} dx={-6} dy={-6} anchor="end" size={12}>
              SMC = horizontal Σ MC_i
            </Label>
            <Drop x={opt.total} y={st.MD} />
            <Dot x={opt.total} y={st.MD} r={4} fill="var(--accent)" />
            <Dot x={total} y={smcAbate(fs, total) || 0} r={4} fill="var(--ink)" hollow />
          </Plot>
          <Check checked={st.apart} onChange={(v) => st.set({ apart: v })}>
            show the firms the SMC is built from (at each price, Q_T = Q_A + Q_B)
          </Check>
          <div className="small muted">
            Kinks at <TeX>{`P = ${kinks.map((k) => f2(k.P)).filter((v) => v !== '0').join(', ')}`}</TeX> where a firm runs out of pollution to abate.
          </div>
        </div>
      </div>

      <div className="cols2" style={{ marginTop: 16 }}>
        <div>
          <h4>All four, side by side</h4>
          <table className="tbl">
            <thead>
              <tr>
                <th>instrument</th>
                <th>Q_A</th>
                <th>Q_B</th>
                <th>MC_A</th>
                <th>MC_B</th>
                <th>total Q</th>
                <th>abatement cost</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(outcomes) as Instrument[]).map((k) => {
                const o = outcomes[k];
                return (
                  <tr key={k} className={k === st.inst ? 'best' : ''}>
                    <td className="txt">{o.label}</td>
                    <td>{f2(o.q[0])}</td>
                    <td>{f2(o.q[1])}</td>
                    <td>{f2(o.mc[0])}</td>
                    <td>{f2(o.mc[1])}</td>
                    <td>{f2(o.q[0] + o.q[1])}</td>
                    <td>{f2(o.costs.total, 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Readouts
            rows={[
              ['social optimum', `Q_A = ${f2(opt.q[0])}, Q_B = ${f2(opt.q[1])}, cost ${f2(opt.costs.total, 0)}`],
              ['net benefit here', `${f2(net, 0)} (best possible ${f2(best, 0)})`],
            ]}
          />
        </div>
        <div>
          {st.inst === 'permits' && (
            <div className="card">
              <h4>The permit market</h4>
              <p className="small" style={{ marginTop: 0 }}>
                Cap: {f2(permitsTotal)} permits ({f2(permits[0])} to {nA}, {f2(permits[1])} to {nB}). Without trade each must abate its emissions minus its
                permits.
              </p>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>firm</th>
                    <th>given</th>
                    <th>needs</th>
                    <th>trade</th>
                  </tr>
                </thead>
                <tbody>
                  {pm.trades.map((t, i) => (
                    <tr key={t.id}>
                      <td className="txt">{t.name}</td>
                      <td>{f2(permits[i])}</td>
                      <td>{f2(t.holds)}</td>
                      <td className="txt">
                        {t.role} {Math.abs(t.net) > 1e-9 ? f2(Math.abs(t.net)) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Readouts
                rows={[
                  ['permit price', <b key="p">{f2(pm.price)}</b>],
                  ['abatement cost without trade', f2(pm.noTrade.costs.total, 0)],
                  ['abatement cost with trade', f2(pm.withTrade.costs.total, 0)],
                ]}
              />
              <p className="small">
                The cheap abater sells: each permit it sells costs it the MC of one more unit abated, and the buyer saves its own higher MC. Trade
                continues until both MCs equal the price. Whatever the initial split, the outcome is the same; only who pays whom changes.
              </p>
            </div>
          )}
          {st.inst === 'standard' && (
            <Lemma tag="Lemma">
              The standard gets the total right but not the split: at the standard, <TeX>{'MC_A \\ne MC_B'}</TeX>. Moving one unit of abatement from the
              high-cost firm to the low-cost firm keeps pollution unchanged and lowers total cost by <TeX>{'MC_B - MC_A'}</TeX>.
            </Lemma>
          )}
          {st.inst === 'tax' && (
            <Lemma tag="Lemma">
              Facing a price per unit of pollution, each firm abates until its own MC equals the tax. Every firm then has the same MC, which is the
              cost-minimising split of whatever total results. With <TeX>{`T = MD = ${st.MD}`}</TeX> the total is also right.
            </Lemma>
          )}
          {st.inst === 'none' && (
            <Lemma tag="Lemma">
              With no policy the firms’ marginal benefit of abatement is zero, so each sets <TeX>{'MC = MB = 0'}</TeX>: no abatement at all.
            </Lemma>
          )}
        </div>
      </div>
      <Predict
        id="poll-permits-split"
        question="Give all the permits to the Benz plant instead of splitting them evenly. What changes?"
        options={['the abatement split and the permit price', 'only who pays whom', 'nothing at all']}
        answer={1}
        explain={<>The price and the abatement by each firm stay put (try the slider). Only the direction and size of the permit trade change: an initial allocation is a transfer, not an efficiency choice.</>}
      />
    </div>
  );
}

/* ================================================================== */
/* 3. Prices vs quantities                                             */
/* ================================================================== */

function RegulatorTab() {
  const [s, setS] = useState<PvQ>(EXAM_PVQ);
  const [peek, setPeek] = useState(false);
  const shown = usePredicted('pvq-exam') || peek;
  const r = pricesVsQuantities(s);
  const qMax = Math.max(r.qStar, r.qPerceived, r.qTax) * 1.5 + 10;
  const yMax = Math.max(s.b0 + Math.max(0, s.db), r.smc(qMax)) * 1.05;
  const tri = (q: number): [number, number][] => {
    const a = Math.min(q, r.qStar);
    const b = Math.max(q, r.qStar);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 30; i++) pts.push([a + ((b - a) * i) / 30, r.smb(a + ((b - a) * i) / 30)]);
    for (let i = 30; i >= 0; i--) pts.push([a + ((b - a) * i) / 30, r.smc(a + ((b - a) * i) / 30)]);
    return pts;
  };
  const numer = s.m * s.db + s.n * s.dc;
  const better = r.dwlTax < r.dwlQuantity - 1e-9 ? 'tax' : r.dwlQuantity < r.dwlTax - 1e-9 ? 'quantity' : 'tie';
  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        Ignore firm heterogeneity. True <TeX>{`SMC = ${f2(s.c0)} + ${f2(s.m, 3)}Q_T`}</TeX>, true <TeX>{`SMB = ${f2(s.b0)} - ${f2(s.n, 3)}Q_T`}</TeX>. The
        regulator sees both curves shifted: it overestimates cost by <TeX>{`\\delta_c = ${f2(s.dc)}`}</TeX> and misjudges benefit by{' '}
        <TeX>{`\\delta_b = ${f2(s.db)}`}</TeX>. It then either fixes the quantity at its perceived optimum or sets a tax equal to the perceived MD there;
        firms respond to a tax with their <i>true</i> costs.
      </p>
      <div className="cols-wide">
        <div className="card">
          <Plot w={620} h={420} x={[0, qMax]} y={[0, yMax]} xLabel="pollution reduction Q_T" yLabel="$">
            {shown && <Area pts={tri(r.qPerceived)} fill="rgba(93,109,132,0.22)" />}
            {shown && <Area pts={tri(r.qTax)} fill="var(--accent-soft)" />}
            <Curve fn={r.smc} stroke="var(--ink)" width={1.6} />
            <Curve fn={r.smb} stroke="var(--ink)" width={1.6} />
            <Curve fn={r.smcPerceived} stroke="var(--B)" width={1.2} dash="6 4" />
            <Curve fn={r.smbPerceived} stroke="var(--B)" width={1.2} dash="6 4" />
            <Label x={qMax * 0.86} y={r.smc(qMax * 0.86)} dx={6} size={12}>
              SMC (true)
            </Label>
            <Label x={qMax * 0.6} y={r.smcPerceived(qMax * 0.6)} dx={-6} anchor="end" color="var(--B)" size={12}>
              SMC perceived
            </Label>
            <Label x={qMax * 0.9} y={r.smb(qMax * 0.9)} dy={-6} anchor="end" size={12}>
              SMB (true)
            </Label>
            <Label x={qMax * 0.9} y={r.smbPerceived(qMax * 0.9)} dy={14} anchor="end" color="var(--B)" size={12}>
              SMB perceived
            </Label>
            <Seg a={[0, r.tax]} b={[qMax, r.tax]} stroke="var(--accent)" width={1} dash="2 3" />
            <Label x={2} y={r.tax} dy={-5} color="var(--accent)" size={12}>
              tax = perceived MD(Q^c) = {f2(r.tax)}
            </Label>
            <Drop x={r.qStar} y={r.pStar} />
            <Drop x={r.qPerceived} y={r.smcPerceived(r.qPerceived)} toY={false} />
            <Dot x={r.qStar} y={r.pStar} r={4} />
            <Dot x={r.qPerceived} y={r.smcPerceived(r.qPerceived)} r={4} fill="var(--B)" />
            {shown && <Dot x={r.qTax} y={r.tax} r={4} fill="var(--accent)" />}
            <Label x={r.qStar} y={0} dx={3} dy={-4} size={12}>
              Q* = {f2(r.qStar)}
            </Label>
            <Label x={r.qPerceived} y={0} dx={3} dy={-18} color="var(--B)" size={12}>
              Q^c = {f2(r.qPerceived)}
            </Label>
            {shown && (
              <Label x={r.qTax} y={r.tax} dx={6} dy={14} color="var(--accent)" size={12}>
                firms under the tax: {f2(r.qTax)}
              </Label>
            )}
          </Plot>
          <div className="small muted">Grey-blue triangle: DWL of the quantity rule. Red: DWL of the tax.</div>
        </div>
        <div>
          <div className="card">
            <Slider label="cost error δc" value={s.dc} min={-80} max={80} step={1} onChange={(v) => setS({ ...s, dc: v })} />
            <Slider label="benefit error δb" value={s.db} min={-80} max={80} step={1} onChange={(v) => setS({ ...s, db: v })} />
            <Slider label="SMC slope m" value={s.m} min={0.1} max={4} step={0.01} onChange={(v) => setS({ ...s, m: v })} />
            <Slider label="|SMB slope| n" value={s.n} min={0.05} max={4} step={0.01} onChange={(v) => setS({ ...s, n: v })} />
            <div className="controls">
              <button onClick={() => setS(EXAM_PVQ)}>default numbers</button>
              <button onClick={() => setS({ ...EXAM_PVQ, db: 0 })}>only the cost error</button>
              <button onClick={() => setS({ ...EXAM_PVQ, dc: 0 })}>only the benefit error</button>
            </div>
            <Readouts
              rows={[
                ['true optimum Q*', f2(r.qStar)],
                ['perceived optimum Q^c', f2(r.qPerceived)],
                ['tax T', f2(r.tax)],
                ['firms’ response to T', shown ? f2(r.qTax) : '—'],
                ['DWL, quantity rule', shown ? <b key="q">{f2(r.dwlQuantity)}</b> : '—'],
                ['DWL, tax', shown ? <b key="t">{f2(r.dwlTax)}</b> : '—'],
                ['better instrument', shown ? better : '—'],
              ]}
            />
            {!shown && (
              <div className="small muted">
                The triangles and the firms’ response appear once you have predicted below, or{' '}
                <a href="#" onClick={(e) => { e.preventDefault(); setPeek(true); }}>
                  show them now
                </a>
                .
              </div>
            )}
          </div>
          <Lemma tag="Lemma">
            <TeX>{'Q^c - Q^* = \\dfrac{\\delta_b - \\delta_c}{m+n}'}</TeX>, and the firms’ response to the tax misses by{' '}
            <TeX>{'Q^{tax} - Q^* = \\dfrac{m\\,\\delta_b + n\\,\\delta_c}{m(m+n)}'}</TeX>. Each instrument’s DWL is{' '}
            <TeX>{'\\tfrac12 (m+n)(\\text{miss})^2'}</TeX>.
          </Lemma>
          {shown && <Lemma tag="Corollary (a coincidence)" quiet>
            With the default numbers the numerator is <TeX>{`m\\delta_b + n\\delta_c = \\tfrac32(-20) + 1(30) = 0`}</TeX>: the tax lands exactly on the true optimum.
            Here it is <TeX>{`${f2(numer, 2)}`}</TeX>. Move any slider and the miracle is gone.
          </Lemma>}
          <Lemma tag="Weitzman" quiet>
            If only costs are misjudged (<TeX>{'\\delta_b = 0'}</TeX>), the tax wins exactly when <TeX>{'n < m'}</TeX>, i.e. when the SMB curve is flatter
            than the SMC curve. When MD rises steeply, getting the quantity right is worth more: quantity regulation is preferred.
          </Lemma>
        </div>
      </div>
      <Predict
        id="pvq-exam"
        question="With the default numbers, which instrument has the larger deadweight loss?"
        options={['the quantity rule', 'the tax', 'they tie']}
        answer={0}
        explain={
          <>
            Quantity at <TeX>{'Q^c = 60'}</TeX> loses <TeX>{'\\tfrac12 \\cdot 20 \\cdot 50 = 500'}</TeX>. The tax <TeX>{'T = 120'}</TeX> happens to equal the true
            MD at <TeX>{'Q^* = 80'}</TeX>, so firms land on the optimum and DWL is 0. Now set the benefit error to 0 and look again.
          </>
        }
      />
    </div>
  );
}

/* ================================================================== */
/* 4. Coase                                                            */
/* ================================================================== */

function CoaseTab() {
  const [s, setS] = useState({ a: 100, b: 1, d: 1, parties: 1, tcPerParty: 0, power: 0.5, holdout: 0 });
  const [right, setRight] = useState<'dairy' | 'lake'>('dairy');
  const r = coase(s, right);
  const other = coase(s, right === 'dairy' ? 'lake' : 'dairy');
  const qMax = (s.a / s.b) * 1.05;
  const yMax = Math.max(s.a, s.d * qMax) * 1.05;
  const N = useNames();
  return (
    <div>
      <p className="small" style={{ marginTop: 0 }}>
        {N.lens ? 'The polluter gains from polluting' : 'Lakeside Dairy gains from spreading manure'}: marginal benefit <TeX>{`MB = ${s.a} - ${s.b}Q`}</TeX>.{' '}
        {N.lens ? 'The victims bear' : 'The anglers and swimmers on the lake bear'}{' '}
        <TeX>{`MD = ${s.d}Q`}</TeX> in total, shared equally among {s.parties} {s.parties === 1 ? 'party' : 'parties'}. Toggle who holds the right to the
        lake.
      </p>
      <div className="controls">
        <SegCtl
          value={right}
          options={[
            { v: 'dairy', label: 'the dairy may pollute' },
            { v: 'lake', label: 'the lake users may forbid it' },
          ]}
          onChange={setRight}
        />
        <Slider label="lake users" value={s.parties} min={1} max={60} step={1} onChange={(v) => setS({ ...s, parties: v })} fmt={(v) => String(v)} />
        <Slider label="transaction cost per party" value={s.tcPerParty} min={0} max={2000} step={10} onChange={(v) => setS({ ...s, tcPerParty: v })} />
        <Slider label="hold-out demand (share of surplus)" value={s.holdout} min={0} max={0.5} step={0.01} onChange={(v) => setS({ ...s, holdout: v })} />
      </div>
      <div className="cols-wide">
        <div className="card">
          <Plot w={600} h={360} x={[0, qMax]} y={[0, yMax]} xLabel="manure Q" yLabel="€">
            <Curve fn={(q) => s.a - s.b * q} stroke="var(--A)" width={1.5} />
            <Curve fn={(q) => s.d * q} stroke="var(--B)" width={1.5} />
            {s.parties > 1 && <Curve fn={(q) => (s.d * q) / s.parties} stroke="var(--B)" width={0.8} dash="3 3" />}
            <Label x={qMax * 0.12} y={s.a - s.b * qMax * 0.12} dy={-6} color="var(--A)" size={12}>
              MB of the dairy
            </Label>
            <Label x={qMax * 0.78} y={s.d * qMax * 0.78} dx={-6} anchor="end" color="var(--B)" size={12}>
              MD to all lake users
            </Label>
            {s.parties > 1 && (
              <Label x={qMax * 0.9} y={(s.d * qMax * 0.9) / s.parties} dy={-6} anchor="end" color="var(--B)" size={12}>
                one user’s share
              </Label>
            )}
            <Drop x={r.qStar} y={s.d * r.qStar} />
            <Dot x={r.qStar} y={s.d * r.qStar} r={4} fill="var(--accent)" />
            <Label x={r.qStar} y={0} dx={3} dy={-4} color="var(--accent)" size={12}>
              Q*
            </Label>
            <Seg a={[right === 'dairy' ? r.qPrivate : 0, yMax * 0.06]} b={[r.q, yMax * 0.06]} stroke="var(--ink)" width={1.4} arrow />
            <Dot x={r.q} y={yMax * 0.06} r={4.5} />
            <Label x={r.q} y={yMax * 0.06} dy={-8} anchor="middle" size={12}>
              outcome
            </Label>
          </Plot>
          <div className="small muted">The arrow runs from the right-holder’s starting point to where bargaining leaves it.</div>
        </div>
        <div>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>
                  <th />
                  <th>{right === 'dairy' ? 'dairy holds' : 'lake holds'}</th>
                  <th>{right === 'dairy' ? 'lake holds' : 'dairy holds'}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>manure Q</td>
                  <td>{f2(r.q)}</td>
                  <td>{f2(other.q)}</td>
                </tr>
                <tr>
                  <td>efficient?</td>
                  <td>{r.efficient ? 'yes' : 'no'}</td>
                  <td>{other.efficient ? 'yes' : 'no'}</td>
                </tr>
                <tr>
                  <td>payment to holder</td>
                  <td>{f2(r.payment, 0)}</td>
                  <td>{f2(other.payment, 0)}</td>
                </tr>
                <tr>
                  <td>dairy ends with</td>
                  <td>{f2(r.dairy, 0)}</td>
                  <td>{f2(other.dairy, 0)}</td>
                </tr>
                <tr>
                  <td>lake users end with</td>
                  <td>{f2(r.lake, 0)}</td>
                  <td>{f2(other.lake, 0)}</td>
                </tr>
                <tr>
                  <td>DWL</td>
                  <td>{f2(r.dwl, 0)}</td>
                  <td>{f2(other.dwl, 0)}</td>
                </tr>
              </tbody>
            </table>
            <p className="small">{r.reason}</p>
          </div>
          <Lemma tag="Coase">
            With well-defined property rights and costless bargaining, the parties reach <TeX>{'Q^*'}</TeX> whoever holds the right. The assignment decides
            only who pays whom.
          </Lemma>
          <Lemma tag="…and why it fails" quiet>
            Raise the transaction cost, or the number of lake users. With many users and the right on the dairy’s side, the cut-back is a public good among
            them and each pays only for its own share (free-riding). With the right on their side, every one of them can veto (hold-outs). Assignment also
            needs someone to know who is harmed, and by how much.
          </Lemma>
        </div>
      </div>
      <p className="small">
        Related: <LabLink to="road">§7 free-riding</LabLink>.
      </p>
    </div>
  );
}

/* ================================================================== */
/* 5. What counts                                                      */
/* ================================================================== */

const CASES: { text: string; ext: 'pos' | 'neg' | 'none'; why: string }[] = [
  {
    text: 'The Benz plant’s exhaust settles on Agnes’s pasture and lowers her milk yield.',
    ext: 'neg',
    why: 'An effect on someone else’s production that nobody pays for. Negative externality.',
  },
  {
    text: 'A new dairy opens; the milk price falls and Bruno’s profit drops.',
    ext: 'none',
    why: 'The effect runs through the price. Bruno loses what the buyers gain; nothing is uncompensated in the sense that matters. A pecuniary effect, not an externality.',
  },
  {
    text: 'Hilltop Dairy invents a better milking routine; neighbours copy it for free.',
    ext: 'pos',
    why: 'A benefit to others that they do not pay for. Positive externality (knowledge spillover).',
  },
  {
    text: 'Hilltop’s innovation also steals customers from Lakeside Dairy.',
    ext: 'none',
    why: 'Again through prices and market shares: competition, not an externality.',
  },
  {
    text: 'Clara vaccinates her herd; the neighbouring herds are less likely to catch the disease.',
    ext: 'pos',
    why: 'Protection others receive without paying. Positive externality.',
  },
  {
    text: 'Dmitri pays the anglers’ club for each ton of manure he spreads, at the damage it causes.',
    ext: 'none',
    why: 'The damage is compensated: the effect has been internalised. No externality remains.',
  },
  {
    text: 'Edda practises the tuba at 2 a.m. in the shared farmhouse.',
    ext: 'neg',
    why: 'An uncompensated cost imposed on others. Negative externality.',
  },
];

function WhatTab() {
  const [picks, setPicks] = useState<Record<number, string>>({});
  return (
    <div className="cols-wide">
      <div>
        <Lemma tag="Definition">
          An externality is an effect of one party’s action on another party’s welfare (or production) that is <b>not paid for</b> or{' '}
          <b>not compensated</b>. Two things are needed: an effect on others, <i>and</i> the absence of payment. Effects that work through prices, such as
          a competitor’s lost profit, do not count: they are how the market transmits information, and the loser’s loss is someone else’s gain.
        </Lemma>
        {CASES.map((c, i) => (
          <div key={i} className="mcq">
            <div className="stem">{c.text}</div>
            <div className="controls">
              {(['neg', 'pos', 'none'] as const).map((k) => (
                <button
                  key={k}
                  className={picks[i] ? (k === c.ext ? 'primary' : '') : ''}
                  disabled={!!picks[i]}
                  onClick={() => setPicks({ ...picks, [i]: k })}
                  style={picks[i] === k && k !== c.ext ? { textDecoration: 'line-through' } : undefined}
                >
                  {k === 'neg' ? 'negative externality' : k === 'pos' ? 'positive externality' : 'not an externality'}
                </button>
              ))}
            </div>
            {picks[i] && <div className="small fadein">{c.why}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
