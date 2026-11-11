/**
 * A small SVG plotting kit: a Plot provides linear scales through context;
 * children draw in data coordinates. Thin exact lines, labels on the curves.
 */
import React, { createContext, useContext, useRef } from 'react';

export interface Scale {
  sx: (v: number) => number;
  sy: (v: number) => number;
  ix: (px: number) => number;
  iy: (py: number) => number;
  x: [number, number];
  y: [number, number];
  w: number;
  h: number;
  m: { l: number; r: number; t: number; b: number };
  svg: React.RefObject<SVGSVGElement>;
}

const Ctx = createContext<Scale | null>(null);
export const usePlot = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('usePlot outside Plot');
  return s;
};

export interface PlotProps {
  w?: number;
  h?: number;
  x: [number, number];
  y: [number, number];
  margin?: Partial<Scale['m']>;
  xLabel?: React.ReactNode;
  yLabel?: React.ReactNode;
  xTicks?: number[];
  yTicks?: number[];
  grid?: boolean;
  axes?: boolean;
  onBackgroundClick?: (x: number, y: number) => void;
  onBackgroundDrag?: (x: number, y: number) => void;
  children?: React.ReactNode;
  title?: string;
}

export function niceTicks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / mag;
  const step = (err >= 5 ? 10 : err >= 2 ? 5 : err >= 1 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9 * step; v += step) out.push(Math.abs(v) < 1e-12 ? 0 : v);
  return out;
}

export function fmtTick(v: number) {
  if (Math.abs(v) >= 1000) return v.toLocaleString('en-US');
  return String(Number(v.toPrecision(4)));
}

