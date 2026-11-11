/**
 * Views shared across labs. The individual view is the first zoom level:
 * one farmer, their indifference curves, their budget, their MRS.
 */
import { Agent, Bundle, demandAt, wealth } from '../engine/exchange';
import { U, Utility, formula, icKinks, icY, mrs, pick } from '../engine/utility';
import { Curve, Dot, Drop, Label, Needle, Plot, Seg, sampleCurve } from '../ui/plot';
import { Readouts, TeX, ViewTitle, f2 } from '../ui/kit';

export function icPoints(u: Utility, level: number, X: number) {
  return sampleCurve((x) => icY(u, x, level), 0, X, icKinks(u, level));
}

export function mrsText(u: Utility, x: number, y: number) {
  const r = mrs(u, x, y);
  if (r.lo === r.hi) return f2(r.lo, 3);
  return `[${f2(r.lo, 2)}, ${f2(r.hi, 2)}]`;
}

/**
 * One farmer in their own coordinates: holding h, endowment e, price p.
 * The budget line runs through the endowment; the dot marks the plan at p.
 */
export function IndividualView({
  agent,
  holding,
  p,
  X,
  Y,
  names,
  color = 'var(--ink)',
  w = 380,
  h = 330,
}: {
  agent: Agent;
  holding: Bundle;
  p: number;
  X: number;
  Y: number;
  names: { x: string; y: string; lens: boolean };
  color?: string;
  w?: number;
  h?: number;
}) {
  const u = agent.u;
  const lvl = U(u, holding.x, holding.y);
  const plan = pick(demandAt(agent, p));
  const planLvl = U(u, plan[0], plan[1]);
  const m = wealth(agent, p);
  const mr = mrs(u, holding.x, holding.y);
  const mrPlan = mrs(u, plan[0], plan[1]);
  const corner = plan[0] < 1e-9 || plan[1] < 1e-9;
  const sub = names.lens ? `_{${agent.id}}` : '';
  return (
    <div>
      <ViewTitle zoom="The individual" name={names.lens ? `consumer ${agent.id}` : agent.name} />
      <div className="small" style={{ marginBottom: 4 }}>
        <TeX>{`U${sub} = ${formula(u, names.lens ? `X${sub}` : 'm', names.lens ? `Y${sub}` : 'b')}`}</TeX>
      </div>
      <Plot w={w} h={h} x={[0, X]} y={[0, Y]} xLabel={names.x} yLabel={names.y}>
        {[0.5, 1.6].map((k) => (
          <Curve key={k} pts={icPoints(u, lvl * k, X)} stroke={color} width={0.6} opacity={0.35} />
        ))}
        <Curve pts={icPoints(u, planLvl, X)} stroke={color} width={0.8} dash="3 3" opacity={0.7} />
        <Curve pts={icPoints(u, lvl, X)} stroke={color} width={1.4} />
        <Seg a={[0, m]} b={[m / p, 0]} stroke="var(--accent)" width={1.2} />
        <Label x={Math.min(X * 0.95, (m / p) * 0.92)} y={Math.max(0, m - p * Math.min(X * 0.95, (m / p) * 0.92))} dy={-6} anchor="end" color="var(--accent)">
          budget, slope −p
        </Label>
        <Drop x={plan[0]} y={plan[1]} />
        <Dot x={agent.e[0]} y={agent.e[1]} hollow fill={color} r={3.5} />
        <Label x={agent.e[0]} y={agent.e[1]} dx={6} dy={14} size={12}>
          ω
        </Label>
        <Dot x={plan[0]} y={plan[1]} fill="var(--accent)" r={4} />
        <Label x={plan[0]} y={plan[1]} dx={7} dy={-7} color="var(--accent)" size={12}>
          plan at p
        </Label>
        <Needle x={holding.x} y={holding.y} mrs={isFinite(mr.lo) ? (mr.lo + (isFinite(mr.hi) ? mr.hi : mr.lo)) / 2 : 1e6} stroke={color} len={16} width={1.6} />
        <Dot x={holding.x} y={holding.y} fill={color} r={4} />
      </Plot>
      <Readouts
        rows={[
          ['holding', `(${f2(holding.x)}, ${f2(holding.y)})`],
          [<span key="m">MRS at holding</span>, mrsText(u, holding.x, holding.y)],
          ['price ratio p', f2(p, 3)],
          ['plan at p', `(${f2(plan[0])}, ${f2(plan[1])})`],
          [
            'at the plan',
            corner ? (
              <span key="c">
                corner: {plan[0] < 1e-9 ? `MRS ${f2(mrPlan.lo, 3)} ≤ p, so no ${names.x}` : `MRS ${f2(mrPlan.hi, 3)} ≥ p, so no ${names.y}`}
              </span>
            ) : (
              <span key="i">MRS = p (tangency)</span>
            ),
          ],
        ]}
      />
    </div>
  );
}
