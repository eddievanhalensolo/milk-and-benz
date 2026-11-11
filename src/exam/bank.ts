/**
 * The question bank: original questions in the style of the course exam.
 * Text may contain $…$ (KaTeX) and **bold**.
 *
 * To add a question: append an object to MCQS / SHORTS / LONGS. `correct`
 * lists option indices (0 = A). `lab` is a route (see App.tsx LABS).
 */

export interface MCQ {
  id: string;
  source: 'new';
  stem: string;
  options: string[];
  correct: number[];
  single?: boolean;
  explain: string;
  note?: string; // remark shown beside the question
  lab: string;
}

export interface ShortQ {
  id: string;
  source: 'new';
  points: number;
  prompt: string;
  rubric: { pts: number; text: string }[];
  model: string;
  note?: string;
  lab: string;
}

export interface NumField {
  label: string;
  answer: number;
  tol?: number; // absolute tolerance (default 1e-2 · max(1,|answer|))
}

export interface LongPart {
  label: string;
  points: number;
  prompt: string;
  fields?: NumField[]; // checked automatically
  model: string;
  selfGrade?: boolean; // text parts: grade yourself against the model
}

export interface LongQ {
  id: string;
  source: 'new' | 'generated';
  title: string;
  points: number;
  intro: string;
  parts: LongPart[];
  note?: string;
  lab: string;
}

export const LETTERS = 'ABCDEFGHIJ';