export function Plot(props: PlotProps) {
  const w = props.w ?? 420;
  const h = props.h ?? 340;
  const m = { l: 44, r: 16, t: 14, b: 38, ...props.margin };
  const svg = useRef<SVGSVGElement>(null);
  const [x0, x1] = props.x;
  const [y0, y1] = props.y;
  const sx = (v: number) => m.l + ((v - x0) / (x1 - x0)) * (w - m.l - m.r);
  const sy = (v: number) => h - m.b - ((v - y0) / (y1 - y0)) * (h - m.t - m.b);
  const ix = (px: number) => x0 + ((px - m.l) / (w - m.l - m.r)) * (x1 - x0);
  const iy = (py: number) => y0 + ((h - m.b - py) / (h - m.t - m.b)) * (y1 - y0);
  const scale: Scale = { sx, sy, ix, iy, x: props.x, y: props.y, w, h, m, svg };
  const xt = props.xTicks ?? niceTicks(x0, x1);
  const yt = props.yTicks ?? niceTicks(y0, y1);
  const axes = props.axes ?? true;

  const toData = (e: React.PointerEvent) => {
    const el = svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    return [ix(p.x), iy(p.y)] as const;
  };

  const bgDown = (e: React.PointerEvent) => {
    if (!props.onBackgroundClick && !props.onBackgroundDrag) return;
    const [x, y] = toData(e);
    props.onBackgroundClick?.(x, y);
    if (props.onBackgroundDrag) {
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };
  const bgMove = (e: React.PointerEvent) => {
    if (!props.onBackgroundDrag || !(e.buttons & 1)) return;
    const [x, y] = toData(e);
    props.onBackgroundDrag(x, y);
  };

  return (
    <Ctx.Provider value={scale}>
      <svg ref={svg} className="plot" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={props.title}>
        <defs>
          <clipPath id={`clip-${w}-${h}-${m.l}-${m.t}`}>
            <rect x={m.l} y={m.t} width={w - m.l - m.r} height={h - m.t - m.b} />
          </clipPath>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,1 L9,5 L0,9" fill="none" stroke="context-stroke" strokeWidth="1.4" />
          </marker>
        </defs>
        <rect
          x={m.l}
          y={m.t}
          width={w - m.l - m.r}
          height={h - m.t - m.b}
          fill="transparent"
          onPointerDown={bgDown}
          onPointerMove={bgMove}
          style={{ cursor: props.onBackgroundDrag || props.onBackgroundClick ? 'crosshair' : undefined }}
        />
        {props.grid && (
          <g className="grid">
            {xt.map((v) => (
              <line key={'gx' + v} x1={sx(v)} x2={sx(v)} y1={sy(y0)} y2={sy(y1)} />
            ))}
            {yt.map((v) => (
              <line key={'gy' + v} y1={sy(v)} y2={sy(v)} x1={sx(x0)} x2={sx(x1)} />
            ))}
          </g>
        )}
        {axes && (
          <g className="axis">
            <line x1={sx(x0)} x2={sx(x1)} y1={sy(y0)} y2={sy(y0)} />
            <line x1={sx(x0)} x2={sx(x0)} y1={sy(y0)} y2={sy(y1)} />
            {xt.map((v) => (
              <g key={'tx' + v} className="tick">
                <line x1={sx(v)} x2={sx(v)} y1={sy(y0)} y2={sy(y0) + 4} />
                <text x={sx(v)} y={sy(y0) + 15} textAnchor="middle">
                  {fmtTick(v)}
                </text>
              </g>
            ))}
            {yt.map((v) => (
              <g key={'ty' + v} className="tick">
                <line x1={sx(x0) - 4} x2={sx(x0)} y1={sy(v)} y2={sy(v)} />
                <text x={sx(x0) - 7} y={sy(v) + 3.5} textAnchor="end">
                  {fmtTick(v)}
                </text>
              </g>
            ))}
            {props.xLabel && (
              <text className="lbl" x={sx(x1)} y={sy(y0) + 31} textAnchor="end">
                {props.xLabel}
              </text>
            )}
            {props.yLabel && (
              <text className="lbl" x={sx(x0) + 7} y={sy(y1) + 11} textAnchor="start" paintOrder="stroke" stroke="var(--paper)" strokeWidth={3}>
                {props.yLabel}
              </text>
            )}
          </g>
        )}
        <g clipPath={`url(#clip-${w}-${h}-${m.l}-${m.t})`}>{props.children}</g>
      </svg>
    </Ctx.Provider>
  );
}

/** Children rendered outside the clip region (labels near the frame). */
export function Unclipped({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

type Pt = [number, number];

export function pathD(pts: Pt[], s: Scale): string {
  let d = '';
  let pen = false;
  const big = 1e6;
  for (const [x, y] of pts) {
    if (!isFinite(x) || !isFinite(y)) {
      pen = false;
      continue;
    }
    const px = Math.max(-big, Math.min(big, s.sx(x)));
    const py = Math.max(-big, Math.min(big, s.sy(y)));
    d += (pen ? 'L' : 'M') + px.toFixed(2) + ',' + py.toFixed(2);
    pen = true;
  }
  return d;
}

export function Curve({
  pts,
  fn,
  from,
  to,
  n = 200,
  stroke = 'var(--ink)',
  width = 1.3,
  dash,
  opacity,
  onClick,
  className,
}: {
  pts?: Pt[];
  fn?: (x: number) => number;
  from?: number;
  to?: number;
  n?: number;
  stroke?: string;
  width?: number;
  dash?: string;
  opacity?: number;
  onClick?: () => void;
  className?: string;
}) {
  const s = usePlot();
  let points = pts;
  if (!points && fn) {
    const a = from ?? s.x[0];
    const b = to ?? s.x[1];
    points = [];
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n;
      points.push([x, fn(x)]);
    }
  }
  const d = pathD(points ?? [], s);
  return (
    <g className={className}>
      {onClick && <path d={d} fill="none" stroke="transparent" strokeWidth={12} className="clickable" onClick={onClick} />}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        strokeDasharray={dash}
        opacity={opacity}
        strokeLinejoin="round"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}

export function Area({ pts, fill = 'var(--accent-soft)', stroke, opacity }: { pts: Pt[]; fill?: string; stroke?: string; opacity?: number }) {
  const s = usePlot();
  if (pts.length < 3) return null;
  return <path d={pathD(pts, s) + 'Z'} fill={fill} stroke={stroke ?? 'none'} strokeWidth={0.8} opacity={opacity} style={{ pointerEvents: 'none' }} />;
}

export function Seg({
  a,
  b,
  stroke = 'var(--ink)',
  width = 1,
  dash,
  arrow,
  opacity,
}: {
  a: Pt;
  b: Pt;
  stroke?: string;
  width?: number;
  dash?: string;
  arrow?: boolean;
  opacity?: number;
}) {
  const s = usePlot();
  if (![...a, ...b].every(isFinite)) return null;
  return (
    <line
      x1={s.sx(a[0])}
      y1={s.sy(a[1])}
      x2={s.sx(b[0])}
      y2={s.sy(b[1])}
      stroke={stroke}
      strokeWidth={width}
      strokeDasharray={dash}
      markerEnd={arrow ? 'url(#arrow)' : undefined}
      opacity={opacity}
      style={{ pointerEvents: 'none' }}
    />
  );
}

/** A guide from a point down to the x-axis and across to the y-axis. */
export function Drop({ x, y, stroke = 'var(--silver)', toX = true, toY = true }: { x: number; y: number; stroke?: string; toX?: boolean; toY?: boolean }) {
  const s = usePlot();
  return (
    <g style={{ pointerEvents: 'none' }}>
      {toX && <line x1={s.sx(x)} x2={s.sx(x)} y1={s.sy(y)} y2={s.sy(s.y[0])} stroke={stroke} strokeDasharray="2 3" strokeWidth={0.9} />}
      {toY && <line x1={s.sx(s.x[0])} x2={s.sx(x)} y1={s.sy(y)} y2={s.sy(y)} stroke={stroke} strokeDasharray="2 3" strokeWidth={0.9} />}
    </g>
  );
}

export function Dot({
  x,
  y,
  r = 3.5,
  fill = 'var(--ink)',
  stroke,
  hollow,
  onClick,
  title,
}: {
  x: number;
  y: number;
  r?: number;
  fill?: string;
  stroke?: string;
  hollow?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const s = usePlot();
  if (!isFinite(x) || !isFinite(y)) return null;
  return (
    <circle
      cx={s.sx(x)}
      cy={s.sy(y)}
      r={r}
      fill={hollow ? 'var(--paper)' : fill}
      stroke={stroke ?? fill}
      strokeWidth={hollow ? 1.4 : 0.8}
      onClick={onClick}
      className={onClick ? 'clickable' : undefined}
      style={onClick ? undefined : { pointerEvents: 'none' }}
    >
      {title && <title>{title}</title>}
    </circle>
  );
}

export function Label({
  x,
  y,
  children,
  dx = 0,
  dy = 0,
  anchor = 'start',
  color = 'var(--ink-2)',
  size = 13,
  italic = true,
  weight,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  dx?: number;
  dy?: number;
  anchor?: 'start' | 'middle' | 'end';
  color?: string;
  size?: number;
  italic?: boolean;
  weight?: number;
}) {
  const s = usePlot();
  if (!isFinite(x) || !isFinite(y)) return null;
  return (
    <text
      x={s.sx(x) + dx}
      y={s.sy(y) + dy}
      textAnchor={anchor}
      style={{ fill: color, fontSize: size, fontStyle: italic ? 'italic' : 'normal', fontWeight: weight, pointerEvents: 'none' }}
      paintOrder="stroke"
      stroke="var(--paper)"
      strokeWidth={3}
      strokeLinejoin="round"
    >
      {children}
    </text>
  );
}

/** A draggable handle in data coordinates. */
export function Handle({
  x,
  y,
  onDrag,
  r = 6,
  fill = 'var(--ink)',
  hollow,
  label,
  title,
}: {
  x: number;
  y: number;
  onDrag: (x: number, y: number) => void;
  r?: number;
  fill?: string;
  hollow?: boolean;
  label?: string;
  title?: string;
}) {
  const s = usePlot();
  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!(e.buttons & 1)) return;
    const el = s.svg.current!;
    const pt = el.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(el.getScreenCTM()!.inverse());
    onDrag(s.ix(p.x), s.iy(p.y));
  };
  if (!isFinite(x) || !isFinite(y)) return null;
  return (
    <g className="drag" onPointerDown={down} onPointerMove={move}>
      <circle cx={s.sx(x)} cy={s.sy(y)} r={r + 7} fill="transparent" />
      <circle cx={s.sx(x)} cy={s.sy(y)} r={r} fill={hollow ? 'var(--paper)' : fill} stroke={fill} strokeWidth={1.6} />
      {!hollow && <circle cx={s.sx(x)} cy={s.sy(y)} r={r - 3.2} fill="var(--paper)" />}
      {label && (
        <text
          x={s.sx(x) + r + 4}
          y={s.sy(y) - r - 2}
          style={{ fontSize: 12.5, fontStyle: 'italic', fill: 'var(--ink)' }}
          paintOrder="stroke"
          stroke="var(--paper)"
          strokeWidth={3}
        >
          {label}
        </text>
      )}
      {title && <title>{title}</title>}
    </g>
  );
}

/** A short needle through (x, y) with slope −mrs, drawn with a fixed pixel length. */
export function Needle({
  x,
  y,
  mrs,
  len = 14,
  stroke = 'var(--ink)',
  width = 1.2,
  opacity,
}: {
  x: number;
  y: number;
  mrs: number;
  len?: number;
  stroke?: string;
  width?: number;
  opacity?: number;
}) {
  const s = usePlot();
  if (!isFinite(x) || !isFinite(y)) return null;
  // direction in data space (1, −mrs) → pixel space
  const dxp = s.sx(x + 1) - s.sx(x);
  const dyp = s.sy(y - (isFinite(mrs) ? mrs : 1e9)) - s.sy(y);
  const n = Math.hypot(dxp, dyp) || 1;
  const ux = (dxp / n) * len;
  const uy = (dyp / n) * len;
  const cx = s.sx(x);
  const cy = s.sy(y);
  return <line x1={cx - ux} y1={cy - uy} x2={cx + ux} y2={cy + uy} stroke={stroke} strokeWidth={width} opacity={opacity} strokeLinecap="round" style={{ pointerEvents: 'none' }} />;
}

/** Sample an indifference curve y = g(x) densely, including kinks. */
export function sampleCurve(g: (x: number) => number, x0: number, x1: number, extra: number[] = [], n = 220): Pt[] {
  const xs: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // denser near the left edge, where Cobb–Douglas curves are steep
    xs.push(x0 + (x1 - x0) * t * t * 0.25 + (x1 - x0) * t * 0.75);
  }
  for (const e of extra) if (e >= x0 && e <= x1) xs.push(e, e - 1e-9);
  xs.sort((a, b) => a - b);
  return xs.map((x) => [x, g(x)]);
}
