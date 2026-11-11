/**
 * The multiple-choice rule: 3 points per question, minus one for every
 * option wrongly ticked or wrongly left blank, floor at zero. Applied to
 * single-choice questions too (a wrong single answer is two mismatches: 1 point).
 */
export function scoreMC(nOptions: number, correct: number[], ticked: number[]): { score: number; mismatches: number } {
  let mismatches = 0;
  for (let i = 0; i < nOptions; i++) {
    if (correct.includes(i) !== ticked.includes(i)) mismatches++;
  }
  return { score: Math.max(0, 3 - mismatches), mismatches };
}

/** Parse "2/3", "-100", "1,050", "3.5". */
export function parseNum(s: string): number | null {
  const t = s.trim().replace(/,/g, '').replace(/−/g, '-');
  if (t === '') return null;
  const m = t.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (m) return parseFloat(m[1]) / parseFloat(m[2]);
  const v = Number(t);
  return isFinite(v) ? v : null;
}

export function checkNum(input: string, answer: number, tol?: number): boolean {
  const v = parseNum(input);
  if (v === null) return false;
  const t = tol ?? Math.max(1e-2, 2e-3 * Math.abs(answer));
  return Math.abs(v - answer) <= t;
}
