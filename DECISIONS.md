# Decisions

Things the brief left open, and what was chosen.

## Stack and structure
- **Vite + React + TypeScript, SVG for 2D, three.js for 3D, KaTeX, Vitest**, as suggested. Plus **zustand** for small stores (one per lab, so a lab's state survives navigation) and **@fontsource** for offline fonts (Source Serif 4, IBM Plex Sans/Mono). No backend; `localStorage` (guarded) keeps the exam lens, predictions, exam answers and the revisit list.
- **Engine first, UI-free** (`src/engine/`). Every aggregate is returned as `{ total, parts }` (`aggregate.ts`), so anything on screen can be taken apart into individuals.
- **Hash routing** (`#/lake/regulator`) with no router library; each lab is lazy-loaded, so three.js only loads for §3a.
- No SVG charting library: a small `Plot` kit (`ui/plot.tsx`) gives exact thin lines, labels on curves and draggable handles in data coordinates.

## Economics
- **Prices** are normalised with p_Y = 1 throughout; "p" means p_X/p_Y (Benz per ton of milk).
- **Demand is a correspondence.** Linear preferences return a segment at p = MRS. The solver scans log-price on 2,000 points, bisects every sign change of the gap between 0 and the excess-demand interval, and checks the kink prices of linear agents exactly; it reports *all* equilibria. Animated tâtonnement never decides anything: when it gets close, the display snaps to the solver's answer.
- **Contract curve** is computed generically as argmax U_B s.t. U_A ≥ ū over a sweep of ū (grid + golden section, with kinks added). This gets the edge pieces right without special cases; tests check both pieces of the first preset against closed forms, and the UPF against U_B = 144 − 4U_A and (48 − U_A)²/12.
- **Utility families**: Cobb–Douglas x^a y^b (general exponents, so XY is literally XY), perfect substitutes, Leontief, and quasi-linear y + v·ln(1 + x) (the ln(1 + x) keeps utility finite at x = 0 and allows corners).
- **Animation in the market square** uses provisional, recontractable trades: at each price the long side is rationed pro rata. Every holding stays on its farmer's budget line, the allocation is always feasible, and at the equilibrium price nobody is rationed, so the holdings become exactly the solver's equilibrium. A short "stalls opening" ramp at the start is purely visual.
- **Tax wedge**: a per-ton tax on milk traded, paid by buyers; revenue is rebated lump-sum, equally, found by fixed-point iteration. Farmers choose on the kinked budget set (buy at p + τ, sell at p, or stay put).
- **Deadweight loss with n farmers** is Allais' surplus: holding everyone at their taxed utility, the Benz that could be saved by reallocating efficiently at a common price, Σ_i e_i(p, u_i) vs the economy's value. It is exactly 0 at a Pareto-efficient allocation (tested) and grows with τ. The Marshallian triangle is shown only where it is exact (quasi-linear settings in §6).
- **W** is Atkinson's family scaled as W = n · EDE, so the slider runs continuously from utilitarian (ε = 0, sum) to Rawlsian (ε = ∞, n · min); the slider's last notch is exactly Rawls. W depends on the cardinalisation of utility; the app says so where it matters (the first preset's utilities have very different scales).
- **Leaky bucket**: u(c) = √c, incomes 100 and 20; the leak applies in whichever direction money moves.
- **Production** uses decreasing-returns Cobb–Douglas firms (same exponents within an industry, different TFP), so the split between the two firms matters and "MP equal within industry" is a real condition. Milk is labour-intensive, Benz capital-intensive, so the production contract curve is not the diagonal. The "let the markets run" button computes the competitive equilibrium in which consumer A owns a share θ of everything; tests check all three conditions hold there and that MRT equals the PPF's slope.
- **3D box** is restricted to Cobb–Douglas with exponents summing to 1: the contract curve then has a closed form (one competitive equilibrium per split of value), and the equilibrium from an endowment is a 1-D fixed point. Linear or Leontief preferences in 3D would make the efficient set thick or kinked, at the cost of the "still a curve" lesson.
- **Externalities**: abatement is capped at each firm's emissions, so the aggregated SMC kinks (at P = 160 and 480 for the default firms). Prices vs quantities uses general linear formulas with errors δ_c and δ_b; DWL = ½(m + n)(miss)². Tested with the default numbers, a case where the tax has DWL > 0, and both Weitzman directions.
- **Coase** with N lake users: when the dairy holds the right, users pay voluntarily and each pays only for its own share of damage (Nash: MB = MD/N), so the cut-back falls short as N grows. When users hold the right, each can veto; a "hold-out" share per user makes the deal fail once N × share ≥ 1. Transaction costs are per contract (N of them) and paid by the initiating side. A deliberately simple model; it shows the mechanisms, not their magnitudes.
- **Public goods, lying**: "lying" means misreporting under the stated rule while others are truthful. Under the average rule with even shares, the keen resident should exaggerate (request 16 instead of 12 to get 8 instead of 6). Under 8 ± x, she should understate (report a lower intercept, about 17 instead of 20, to get Q = 6 at a lower price). The other rooms assume sincere requests.
- **Unanimity (MC/2 ± x)**: the "high demander" is whoever requests more at the even share, not whoever's demand curve reaches further out.
- **Crowd-out regression** simulation: hidden taste θ raises private spending (δ) and, through politics, public spending (γ); an optional reverse channel makes councils subsidise where latent private spending is low. Taste bias pushes b̂₁ towards 0 (underestimated crowd-out), reverse causality makes it more negative. Both are tested.

## Exam room
- **Scoring** applies one rule literally to every MC question, single-choice included: 3 minus the number of mismatched options, floor 0. A wrong single choice therefore scores 1 and a blank 2. The instructor may grade single-choice questions all-or-nothing; the scoring page says so.
- Short questions are self-graded against a rubric. Long questions check numbers automatically (fractions such as 2/3 accepted; tolerance about 0.2%), and text parts are self-graded.
- **"A new paper"** combines the 17 new MC questions (cycled to 12), the new short questions, and three generated long questions (DiD, public good, polluters). **"Fresh numbers"** offers ten generators (consumer choice, exchange, Coase, public good, voluntary contribution, two polluters, prices vs quantities, polluting market, subsidy DWL, DiD); there is no generator for production — §5 is the thinnest lab, as the brief allowed — every generator retries random parameters until the answers are clean fractions and computes every answer with the engine. Tests run each generator over 25 seeds.

## Theme
- Farmers: Agnes (A) and Bruno (B) in the box; the market square uses an alphabetical roster (Agnes, Bruno, Clara, …). Public-good residents: Greta and Hugo (Ann and Ben under the exam lens). Firms: Hilltop and Lakeside Dairy, Plant Nord and Plant Süd. Towns: Obermilch and Untermilch. No character is named after a real person.
- One accent colour (vermilion, #b8432c) for prices, equilibria, the contract curve and DWL. Person A is graphite, person B steel.
- No dark mode: it is a desktop study notebook, designed as a printed page.
- The exam lens is global (bottom of the sidebar and top right of each lab): it renames goods and people into the course's notation.

## Git
- The `material/` folder (course materials) is git-ignored and stays local. No question, number or answer from the course's exam paper is in the repository: the bank holds only original questions, and the labs' worked examples use their own numbers.

## Predictions
- Where a lab asks you to commit to a prediction (the box's settling point, the regulator's DWL, the town's mechanism, the DiD sign), the result it is about stays hidden until you commit, with a "show them now" link for when you just want to look. Predictions are remembered in the browser; nothing is scored.
