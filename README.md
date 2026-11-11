# Milk & Benz — a living model of welfare economics

A study notebook for a Public Economics course. A guild of logicians farms milk to buy Mercedes-Benz cars; welfare economics is the physics of their small world. Every aggregate on screen can be taken apart into the individuals it was built from, and every lab has an **exam lens** that swaps the costume for the course's notation.

## Run

```bash
npm install
npm run dev        # opens http://localhost:5173
npm test           # the engine and exam test suite (Vitest)
npm run build      # static build in dist/ (works from any folder; base is ./)
```

Requires Node 18+. No backend; progress (exam answers, the revisit list, predictions, the lens switch) is kept in the browser's localStorage.

## The labs

| § | Lab | What lives there |
|---|---|---|
| 1 | One farmer | Budget, MRS = price ratio, corners; switches for what breaks the classical model (non-diminishing MU, moving tastes, satiation) and what doesn't (substitutes, complements, home production, altruism) |
| 2 | Edgeworth box | Individual / market / society side by side; lens, contract curve with its edge, price line, animated price adjustment, both welfare theorems, UPF and W contours. First preset U_A = X + 3Y, U_B = XY |
| 3a | Three goods | Rotatable 3D box with chalk; indifference surfaces, price plane, gradients, contract curve |
| 3b | Market square | 2–250 farmers; needles (MRS) align as the price adjusts; MRS histogram; market demand that comes apart; a tax wedge with its DWL |
| 4 | Society | Utility bars and W from Bentham to Rawls; Pareto improvement vs "W does not fall"; leaky bucket |
| 5 | Production | Production box, PPF, consumption box; the three efficiency conditions live |
| 6 | The lake | Private vs social cost; two polluters (standard, tax, permits, SMC aggregation); prices vs quantities with a wrong regulator; Coase with transaction costs and many parties; what counts as an externality |
| 7 | The Milchstraße | Horizontal vs vertical summation; free-riding and crowd-out; the average-rule mechanism; personalised shares MC/2 ± x; lying; who should build |
| 8 | Evidence | Diff-in-diff with bendable pre-trends and levels/growth; crowd-out regression with a hidden taste |
| 9 | Exam room | Exam-style papers with a scoring rule; fresh numbers for ten problem types; revisit list |

## How the engine is organised

`src/engine/` is pure TypeScript with no UI imports; the labs only read from it.

| File | Contents |
|---|---|
| `aggregate.ts` | `{ total, parts }` aggregates, bisection, golden section, seeded RNG |
| `utility.ts` | Utility families, MRS as an interval, demand as a correspondence, indifference curves, expenditure functions |
| `exchange.ts` | n-agent exchange: excess demand, robust equilibrium solver, tâtonnement, rationed provisional trades; Edgeworth box: contract curve, efficiency test, lens, UPF |
| `exchange3.ts` | Two agents, three goods (Cobb–Douglas): closed-form contract curve, equilibrium, gradients |
| `market.ts` | Farmers, tax wedge with lump-sum rebate, Allais deadweight loss, needles and histogram |
| `consumer.ts` | One-consumer cases that do and do not break the model |
| `society.ts` | Atkinson W (utilitarian → Rawlsian), contours, leaky bucket |
| `production.ts` | Two industries × two DRS firms, production contract curve, PPF, MRT, the three conditions, competitive equilibrium |
| `externality.ts` | Polluters and instruments, SMC aggregation, prices vs quantities, polluting market, Coase |
| `publicgood.ts` | Vertical sums, Samuelson, the average rule, pre-building, unanimity (Lindahl), lying, voluntary contribution |
| `evidence.ts` | Diff-in-diff (levels, growth, placebo), OLS, crowd-out simulation |

Tests: `src/engine/engine.test.ts` checks every worked example in the labs against closed forms (exchange corner equilibrium, public-good mechanism, two polluters, wrong regulator, DiD) plus extra cases. `src/exam/exam.test.ts` checks the scoring rule, the bank's structure, and that every generator produces well-formed problems.

## Adding questions

All questions are data in `src/exam/bank.ts`.

- **Multiple choice:** append to `MCQS`: `{ id, source: 'new', stem, options, correct: [indices], single?, explain, note?, lab }`. `lab` is a route such as `'lake/regulator'`. Text may contain `$…$` for KaTeX and `**bold**`.
- **Short question:** append to `SHORTS`, with a `rubric` of `{ pts, text }` items summing to `points`.
- **Long question:** add a `LongQ` with `parts`. Each part may have numeric `fields` (`{ label, answer, tol? }`, checked automatically) and/or `selfGrade: true`.
- **New problem generator:** add a function to `src/exam/generators.ts` that returns a `LongQ`, computing answers with the engine, and register it in `GENERATORS`. The generator test picks it up automatically.

## Also here

- `DECISIONS.md`: every open choice and why.
- `material/` (git-ignored): course materials, kept local.
