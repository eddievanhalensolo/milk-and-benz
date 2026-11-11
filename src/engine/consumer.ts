/**
 * One consumer, and the assumptions that keep the model working.
 *
 * Breaks the model: marginal utility that does not diminish (addiction),
 * preferences that move with consumption (habit), satiation (more is not
 * better). Does not break it: substitutes, complements, home production,
 * altruism. Each case returns the optimum on the budget px·x + py·y ≤ m,
 * computed exactly where possible.
 */
import { goldenMax } from './aggregate';

/** U = a x² + b y²: concave indifference curves; the tangency is the WORST point on the budget. */
export function addictive(a: number, b: number, px: number, py: number, m: number) {
  const U = (x: number, y: number) => a * x * x + b * y * y;
  const xt = m / (px + (a * py * py) / (b * px));
  const yt = (m - px * xt) / py;
  const cornerX = { x: m / px, y: 0 };
  const cornerY = { x: 0, y: m / py };
  const best = U(cornerX.x, cornerX.y) >= U(cornerY.x, cornerY.y) ? cornerX : cornerY;
  return { U, tangency: { x: xt, y: yt }, best, tangencyIsMinimum: U(xt, yt) < Math.min(U(cornerX.x, 0), U(0, cornerY.y)) };
}

/** U = −(x − x̄)² − (y − ȳ)²: a bliss point. Inside the budget it is chosen and money is left over. */
export function bliss(xb: number, yb: number, px: number, py: number, m: number) {
  const U = (x: number, y: number) => -((x - xb) ** 2) - (y - yb) ** 2;
  if (px * xb + py * yb <= m) return { U, best: { x: xb, y: yb }, unspent: m - px * xb - py * yb };
  // Euclidean projection onto the budget line, kept in the quadrant
  const t = (px * xb + py * yb - m) / (px * px + py * py);
  let x = xb - t * px;
  let y = yb - t * py;
  if (x < 0) {
    x = 0;
    y = m / py;
  }
  if (y < 0) {
    y = 0;
    x = m / px;
  }
  return { U, best: { x, y }, unspent: 0 };
}

/**
 * Habit: U_t = x^{a_t} y^{1−a_t} with a taste for milk that grows with past milk
 * spending: a_{t+1} = a_t + κ (1 − a_t) s_t, where s_t = a_t is last week's share.
 * Same budget every week, a different choice every week.
 */
export function habitPath(a0: number, kappa: number, px: number, py: number, m: number, weeks: number) {
  const out: { a: number; x: number; y: number }[] = [];
  let a = a0;
  for (let t = 0; t < weeks; t++) {
    out.push({ a, x: (a * m) / px, y: ((1 - a) * m) / py });
    a = a + kappa * (1 - a) * a;
  }
  return out;
}

/**
 * Home production: the first H tons of milk can be made at home at cost c (in
 * Benz) per ton, more than that must be bought at px > c. The budget set is
 * still convex, so a Cobb–Douglas farmer has a unique optimum.
 */
export function homeProduction(alpha: number, c: number, H: number, px: number, py: number, m: number) {
  const cost = (x: number) => c * Math.min(x, H) + px * Math.max(0, x - H);
  const xMax = x0Max(cost, m);
  const yOf = (x: number) => (m - cost(x)) / py;
  const U = (x: number) => Math.pow(Math.max(x, 1e-12), alpha) * Math.pow(Math.max(yOf(x), 1e-12), 1 - alpha);
  const x = goldenMax(U, 0, xMax);
  return { x, y: yOf(x), cost, xMax };
}

function x0Max(cost: (x: number) => number, m: number) {
  let lo = 0;
  let hi = 1;
  while (cost(hi) < m) hi *= 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (cost(mid) < m) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Altruism: U = a ln x + (1 − a) ln y + γ ln(yB + g), where g ≥ 0 is Benz given
 * to a neighbour who has yB. The gift is just a third good.
 */
export function altruism(a: number, gamma: number, yB: number, px: number, py: number, m: number) {
  const M = m + py * yB; // full income
  let x = (a * M) / (px * (1 + gamma));
  let y = ((1 - a) * M) / (py * (1 + gamma));
  let g = (gamma * M) / (py * (1 + gamma)) - yB;
  if (g < 0) {
    g = 0;
    x = (a * m) / px;
    y = ((1 - a) * m) / py;
  }
  return { x, y, g };
}