export const MCQS: MCQ[] = [
  {
    id: 'mcn-1',
    source: 'new',
    single: true,
    stem:
      'At an interior allocation, consumer A has $MRS^A_{X,Y} = 1/2$ and consumer B has $MRS^B_{X,Y} = 1$. Which small trade is a Pareto improvement?',
    options: [
      'A gives B ε units of Y for ε units of X.',
      'A gives B ε units of X for 0.75ε units of Y.',
      'A gives B ε units of X for 0.25ε units of Y.',
      'A gives B ε units of X for 1.5ε units of Y.',
    ],
    correct: [1],
    explain:
      'A values X at ½ unit of Y, B at 1. Any rate strictly between ½ and 1 Y per X makes both better off: A sells X for more than it is worth to him, B buys it for less than it is worth to her.',
    lab: 'box',
  },
  {
    id: 'mcn-2',
    source: 'new',
    stem: 'In a two-person exchange economy with monotone preferences, which of the following allocations can be Pareto efficient?',
    options: [
      'An interior allocation with $MRS^A = MRS^B$.',
      'A holds no X and $MRS^A < MRS^B$.',
      'A holds no Y and $MRS^A < MRS^B$.',
      'One person holds everything.',
      'A Leontief consumer sits at the kink of her indifference curve and the other’s MRS lies in the fan of supporting slopes.',
    ],
    correct: [0, 1, 3, 4],
    explain:
      'B: A values X less but has none to give: efficient (Kuhn–Tucker). C: A values X less than B and has X, so selling some X for Y helps both: not efficient. D: nobody can be made better off without taking from the holder. E: tangency becomes "a common supporting line".',
    lab: 'box',
  },
  {
    id: 'mcn-3',
    source: 'new',
    single: true,
    stem: 'The first fundamental theorem of welfare economics states that',
    options: [
      'every competitive equilibrium is Pareto efficient (under perfect competition, no externalities, complete markets).',
      'every Pareto efficient allocation can be supported as a competitive equilibrium.',
      'the competitive equilibrium maximises social welfare.',
      'the competitive equilibrium is fair.',
    ],
    correct: [0],
    explain: 'B is the second theorem (with lump-sum transfers and convexity). C and D confuse efficiency with optimality or equity.',
    lab: 'box',
  },
  {
    id: 'mcn-4',
    source: 'new',
    stem: 'Which statements about the second welfare theorem are correct?',
    options: [
      'With convex preferences, any Pareto efficient allocation can be reached as a competitive equilibrium after suitable lump-sum transfers.',
      'It suggests that, in principle, efficiency and equity can be separated.',
      'Using it requires the government to know enough about preferences and endowments to choose the transfers.',
      'It shows that redistribution through taxes on goods is costless.',
    ],
    correct: [0, 1, 2],
    explain: 'D: taxes on goods distort prices (a wedge, §3b). Only lump-sum transfers are distortion-free, and they are hard to implement.',
    lab: 'box',
  },
  {
    id: 'mcn-5',
    source: 'new',
    stem: 'Which statements about social welfare functions are correct?',
    options: [
      'A utilitarian W is maximised where the sum of utilities is largest.',
      'A Rawlsian W depends only on the utility of the worst-off person.',
      'Every increase in a utilitarian W is a Pareto improvement.',
      'Every Pareto improvement weakly increases any W that is increasing in each $U_i$.',
      'The choice of W is a value judgement.',
    ],
    correct: [0, 1, 3, 4],
    explain: 'C: W can rise while someone loses (a large gain for one, a small loss for another).',
    lab: 'society',
  },
  {
    id: 'mcn-6',
    source: 'new',
    stem: 'Which statements about Pigouvian taxes are NOT correct?',
    options: [
      'The tax should equal the marginal damage at the socially optimal quantity.',
      'The tax should equal the average damage per unit of pollution.',
      'With heterogeneous abatement costs, a uniform tax achieves the least-cost split of whatever total abatement results.',
      'A Pigouvian tax requires the regulator to know each firm’s abatement cost curve.',
      'For efficiency, the tax revenue must be paid to the victims.',
    ],
    correct: [1, 3, 4],
    explain:
      'B: marginal, not average. D: each firm finds its own MC = T; the regulator needs MD (and the aggregate response) but not firm-level costs. E: the revenue is a transfer; efficiency comes from the price.',
    lab: 'lake/polluters',
  },
  {
    id: 'mcn-7',
    source: 'new',
    single: true,
    stem: 'Two firms abate with $MC_A = 3Q_A$ and $MC_B = Q_B$. Each is given permits that force it to abate 20. If permits become tradable,',
    options: ['firm A buys permits from firm B', 'firm B buys permits from firm A', 'no permits are traded', 'it depends on the marginal damage'],
    correct: [0],
    explain: 'At 20 each, $MC_A = 60 > MC_B = 20$. A saves 60 per permit bought, B loses 20 per permit sold; trade until $3Q_A = Q_B$, with $Q_A + Q_B = 40$: $Q_A = 10$, $Q_B = 30$, price 30.',
    lab: 'lake/polluters',
  },
  {
    id: 'mcn-8',
    source: 'new',
    stem: 'Compare tradable permits and a Pigouvian tax. Which statements are correct?',
    options: [
      'Both can achieve the least-cost allocation of abatement across firms.',
      'Permits fix the quantity of pollution; the tax fixes its price.',
      'If the regulator is unsure about abatement costs and marginal damage rises steeply, permits are preferred.',
      'The initial allocation of permits determines how much each firm abates in the end.',
      'Auctioned permits raise revenue just as a tax does.',
    ],
    correct: [0, 1, 2, 4],
    explain: 'D: with trade, abatement settles where every MC equals the permit price, whoever got the permits; the allocation only decides who pays whom.',
    lab: 'lake/polluters',
  },
  {
    id: 'mcn-9',
    source: 'new',
    stem: 'Which of the following are NOT externalities?',
    options: [
      'A new road raises the market price of nearby land.',
      'A bakery’s smell pleases passers-by, who pay nothing for it.',
      'A firm’s entry lowers the profits of the incumbents.',
      'Vaccination lowers other people’s risk of infection.',
      'Second-hand smoke in a restaurant, with no compensation.',
    ],
    correct: [0, 2],
    explain: 'A and C work through prices (pecuniary effects). B, D, E are uncompensated effects on others.',
    lab: 'lake/what',
  },
  {
    id: 'mcn-10',
    source: 'new',
    single: true,
    stem: 'With costless bargaining, moving the property right from the polluter to the victims changes',
    options: ['the efficient quantity of pollution', 'the distribution of income between the parties', 'whether any pollution occurs', 'nothing at all'],
    correct: [1],
    explain: 'Coase: the quantity is the same either way (absent income effects); who pays whom flips.',
    lab: 'lake/coase',
  },
  {
    id: 'mcn-11',
    source: 'new',
    stem: 'Which statements about public goods are correct?',
    options: [
      'The social marginal benefit of a public good is the vertical sum of individual marginal benefits.',
      'Efficient provision requires $\\sum_i MRS_i = MRT$.',
      'Voluntary private contributions lead to over-provision.',
      'Lindahl pricing charges each person her own marginal benefit at the optimal quantity.',
      'Lindahl pricing solves the preference-revelation problem.',
    ],
    correct: [0, 1, 3],
    explain: 'C: under-provision. E: people have an incentive to understate their benefit to lower their personal price (§7, "Lie about your demand").',
    lab: 'road/sum',
  },
  {
    id: 'mcn-12',
    source: 'new',
    single: true,
    stem: 'The government provides 10 units of a public good financed by lump-sum taxes on the contributors, and private provision falls by 10 units. This is',
    options: ['partial crowd-out', 'full crowd-out', 'crowd-in', 'no crowd-out'],
    correct: [1],
    explain: 'Total provision is unchanged: every public unit replaced a private one.',
    lab: 'road/free',
  },
  {
    id: 'mcn-13',
    source: 'new',
    stem: 'About the difference-in-differences estimator, which statements are correct?',
    options: [
      'It requires that, absent the policy, the two groups would have followed parallel trends.',
      'The parallel-trends assumption can be tested directly.',
      'Parallel pre-trends provide supportive evidence for the assumption.',
      'It removes time-invariant differences between the groups.',
      'It removes shocks that hit both groups equally.',
    ],
    correct: [0, 2, 3, 4],
    explain: 'B: the counterfactual is never observed; we can only check pre-trends.',
    lab: 'evidence/did',
  },
  {
    id: 'mcn-14',
    source: 'new',
    single: true,
    stem: 'In the crowd-out regression $P_i = b_0 + b_1 G_i + \\alpha X_i + e_i$ ($P$ private, $G$ government spending), full crowd-out means',
    options: ['$b_1 = 0$', '$b_1 = 1$', '$b_1 = -1$', '$b_1 = \\alpha$'],
    correct: [2],
    explain: 'Each unit of G replaces one unit of P. $b_1 = 0$: no crowd-out.',
    lab: 'evidence/crowdout',
  },
  {
    id: 'mcn-15',
    source: 'new',
    stem: 'For an interior Pareto-efficient allocation in an economy with production, which conditions must hold?',
    options: [
      '$MRTS_{L,K}$ is equal across industries.',
      'Within an industry, every firm has the same marginal product of each input.',
      '$MRS^i_{X,Y} = MRT_{X,Y}$ for every consumer $i$.',
      '$MRT_{X,Y} = MC_X / MC_Y$.',
      'Every firm in an industry produces the same output.',
    ],
    correct: [0, 1, 2, 3],
    explain: 'E: firms with different productivity produce different amounts; what is equalised is the marginal product, not the output.',
    lab: 'production',
  },
  {
    id: 'mcn-16',
    source: 'new',
    stem: 'Which of the following violate the assumptions of the classical consumer model?',
    options: [
      'A bliss point: beyond some amount, more milk makes the farmer worse off.',
      'Tastes that drift with what was consumed last week.',
      'Perfect complements (left and right boots).',
      'Quasi-linear utility.',
      'Marginal utility that grows with consumption (addiction).',
    ],
    correct: [0, 1, 4],
    explain: 'Perfect complements and quasi-linear utility are standard, well-behaved preferences.',
    lab: 'farmer',
  },
  {
    id: 'mcn-17',
    source: 'new',
    single: true,
    stem: 'A Pigouvian tax is preferred to quantity regulation when',
    options: [
      'marginal damage is steep relative to marginal abatement cost',
      'marginal damage is flat relative to marginal abatement cost',
      'the regulator knows the abatement costs exactly',
      'the polluting firms are identical',
    ],
    correct: [1],
    explain: 'With a flat MD, a quantity error costs little but a cost error under a quantity cap can be expensive; the price instrument protects against cost surprises.',
    lab: 'lake/regulator',
  },
];

