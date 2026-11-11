/**
 * Typography and controls: KaTeX, lemmas, sliders, segmented controls,
 * the prediction box and the exam lens.
 */
import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { useApp } from '../store';

export function TeX({ children, block }: { children: string; block?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(children, { displayMode: !!block, throwOnError: false, strict: false });
    } catch {
      return children;
    }
  }, [children, block]);
  return block ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Render a string containing $…$ and $$…$$ math. */
export function Md({ children, className }: { children: string; className?: string }) {
  const parts = useMemo(() => {
    const out: React.ReactNode[] = [];
    const re = /\$\$([^$]+)\$\$|\$([^$]+)\$|\*\*([^*]+)\*\*|\n\n/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let k = 0;
    while ((m = re.exec(children))) {
      if (m.index > last) out.push(children.slice(last, m.index));
      if (m[1]) out.push(<TeX key={k++} block>{m[1]}</TeX>);
      else if (m[2]) out.push(<TeX key={k++}>{m[2]}</TeX>);
      else if (m[3]) out.push(<b key={k++}>{m[3]}</b>);
      else out.push(<span key={k++} style={{ display: 'block', height: 8 }} />);
      last = m.index + m[0].length;
    }
    if (last < children.length) out.push(children.slice(last));
    return out;
  }, [children]);
  return <span className={className}>{parts}</span>;
}

export function Lemma({ tag = 'Lemma', children, quiet }: { tag?: string; children: React.ReactNode; quiet?: boolean }) {
  return (
    <div className={'lemma' + (quiet ? ' quiet' : '')}>
      <span className="tag">{tag}.</span>
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  fmt,
  width,
}: {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
  width?: number;
}) {
  return (
    <div className="slider" style={width ? { minWidth: width } : undefined}>
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <output>{fmt ? fmt(value) : String(Number(value.toFixed(3)))}</output>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <span className="seg">
      {options.map((o) => (
        <button key={o.v} className={o.v === value ? 'on' : ''} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </span>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { v: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.v} className={t.v === value ? 'on' : ''} onClick={() => onChange(t.v)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Commit to a prediction before the answer is revealed. `answer` is the
 * correct option; `explain` is shown after committing.
 */
export function Predict({
  id,
  question,
  options,
  answer,
  explain,
  onCommit,
}: {
  id: string;
  question: React.ReactNode;
  options: string[];
  answer: number;
  explain: React.ReactNode;
  onCommit?: () => void;
}) {
  const saved = useApp((s) => s.predictions[id]);
  const record = useApp((s) => s.recordPrediction);
  const [pick, setPick] = useState<number | null>(saved ?? null);
  const committed = pick !== null;
  return (
    <div className="predict">
      <h4>Predict first</h4>
      <div className="small">{question}</div>
      <div className="opts">
        {options.map((o, i) => (
          <button
            key={i}
            disabled={committed}
            className={committed && i === answer ? 'primary' : ''}
            style={committed && i === pick && i !== answer ? { textDecoration: 'line-through' } : undefined}
            onClick={() => {
              setPick(i);
              record(id, i);
              onCommit?.();
            }}
          >
            {o}
          </button>
        ))}
        {committed && (
          <button className="ghost" onClick={() => setPick(null)}>
            ask again
          </button>
        )}
      </div>
      {committed && (
        <div className="verdict fadein">
          {pick === answer ? <b>Correct. </b> : <b>Not quite. </b>}
          {explain}
        </div>
      )}
    </div>
  );
}

/**
 * Hides a result until the prediction `id` has been committed, with a quiet
 * escape hatch. `fallback` replaces the default placeholder (e.g. null inside SVG).
 */
export function Gate({ id, children, fallback }: { id: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const done = useApp((s) => s.predictions[id] !== undefined);
  const [show, setShow] = useState(false);
  if (done || show) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return (
    <span className="muted small">
      predict below first ·{' '}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setShow(true);
        }}
      >
        just show me
      </a>
    </span>
  );
}

/** Whether the prediction `id` has been committed. */
export const usePredicted = (id: string) => useApp((s) => s.predictions[id] !== undefined);

/** The exam lens panel: only shown when the global lens is on. */
export function ExamLens({ title, question, children }: { title: string; question: React.ReactNode; children: React.ReactNode }) {
  const lens = useApp((s) => s.lens);
  const [open, setOpen] = useState(true);
  if (!lens) return null;
  return (
    <section className="exam-lens fadein">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h4 style={{ margin: 0 }}>Exam lens — {title}</h4>
        <button className="ghost" onClick={() => setOpen(!open)}>
          {open ? 'hide answer' : 'show answer'}
        </button>
      </div>
      <div className="q">{question}</div>
      {open && <div className="ans">{children}</div>}
    </section>
  );
}

export function LensToggle() {
  const lens = useApp((s) => s.lens);
  const set = useApp((s) => s.setLens);
  return (
    <span className={'lens-toggle' + (lens ? ' on' : '')} onClick={() => set(!lens)} title="Swap the costume for the course's notation">
      <span className="sw" />
      exam lens
    </span>
  );
}

export function KeyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="keynote">
      <b>note</b>
      {children}
    </div>
  );
}

export function Readouts({ rows }: { rows: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="readouts">
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function ViewTitle({ zoom, name }: { zoom: string; name: React.ReactNode }) {
  return (
    <div className="view-title">
      <span className="zoom">{zoom}</span>
      <span className="name">{name}</span>
    </div>
  );
}

export function LabLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <a href={'#/' + to}>{children}</a>;
}

export const f2 = (v: number, d = 2) => (isFinite(v) ? Number(v.toFixed(d)).toString() : v > 0 ? '∞' : '—');
