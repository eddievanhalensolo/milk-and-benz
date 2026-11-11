import { useMemo, useState } from 'react';
import { PageHead } from '../App';
import {
  DEFAULT_PRODUCTION as E,
  ProdState,
  competitive,
  conditions,
  contractKM,
  efficientShare,
  industryTFP,
  outputs,
  ppf,
} from '../engine/production';
import { useNames } from '../store';
import { Curve, Dot, Handle, Label, Plot, Seg } from '../ui/plot';
import { Lemma, Readouts, Slider, TeX, ViewTitle, f2 } from '../ui/kit';

const START: ProdState = { LM: 30, KM: 60, sLM: 0.7, sKM: 0.4, sLB: 0.3, sKB: 0.6, xA: 0.5, yA: 0.3 };

function Status({ ok }: { ok: boolean }) {
  return <span className={'pill ' + (ok ? 'yes' : 'no')}>{ok ? 'holds' : 'fails'}</span>;
}

export default function Production() {
  const N = useNames();
  const [s, setS] = useState<ProdState>(START);
  const [theta, setTheta] = useState(0.5);
  const fn = N.lens ? ['X firm 1', 'X firm 2', 'Y firm 1', 'Y firm 2'] : ['Hilltop', 'Lakeside', 'Plant Nord', 'Plant Süd'];
  const c = conditions(E, s);
  const out = outputs(E, s);
  const frontier = useMemo(() => ppf(E), []);
  const ccProd = useMemo(() => Array.from({ length: 101 }, (_, i) => [(E.L * i) / 100, contractKM(E, (E.L * i) / 100)] as [number, number]), []);
  const tol = 1e-3;
  const okWithin = c.gaps.withinMilk < tol && c.gaps.withinBenz < tol;
  const okMRTS = c.gaps.mrts < tol;
  const okMRS = c.gaps.mrs < tol;
  const okTop = c.gaps.mrsMrt < tol && okWithin && okMRTS;

  // isoquants (industry level, efficient split assumed for drawing)
  const tM = industryTFP(E.milk);
  const tB = industryTFP(E.benz);
  const qM = tM * Math.pow(s.LM, E.milk.alpha) * Math.pow(s.KM, E.milk.beta);
  const qB = tB * Math.pow(E.L - s.LM, E.benz.alpha) * Math.pow(E.K - s.KM, E.benz.beta);
  const isoM = (L: number) => Math.pow(qM / (tM * Math.pow(L, E.milk.alpha)), 1 / E.milk.beta);
  const isoB = (L: number) => E.K - Math.pow(qB / (tB * Math.pow(E.L - L, E.benz.alpha)), 1 / E.benz.beta);

  const milkMax = frontier.reduce((m, p) => Math.max(m, p.milk), 0) * 1.05;
  const benzMax = frontier.reduce((m, p) => Math.max(m, p.benz), 0) * 1.05;
  const [cA, cB] = E.consumers;
  const xA = s.xA * out.milk;
  const yA = s.yA * out.benz;
  const uAlev = Math.pow(xA, cA.a) * Math.pow(yA, 1 - cA.a);
  const uBlev = Math.pow(out.milk - xA, cB.a) * Math.pow(out.benz - yA, 1 - cB.a);
  const icA = (x: number) => Math.pow(uAlev / Math.pow(x, cA.a), 1 / (1 - cA.a));
  const icB = (x: number) => out.benz - Math.pow(uBlev / Math.pow(out.milk - x, cB.a), 1 / (1 - cB.a));
  const ccCons = useMemo(() => {
    // consumption contract curve in the current box: MRS_A = MRS_B
    const pts: [number, number][] = [];
    for (let i = 1; i < 100; i++) {
      const x = (out.milk * i) / 100;
      // (a/(1-a)) y/x = (b/(1-b)) (Y-y)/(X-x)  →  solve for y
      const ka = cA.a / (1 - cA.a) / x;
      const kb = cB.a / (1 - cB.a) / (out.milk - x);
      pts.push([x, (kb * out.benz) / (ka + kb)]);
    }
    return pts;
  }, [out.milk, out.benz]);

  const fixWithin = () => setS({ ...s, sLM: efficientShare(E.milk), sKM: efficientShare(E.milk), sLB: efficientShare(E.benz), sKB: efficientShare(E.benz) });
  const fixMRTS = () => setS({ ...s, KM: contractKM(E, s.LM) });
  const fixMRS = () => {
    // move along the consumption contract curve keeping A's milk share
    const x = xA;
    const ka = cA.a / (1 - cA.a) / x;
    const kb = cB.a / (1 - cB.a) / (out.milk - x);
    setS({ ...s, yA: (kb * out.benz) / (ka + kb) / out.benz });
  };
  const market = () => setS(competitive(E, theta));

  return (
    <div>
      <PageHead num="5" title="Production" />
      <p className="lede">
        {N.lens
          ? `The economy has ${E.L} units of labour and ${E.K} of capital. Two firms produce X, two produce Y; each firm has decreasing returns, `
          : `The guild owns ${E.L} units of labour (logicians) and ${E.K} of capital. Two dairies make milk, two plants make Benz; each firm has decreasing returns, `}
        so how an industry divides its inputs between its firms matters. Then two consumers share the output. Three conditions, one state.
      </p>
      <div className="cols3">
        <div className="card">
          <ViewTitle zoom="Inputs" name="the production box" />
          <Plot w={360} h={330} x={[0, E.L]} y={[0, E.K]} xLabel="labour to milk →" yLabel="capital to milk" onBackgroundDrag={(L, K) => setS({ ...s, LM: Math.max(1, Math.min(E.L - 1, L)), KM: Math.max(1, Math.min(E.K - 1, K)) })}>
            <Curve pts={ccProd} stroke="var(--accent)" width={2} opacity={0.55} />
            <Curve fn={isoM} from={1} to={E.L - 0.5} stroke="var(--A)" width={1.3} />
            <Curve fn={isoB} from={0.5} to={E.L - 1} stroke="var(--B)" width={1.3} />
            <Label x={E.L * 0.7} y={contractKM(E, E.L * 0.7)} dx={6} dy={14} color="var(--accent)" size={12}>
              MRTS equal
            </Label>
            <Handle x={s.LM} y={s.KM} onDrag={(L, K) => setS({ ...s, LM: Math.max(1, Math.min(E.L - 1, L)), KM: Math.max(1, Math.min(E.K - 1, K)) })} />
          </Plot>
          <div className="small muted">Milk’s origin bottom-left, Benz’s top-right. Isoquants through the point.</div>
          <Slider label={`${fn[0]}’s share of ${N.x} labour`} value={s.sLM} min={0.02} max={0.98} onChange={(v) => setS({ ...s, sLM: v })} />
          <Slider label={`${fn[0]}’s share of ${N.x} capital`} value={s.sKM} min={0.02} max={0.98} onChange={(v) => setS({ ...s, sKM: v })} />
          <Slider label={`${fn[2]}’s share of ${N.y} labour`} value={s.sLB} min={0.02} max={0.98} onChange={(v) => setS({ ...s, sLB: v })} />
          <Slider label={`${fn[2]}’s share of ${N.y} capital`} value={s.sKB} min={0.02} max={0.98} onChange={(v) => setS({ ...s, sKB: v })} />
        </div>
        <div className="card">
          <ViewTitle zoom="Output" name="the production possibility frontier" />
          <Plot w={420} h={340} x={[0, milkMax]} y={[0, benzMax]} xLabel={N.x} yLabel={N.y}>
            <Curve pts={frontier.map((p) => [p.milk, p.benz])} stroke="var(--ink)" width={1.6} />
            <Label x={frontier[110].milk} y={frontier[110].benz} dx={5} dy={-5} size={12}>
              PPF
            </Label>
            {okWithin && okMRTS && (
              <>
                <Curve fn={(m) => out.benz - c.mrt.viaL * (m - out.milk)} from={out.milk - milkMax * 0.25} to={out.milk + milkMax * 0.25} stroke="var(--accent)" width={1.1} />
                <Label x={out.milk + milkMax * 0.2} y={out.benz - c.mrt.viaL * milkMax * 0.2} dx={4} color="var(--accent)" size={12}>
                  slope −MRT
                </Label>
              </>
            )}
            <Curve fn={(m) => out.benz - c.mrsA * (m - out.milk)} from={out.milk - milkMax * 0.18} to={out.milk + milkMax * 0.18} stroke="var(--A)" width={0.9} dash="4 3" />
            <Dot x={out.milk} y={out.benz} r={5} fill={okWithin && okMRTS ? 'var(--accent)' : 'var(--ink-3)'} />
          </Plot>
          <div className="small muted">
            Dot: what the guild produces. It is on the PPF only if inputs are efficiently used. Dashed: consumer A’s MRS line.
          </div>
          <Slider label="A’s share of everything, θ" value={theta} min={0.05} max={0.95} onChange={setTheta} />
          <button className="primary" onClick={market}>
            let the markets run
          </button>
        </div>
        <div className="card">
          <ViewTitle zoom="Consumers" name="the consumption box" />
          <Plot
            w={360}
            h={330}
            x={[0, out.milk]}
            y={[0, out.benz]}
            xLabel={`${N.x} to A`}
            yLabel={`${N.y} to A`}
            onBackgroundDrag={(x, y) => setS({ ...s, xA: Math.max(0.01, Math.min(0.99, x / out.milk)), yA: Math.max(0.01, Math.min(0.99, y / out.benz)) })}
          >
            <Curve pts={ccCons} stroke="var(--accent)" width={2} opacity={0.55} />
            <Curve fn={icA} from={out.milk * 0.02} to={out.milk} stroke="var(--A)" width={1.3} />
            <Curve fn={icB} from={0} to={out.milk * 0.98} stroke="var(--B)" width={1.3} />
            <Handle x={xA} y={yA} onDrag={(x, y) => setS({ ...s, xA: Math.max(0.01, Math.min(0.99, x / out.milk)), yA: Math.max(0.01, Math.min(0.99, y / out.benz)) })} />
          </Plot>
          <div className="small muted">
            <TeX>{`U_A = X^{${cA.a}}Y^{${f2(1 - cA.a)}}`}</TeX>, <TeX>{`U_B = X^{${cB.a}}Y^{${f2(1 - cB.a)}}`}</TeX>. The box is as large as the output.
          </div>
        </div>
      </div>

      <h3>The three conditions, live</h3>
      <table className="tbl" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>condition</th>
            <th>values now</th>
            <th>status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="txt">
              <b>Production, within industries</b>: each firm’s <TeX>{'MP_L'}</TeX> and <TeX>{'MP_K'}</TeX> equal to its rival’s (so{' '}
              <TeX>{'MC_1 = MC_2'}</TeX>)
            </td>
            <td>
              milk MP_L {f2(c.within.milkMPL[0], 3)} vs {f2(c.within.milkMPL[1], 3)}; MP_K {f2(c.within.milkMPK[0], 3)} vs {f2(c.within.milkMPK[1], 3)}
              <br />
              Benz MP_L {f2(c.within.benzMPL[0], 3)} vs {f2(c.within.benzMPL[1], 3)}; MP_K {f2(c.within.benzMPK[0], 3)} vs {f2(c.within.benzMPK[1], 3)}
            </td>
            <td>
              <Status ok={okWithin} />
            </td>
            <td>
              <button onClick={fixWithin}>fix</button>
            </td>
          </tr>
          <tr>
            <td className="txt">
              <b>Production, across industries</b>: <TeX>{'MRTS^{milk}_{L,K} = MRTS^{Benz}_{L,K}'}</TeX>
            </td>
            <td>
              {f2(c.mrtsM, 3)} vs {f2(c.mrtsB, 3)}
            </td>
            <td>
              <Status ok={okMRTS} />
            </td>
            <td>
              <button onClick={fixMRTS}>fix</button>
            </td>
          </tr>
          <tr>
            <td className="txt">
              <b>Exchange</b>: <TeX>{'MRS^A = MRS^B'}</TeX>
            </td>
            <td>
              {f2(c.mrsA, 3)} vs {f2(c.mrsB, 3)}
            </td>
            <td>
              <Status ok={okMRS} />
            </td>
            <td>
              <button onClick={fixMRS}>fix</button>
            </td>
          </tr>
          <tr>
            <td className="txt">
              <b>Product mix</b>: <TeX>{'MRS = MRT = MC_{milk}/MC_{Benz}'}</TeX>
            </td>
            <td>
              MRS {f2(c.mrsA, 3)}; MRT via labour {f2(c.mrt.viaL, 3)}, via capital {f2(c.mrt.viaK, 3)}
            </td>
            <td>
              <Status ok={okTop} />
            </td>
            <td>
              <button onClick={market}>let markets do it</button>
            </td>
          </tr>
        </tbody>
      </table>
      <Readouts
        rows={[
          ['output', `${f2(out.milk, 2)} ${N.x}, ${f2(out.benz, 2)} ${N.y}`],
          ['by firm', `${fn[0]} ${f2(out.parts.M1, 2)}, ${fn[1]} ${f2(out.parts.M2, 2)}, ${fn[2]} ${f2(out.parts.B1, 2)}, ${fn[3]} ${f2(out.parts.B2, 2)}`],
          ['inputs (L, K)', `${fn[0]} (${f2(s.sLM * s.LM, 1)}, ${f2(s.sKM * s.KM, 1)}), ${fn[1]} (${f2((1 - s.sLM) * s.LM, 1)}, ${f2((1 - s.sKM) * s.KM, 1)})`],
        ]}
      />
      <Lemma tag="Lemma">
        If one unit of labour moves from Benz to milk, milk rises by <TeX>{'MP^{milk}_L'}</TeX> and Benz falls by <TeX>{'MP^{Benz}_L'}</TeX>: the slope of the PPF is{' '}
        <TeX>{'MRT = MP^{Benz}_L/MP^{milk}_L = (w/MP^{milk}_L)/(w/MP^{Benz}_L) = MC_{milk}/MC_{Benz}'}</TeX>. Measured through capital, the same number, but only
        on the production contract curve, which is why the MRT row says “via labour” and “via capital”. If <TeX>{'MRS < MRT'}</TeX>, consumers value milk less
        than it costs to make: produce less milk, more Benz.
      </Lemma>
    </div>
  );
}
