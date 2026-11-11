import { PageHead } from '../App';
import { Lemma, TeX } from '../ui/kit';

const MAP: [string, string, string, string][] = [
  ['farmer', '§1', 'One farmer', 'Preferences, budgets, MRS = price ratio, corners. Which assumptions break the model, and which only look as if they should.'],
  ['box', '§2', 'The Edgeworth box', 'Two farmers, one box. The lens, the contract curve with its edges, the price line, both welfare theorems, the utility frontier.'],
  ['chalk', '§3a', 'Three goods', 'Chalk enters. The box becomes a cube, tangency becomes parallel gradients, the contract curve still a curve.'],
  ['square', '§3b', 'The market square', 'N farmers. The box dies; the condition survives. Watch the needles align, then drive a tax into it.'],
  ['society', '§4', 'Society', 'Utility bars, W in front of you, inequality aversion from Bentham to Rawls, the leaky bucket.'],
  ['production', '§5', 'Production', 'Labour, capital, two firms per industry, the PPF and the three efficiency conditions.'],
  ['lake', '§6', 'The lake', 'Manure in the lake: SMC vs PMC, two polluters and four instruments, the regulator who is wrong, Coase, and what an externality is not.'],
  ['road', '§7', 'The Milchstraße', 'Vertical summation, free-riding, the average-rule mechanism, crowd-out, Lindahl shares, and the lie that pays.'],
  ['evidence', '§8', 'Evidence', 'Difference-in-differences with bendable trends; the crowd-out regression with a hidden taste.'],
  ['exam', '§9', 'The exam room', 'Exam-style questions with a scoring rule, fresh numbers on demand, and a list of what to revisit.'],
];

export default function Home() {
  return (
    <div>
      <PageHead num="0" title="Prologue" />
      <div className="cols-wide">
        <div>
          <p className="lede" style={{ fontSize: 18 }}>
            A small guild of logicians loves two things: milk and Mercedes-Benz cars. Logic pays nothing. They therefore reasoned: become dairy farmers;
            then we have milk, and we can sell milk for money, and money buys Benz.
          </p>
          <Lemma tag="Proof sketch">
            Milk ⟹ money ⟹ Benz. <span className="muted">The middle step will take up the rest of this notebook.</span>
          </Lemma>
          <p>
            There is no society here over and above the farmers. Each one has a utility function, an endowment of milk and Benz, and sometimes a
            technology. Everything else is computed from them:
          </p>
          <ul>
            <li>market demand is individual demands added up;</li>
            <li>a price is a number that moves until those individual plans fit together;</li>
            <li>
              social welfare is a function <TeX>{'W(U_1,\\dots,U_n)'}</TeX> of individual utilities and nothing else;
            </li>
            <li>“efficient” means no one can be made better off without hurting someone else;</li>
            <li>
              “fair” is a choice about the shape of <TeX>W</TeX>.
            </li>
          </ul>
          <p>
            The town council enters in exactly two ways: where the price mechanism computes the wrong answer (the lake, the road), and where it
            computes an efficient answer that <TeX>W</TeX> dislikes.
          </p>
          <Lemma tag="House rule" quiet>
            Nothing on screen exists at the aggregate level unless it can be taken apart. Click a market demand curve, an SMB, an SMC or a{' '}
            <TeX>W</TeX>, and it separates into the individuals it was built from.
          </Lemma>
          <p className="aside">
            Units: milk in tons (t), Benz in cars. A price <TeX>p</TeX> is Benz per ton of milk. The exam lens (bottom left) swaps the costume for
            the course’s notation throughout.
          </p>
        </div>
        <div className="card">
          <h4>The notebook</h4>
          {MAP.map(([r, n, t, d]) => (
            <a key={r} href={'#/' + r} style={{ display: 'block', color: 'inherit', padding: '7px 0', borderBottom: '1px solid var(--rule)' }}>
              <span className="mono" style={{ color: 'var(--accent)', marginRight: 8 }}>
                {n}
              </span>
              <b style={{ fontWeight: 600 }}>{t}</b>
              <div className="small muted">{d}</div>
            </a>
          ))}
          <p className="aside small" style={{ marginTop: 10 }}>
            Suggested route for the exam: §2 → §3b → §6 → §7 → §9, with §4 and §8 in between. But the route is yours.
          </p>
        </div>
      </div>
    </div>
  );
}