export const SHORTS: ShortQ[] = [
  {
    id: 'sqn-1',
    source: 'new',
    points: 3,
    prompt: 'TRUE or FALSE and EXPLAIN: If everyone in an economy faces the same prices, the resulting allocation is Pareto efficient.',
    rubric: [
      { pts: 1, text: 'False (as stated).' },
      { pts: 1, text: 'Efficiency needs each person to optimise against those prices and markets to clear (no rationing), so MRS = price ratio for all.' },
      { pts: 1, text: 'And no externalities/market failures; the same price with rationed or non-optimising agents leaves gains from trade.' },
    ],
    model:
      'False. A common price equalises everyone’s MRS only if everyone optimises at that price and the plans are mutually consistent (markets clear). If some are rationed, or the price is not the market-clearing one, unexploited gains from trade remain. Even at equilibrium, externalities or public goods break the link between private optimisation and efficiency.',
    lab: 'square',
  },
  {
    id: 'sqn-2',
    source: 'new',
    points: 3,
    prompt:
      'TRUE or FALSE and EXPLAIN: Every Pareto improvement raises social welfare, and every policy that raises social welfare is a Pareto improvement.',
    rubric: [
      { pts: 1, text: 'False overall.' },
      { pts: 1, text: 'First half: a Pareto improvement weakly raises any W increasing in each $U_i$.' },
      { pts: 1, text: 'Second half fails: W can rise when some lose (e.g. utilitarian W with a large gain to one, a small loss to another).' },
    ],
    model:
      'False. The first half holds for any W that is increasing in each person’s utility: if nobody loses and someone gains, W cannot fall. The converse fails: a utilitarian W rises when one person gains 10 and another loses 1, which is not a Pareto improvement.',
    lab: 'society',
  },
  {
    id: 'sqn-3',
    source: 'new',
    points: 4,
    prompt:
      'Two firms with different abatement costs must reduce pollution. Explain why a uniform emission standard is inefficient, and name two instruments that achieve the least-cost allocation of a given total reduction.',
    rubric: [
      { pts: 1, text: 'Under a uniform standard the firms’ marginal abatement costs differ.' },
      { pts: 1, text: 'Shifting a unit of abatement from the high-MC to the low-MC firm keeps the total and lowers cost.' },
      { pts: 1, text: 'A uniform tax: each firm sets MC = T, so MCs are equal.' },
      { pts: 1, text: 'Tradable permits: trade until each MC equals the permit price.' },
    ],
    model:
      'Least cost requires equal marginal abatement costs. A uniform standard ignores cost differences, so at the standard $MC_A \\neq MC_B$; moving one unit of abatement from the high-cost to the low-cost firm leaves pollution unchanged and lowers total cost by $MC_{high} - MC_{low}$. A uniform Pigouvian tax makes each firm abate until $MC_i = T$; tradable permits make firms trade until $MC_i$ equals the permit price. Both equalise MCs.',
    lab: 'lake/polluters',
  },
  {
    id: 'sqn-4',
    source: 'new',
    points: 3,
    prompt: 'TRUE or FALSE and EXPLAIN: Because the regulator cannot observe firms’ abatement costs, tradable permits guarantee the efficient total amount of pollution.',
    rubric: [
      { pts: 1, text: 'False.' },
      { pts: 1, text: 'Permits guarantee the least-cost split of a given cap without knowing firm costs.' },
      { pts: 1, text: 'But the cap itself must be set at the optimum, which requires knowing MD and the aggregate cost of abatement.' },
    ],
    model:
      'False. Trading ensures that whatever total the cap allows is abated at least cost, without the regulator knowing any firm’s costs. Whether that total is efficient depends on the cap: setting it at the optimum requires knowing the marginal damage and the aggregate marginal cost of abatement. A wrong cap gives a deadweight loss (prices vs quantities).',
    lab: 'lake/regulator',
  },
  {
    id: 'sqn-5',
    source: 'new',
    points: 4,
    prompt: 'Air pollution in a large city comes from many sources and harms millions of residents. Why is a Coasian solution unlikely to work? Give three reasons.',
    rubric: [
      { pts: 1, text: 'Transaction costs: bargaining among millions is prohibitively costly.' },
      { pts: 1, text: 'Free-riding/hold-outs: each victim wants others to pay; each can block a deal.' },
      { pts: 1, text: 'Assigning blame: hard to measure the source, amount and value of damage.' },
      { pts: 1, text: 'Clear statement of what Coase needs (well-defined rights, costless bargaining).' },
    ],
    model:
      'Coase needs well-defined property rights and costless bargaining. (1) With millions of parties, transaction costs are prohibitive. (2) Reducing pollution is a public good among the victims: each prefers that others pay (free-riding), and if the victims hold the right, each can hold out for a larger share. (3) Bargaining requires knowing who causes how much damage and its value, which is hard to measure with many diffuse sources.',
    lab: 'lake/coase',
  },
  {
    id: 'sqn-6',
    source: 'new',
    points: 3,
    prompt: 'State the efficiency condition for a public good and explain why private provision leads to under-provision.',
    rubric: [
      { pts: 1, text: '$\\sum_i MB_i = MC$ (equivalently $\\sum_i MRS_i = MRT$): vertical summation.' },
      { pts: 1, text: 'Each person buys until her own MB = MC, ignoring others’ benefit.' },
      { pts: 1, text: 'Non-excludability lets others free-ride, so total provision falls short.' },
    ],
    model:
      'Efficiency: the sum of everyone’s marginal benefit equals marginal cost, $\\sum_i MB_i(Q) = MC$ (Samuelson; $\\sum MRS = MRT$). Privately, each person stops where her own MB equals the full MC, ignoring the benefit to others; because no one can be excluded, each prefers to free-ride on others’ contributions. Provision stops where the keenest contributor’s MB equals MC, below the efficient level.',
    lab: 'road/free',
  },
];
