import { useMemo, useState } from 'react';
import { PageHead } from '../App';
import { useApp } from '../store';
import { KeyNote, LabLink, Md, Tabs } from '../ui/kit';
import { LETTERS, LongPart, LongQ, MCQ, MCQS, SHORTS, ShortQ } from './bank';
import { GENERATORS } from './generators';
import { checkNum, scoreMC } from './scoring';

type Tab = 'mock' | 'drill' | 'revisit' | 'rules';

const LAB_TITLE: Record<string, string> = {
  '': 'Prologue',
  farmer: '§1 One farmer',
  box: '§2 Edgeworth box',
  square: '§3b Market square',
  society: '§4 Society',
  production: '§5 Production',
  lake: '§6 The lake',
  road: '§7 Milchstraße',
  evidence: '§8 Evidence',
};
const labTitle = (r: string) => LAB_TITLE[r] ?? LAB_TITLE[r.split('/')[0]] ?? r;

export default function ExamRoom({ sub }: { sub: string }) {
  const [head, arg] = sub.split('/');
  const tab = (['mock', 'drill', 'revisit', 'rules'].includes(head) ? head : 'mock') as Tab;
  const mistakes = useApp((s) => s.mistakes.length);
  return (
    <div>
      <PageHead num="9" title="The exam room" right={<span className="muted small">no timer, no streaks</span>} />
      <p className="lede">
        Three parts, as in a written exam: multiple choice, short questions, long questions. Answers are kept in this browser. Every
        question links to the lab where its idea lives; every miss goes on the revisit list.
      </p>
      <Tabs
        value={tab}
        onChange={(t) => (window.location.hash = '#/exam/' + t)}
        tabs={[
          { v: 'mock', label: 'A new paper' },
          { v: 'drill', label: 'Fresh numbers' },
          { v: 'revisit', label: `To revisit (${mistakes})` },
          { v: 'rules', label: 'Scoring' },
        ]}
      />
      {tab === 'mock' && <MockPaper />}
      {tab === 'drill' && <Drill initial={arg} />}
      {tab === 'revisit' && <Revisit />}
      {tab === 'rules' && <Rules />}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function MockPaper() {
  const [seed, setSeed] = useState(() => {
    try {
      return Number(localStorage.getItem('mb-mock-seed')) || 1;
    } catch {
      return 1;
    }
  });
  const clear = useApp((s) => s.clearAnswers);
  const { mcqs, shorts, longs } = useMemo(() => {
    // all new MCQs (cycled to 12), new shorts, three generated longs
    const pool = MCQS.filter((q) => q.source === 'new');
    const start = (seed * 5) % pool.length;
    const mcqs = Array.from({ length: 12 }, (_, i) => pool[(start + i) % pool.length]);
    const shorts = SHORTS.filter((q) => q.source === 'new').slice(0, 5);
    const gens = ['did', 'publicgood', 'polluters'];
    const longs = gens.map((g) => GENERATORS.find((x) => x.id === g)!.make(seed * 7 + gens.indexOf(g)));
    return { mcqs, shorts, longs };
  }, [seed]);
  return (
    <div>
      <div className="controls">
        <span className="small muted">Paper #{seed}: multiple-choice and short questions from the bank, long questions with fresh numbers.</span>
        <button
          onClick={() => {
            clear(`mock${seed}:`);
            const s = seed + 1;
            setSeed(s);
            try {
              localStorage.setItem('mb-mock-seed', String(s));
            } catch {
              /* ignore */
            }
          }}
        >
          another paper
        </button>
      </div>
      <Paper id={`mock${seed}`} mcqs={mcqs} shorts={shorts} longs={longs} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Paper({ id, mcqs, shorts, longs }: { id: string; mcqs: MCQ[]; shorts: ShortQ[]; longs: LongQ[] }) {
  const answers = useApp((s) => s.answers);
  const clear = useApp((s) => s.clearAnswers);
  const [part, setPart] = useState<1 | 2 | 3>(1);
  const key = (k: string) => `${id}:${k}`;
  const mcScore = mcqs.reduce((s, q) => {
    const a = answers[key(q.id)] as { ticked: number[]; done: boolean } | undefined;
    return s + (a?.done ? scoreMC(q.options.length, q.correct, a.ticked).score : 0);
  }, 0);
  const mcDone = mcqs.filter((q) => (answers[key(q.id)] as { done?: boolean } | undefined)?.done).length;
  const shortScore = shorts.reduce((s, q) => s + (((answers[key(q.id)] as { grade?: number[] } | undefined)?.grade ?? []).reduce((a, b) => a + b, 0)), 0);
  const longScore = longs.reduce(
    (s, q) => s + q.parts.reduce((t, p) => t + ((answers[key(`${q.id}.${p.label}`)] as { pts?: number } | undefined)?.pts ?? 0), 0),
    0,
  );
  const mcMax = mcqs.length * 3;
  const shortMax = shorts.reduce((s, q) => s + q.points, 0);
  const longMax = longs.reduce((s, q) => s + q.points, 0);
  return (
    <div>
      <div className="card" style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
        <span className="score">
          Part 1: {mcScore}/{mcMax} <span className="muted">({mcDone} of {mcqs.length} submitted)</span>
        </span>
        <span className="score">
          Part 2: {shortScore}/{shortMax}
        </span>
        <span className="score">
          Part 3: {Math.round(longScore * 10) / 10}/{longMax}
        </span>
        <span className="score">
          <b>Total: {Math.round((mcScore + shortScore + longScore) * 10) / 10}/{mcMax + shortMax + longMax}</b>
        </span>
        <button className="ghost" onClick={() => clear(id + ':')}>
          clear my answers
        </button>
      </div>
      <Tabs
        value={String(part) as '1' | '2' | '3'}
        onChange={(v) => setPart(Number(v) as 1 | 2 | 3)}
        tabs={[
          { v: '1', label: `1. Multiple choice (${mcMax})` },
          { v: '2', label: `2. Short questions (${shortMax})` },
          { v: '3', label: `3. Long questions (${longMax})` },
        ]}
      />
      {part === 1 && (
        <div>
          <p className="small muted" style={{ marginTop: 0 }}>
            3 points each. One point is deducted for each option wrongly ticked or wrongly left blank, until no points remain. Single-choice questions are
            marked.
          </p>
          {mcqs.map((q, i) => (
            <MCQuestion key={q.id} q={q} n={i + 1} storeKey={key(q.id)} />
          ))}
        </div>
      )}
      {part === 2 && shorts.map((q, i) => <ShortQuestion key={q.id} q={q} n={i + 1} storeKey={key(q.id)} />)}
      {part === 3 && longs.map((q, i) => <LongQuestion key={q.id} q={q} n={i + 1} storeKey={(p) => key(`${q.id}.${p}`)} />)}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function MCQuestion({ q, n, storeKey }: { q: MCQ; n: number; storeKey: string }) {
  const saved = useApp((s) => s.answers[storeKey]) as { ticked: number[]; done: boolean } | undefined;
  const setAnswer = useApp((s) => s.setAnswer);
  const addMistake = useApp((s) => s.addMistake);
  const removeMistake = useApp((s) => s.removeMistake);
  const ticked = saved?.ticked ?? [];
  const done = !!saved?.done;
  const toggle = (i: number) => {
    if (done) return;
    const t = q.single ? (ticked.includes(i) ? [] : [i]) : ticked.includes(i) ? ticked.filter((x) => x !== i) : [...ticked, i].sort();
    setAnswer(storeKey, { ticked: t, done: false });
  };
  const submit = () => {
    setAnswer(storeKey, { ticked, done: true });
    const sc = scoreMC(q.options.length, q.correct, ticked).score;
    if (sc < 3) addMistake({ id: q.id, title: `MC: ${q.stem.slice(0, 80)}`, lab: q.lab, when: Date.now(), detail: `scored ${sc}/3` });
    else removeMistake(q.id);
  };
  const sc = scoreMC(q.options.length, q.correct, ticked);
  return (
    <div className="mcq">
      <div className="stem">
        <span className="mono" style={{ color: 'var(--accent)', marginRight: 8 }}>
          {n})
        </span>
        <Md>{q.stem}</Md>
        {q.single && <span className="single">single choice</span>}
        {q.source === 'new' && <span className="pill" style={{ marginLeft: 8 }}>new</span>}
      </div>
      {q.options.map((o, i) => {
        const cls = done ? (q.correct.includes(i) ? 'right' : ticked.includes(i) ? 'wrong' : '') : '';
        return (
          <div key={i} className={'opt ' + cls} onClick={() => toggle(i)}>
            <input type={q.single ? 'radio' : 'checkbox'} checked={ticked.includes(i)} readOnly />
            <span className="letter">{LETTERS[i]})</span>
            <span>
              <Md>{o}</Md>
            </span>
          </div>
        );
      })}
      <div className="controls">
        {!done ? (
          <button className="primary" onClick={submit}>
            submit
          </button>
        ) : (
          <>
            <span className="score">
              {sc.score}/3 · answer {q.correct.map((c) => LETTERS[c]).join(', ')}
            </span>
            <button className="ghost" onClick={() => setAnswer(storeKey, { ticked: [], done: false })}>
              try again
            </button>
          </>
        )}
        <span className="small">
          <LabLink to={q.lab}>→ {labTitle(q.lab)}</LabLink>
        </span>
      </div>
      {done && (
        <div className="small fadein" style={{ maxWidth: 820 }}>
          <Md>{q.explain}</Md>
          {q.note && <KeyNote>{q.note}</KeyNote>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ShortQuestion({ q, n, storeKey }: { q: ShortQ; n: number; storeKey: string }) {
  const saved = (useApp((s) => s.answers[storeKey]) as { text?: string; shown?: boolean; grade?: number[] } | undefined) ?? {};
  const setAnswer = useApp((s) => s.setAnswer);
  const addMistake = useApp((s) => s.addMistake);
  const removeMistake = useApp((s) => s.removeMistake);
  const [draft, setDraft] = useState(saved.text ?? '');
  const grade = saved.grade ?? q.rubric.map(() => 0);
  const total = grade.reduce((a, b) => a + b, 0);
  const setGrade = (i: number, v: number) => {
    const g = [...grade];
    g[i] = v;
    setAnswer(storeKey, { ...saved, text: draft, grade: g });
    const t = g.reduce((a, b) => a + b, 0);
    if (t < q.points) addMistake({ id: q.id, title: `Short: ${q.prompt.slice(0, 80)}`, lab: q.lab, when: Date.now(), detail: `self-graded ${t}/${q.points}` });
    else removeMistake(q.id);
  };
  return (
    <div className="mcq">
      <div className="stem">
        <span className="mono" style={{ color: 'var(--accent)', marginRight: 8 }}>
          {n})
        </span>
        <span className="pts mono">({q.points} points) </span>
        <Md>{q.prompt}</Md>
        {q.source === 'new' && <span className="pill" style={{ marginLeft: 8 }}>new</span>}
      </div>
      <textarea value={draft} placeholder="Write your answer here, then compare." onChange={(e) => setDraft(e.target.value)} onBlur={() => setAnswer(storeKey, { ...saved, text: draft })} />
      <div className="controls">
        {!saved.shown ? (
          <button className="primary" onClick={() => setAnswer(storeKey, { ...saved, text: draft, shown: true })}>
            show model answer and rubric
          </button>
        ) : (
          <span className="score">
            self-graded: {total}/{q.points}
          </span>
        )}
        <span className="small">
          <LabLink to={q.lab}>→ {labTitle(q.lab)}</LabLink>
        </span>
      </div>
      {saved.shown && (
        <div className="cols2 fadein">
          <div className="small">
            <h4>Model answer</h4>
            <Md>{q.model}</Md>
            {q.note && <KeyNote>{q.note}</KeyNote>}
          </div>
          <div className="small">
            <h4>Rubric: award yourself</h4>
            <ul className="rubric" style={{ paddingLeft: 0, listStyle: 'none' }}>
              {q.rubric.map((r, i) => (
                <li key={i}>
                  <select value={grade[i]} onChange={(e) => setGrade(i, Number(e.target.value))}>
                    {Array.from({ length: r.pts + 1 }, (_, k) => (
                      <option key={k} value={k}>
                        {k}/{r.pts}
                      </option>
                    ))}
                  </select>{' '}
                  <Md>{r.text}</Md>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function LongQuestion({ q, n, storeKey }: { q: LongQ; n: number; storeKey: (part: string) => string }) {
  return (
    <div className="mcq">
      <div className="stem">
        <span className="mono" style={{ color: 'var(--accent)', marginRight: 8 }}>
          {n})
        </span>
        <b style={{ fontWeight: 600 }}>{q.title}</b> <span className="pts mono">({q.points} points)</span>
        <span className="pill" style={{ marginLeft: 8 }}>{q.source}</span>
      </div>
      <p style={{ margin: '4px 0 10px' }}>
        <Md>{q.intro}</Md>
      </p>
      {q.note && <KeyNote>{q.note}</KeyNote>}
      <div className="steps">
        {q.parts.map((p) => (
          <LongPartView key={p.label} q={q} p={p} storeKey={storeKey(p.label)} />
        ))}
      </div>
      <div className="small">
        <LabLink to={q.lab}>→ {labTitle(q.lab)}</LabLink>
      </div>
    </div>
  );
}

function LongPartView({ q, p, storeKey }: { q: LongQ; p: LongPart; storeKey: string }) {
  const saved = (useApp((s) => s.answers[storeKey]) as { inputs?: string[]; checked?: boolean; pts?: number; self?: number } | undefined) ?? {};
  const setAnswer = useApp((s) => s.setAnswer);
  const addMistake = useApp((s) => s.addMistake);
  const removeMistake = useApp((s) => s.removeMistake);
  const fields = p.fields ?? [];
  const [inputs, setInputs] = useState<string[]>(saved.inputs ?? fields.map(() => ''));
  const checked = !!saved.checked;
  const ok = fields.map((f, i) => checkNum(inputs[i] ?? '', f.answer, f.tol));
  const nOk = ok.filter(Boolean).length;
  const autoPts = fields.length ? (p.points * nOk) / fields.length : 0;
  const mid = `${q.id}.${p.label}`;
  const check = (self?: number) => {
    const pts = p.selfGrade ? (self ?? saved.self ?? 0) : autoPts;
    setAnswer(storeKey, { inputs, checked: true, pts, self });
    const bad = fields.length ? nOk < fields.length : pts < p.points;
    if (bad) addMistake({ id: mid, title: `${q.title} (${p.label})`, lab: q.lab, when: Date.now(), detail: fields.length ? `${nOk}/${fields.length} numbers right` : '' });
    else removeMistake(mid);
  };
  const cls = checked ? (fields.length ? (nOk === fields.length ? 'done' : 'bad') : 'done') : '';
  return (
    <div className={'step ' + cls}>
      <div>
        <b className="mono">({p.label})</b> <span className="pts mono">{p.points} pts</span> <Md>{p.prompt}</Md>
      </div>
      {fields.length > 0 && (
        <div className="controls">
          {fields.map((f, i) => (
            <label key={i} className="small" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {f.label}
              <input
                type="text"
                value={inputs[i] ?? ''}
                onChange={(e) => {
                  const v = [...inputs];
                  v[i] = e.target.value;
                  setInputs(v);
                }}
                onKeyDown={(e) => e.key === 'Enter' && check()}
                style={checked ? { borderColor: ok[i] ? 'var(--good)' : 'var(--accent)' } : undefined}
              />
              {checked && <span style={{ color: ok[i] ? 'var(--good)' : 'var(--accent)' }}>{ok[i] ? '✓' : '✗'}</span>}
            </label>
          ))}
        </div>
      )}
      <div className="controls">
        {!checked && (
          <button className="primary" onClick={() => check()}>
            {fields.length ? 'check' : 'show the model answer'}
          </button>
        )}
        {checked && (
          <button className="ghost" onClick={() => setAnswer(storeKey, { inputs, checked: false })}>
            edit
          </button>
        )}
        {checked && fields.length > 0 && !p.selfGrade && (
          <span className="score">
            {Math.round(autoPts * 10) / 10}/{p.points}
          </span>
        )}
        {checked && p.selfGrade && (
          <span className="small">
            award yourself{' '}
            <select value={saved.self ?? 0} onChange={(e) => check(Number(e.target.value))}>
              {Array.from({ length: p.points + 1 }, (_, k) => (
                <option key={k} value={k}>
                  {k}/{p.points}
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
      {checked && (
        <div className="small fadein" style={{ maxWidth: 860 }}>
          <Md>{p.model}</Md>
          {fields.length > 0 && nOk < fields.length && (
            <div className="muted">Expected: {fields.map((f) => `${f.label} = ${Number(f.answer.toFixed(4))}`).join('; ')}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Drill({ initial }: { initial?: string }) {
  const [gen, setGen] = useState(GENERATORS.find((g) => g.id === initial)?.id ?? GENERATORS[0].id);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 10000));
  const g = GENERATORS.find((x) => x.id === gen)!;
  const q = useMemo(() => g.make(seed), [g, seed]);
  return (
    <div className="cols-wide" style={{ gridTemplateColumns: 'minmax(0,1fr) 260px' }}>
      <div>
        <LongQuestion key={q.id} q={q} n={1} storeKey={(p) => `drill:${q.id}.${p}`} />
        <button className="primary" onClick={() => setSeed(seed + 1 + Math.floor(Math.random() * 1000))}>
          fresh numbers
        </button>
      </div>
      <div className="card">
        <h4>Problem types</h4>
        {GENERATORS.map((x) => (
          <div key={x.id}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setGen(x.id);
              }}
              style={{ color: x.id === gen ? 'var(--accent)' : 'var(--ink-2)', fontSize: 14.5 }}
            >
              {x.title}
            </a>
          </div>
        ))}
        <p className="aside small">Each problem’s answers are computed by the same engine the labs use. Fractions like 2/3 are accepted.</p>
      </div>
    </div>
  );
}

function Revisit() {
  const mistakes = useApp((s) => s.mistakes);
  const remove = useApp((s) => s.removeMistake);
  if (!mistakes.length) return <p className="muted">Nothing to revisit. Questions you miss will collect here.</p>;
  return (
    <table className="tbl" style={{ width: '100%' }}>
      <thead>
        <tr>
          <th>question</th>
          <th>result</th>
          <th>where the idea lives</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {mistakes.map((m) => (
          <tr key={m.id}>
            <td className="txt" style={{ textAlign: 'left' }}>
              <Md>{m.title + (m.title.length >= 80 ? '…' : '')}</Md>
            </td>
            <td className="txt">{m.detail}</td>
            <td className="txt">{m.lab !== undefined && <LabLink to={m.lab}>{labTitle(m.lab)}</LabLink>}</td>
            <td>
              <button className="ghost" onClick={() => remove(m.id)}>
                got it now
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Rules() {
  return (
    <div className="cols2">
      <div>
        <h3>Scoring</h3>
        <p>
          Multiple choice: 3 points per question; one point off for each option ticked that should not be, or left blank that should be ticked; never below
          zero. Applied literally, a wrong answer on a single-choice question is two mismatches (the wrong one ticked, the right one blank) and scores 1;
          leaving it blank scores 2. Your instructor may grade single-choice questions all-or-nothing.
        </p>
        <p>Short questions: grade yourself against the rubric. Long questions: numbers are checked; text parts are self-graded.</p>
      </div>
      <div>
        <h3>Writing answers that earn the points</h3>
        <ul>
          <li>State the condition before solving it (“social optimum: SMB = SMC”, “Samuelson: Σ MB = MC”, “inner efficiency ⇔ MRS<sub>A</sub> = MRS<sub>B</sub>”).</li>
          <li>Name the method (“difference-in-differences”), define treatment and control explicitly.</li>
          <li>For every “why”: one sentence of mechanism, saying who does what and why it moves the result.</li>
          <li>For a graph: label axes, both curves, the optimum, and shade the DWL.</li>
        </ul>
      </div>
    </div>
  );
}
