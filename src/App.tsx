import React, { Suspense, lazy, useEffect, useState } from 'react';
import { LensToggle } from './ui/kit';
import { useApp } from './store';
import Home from './labs/Home';

const OneFarmer = lazy(() => import('./labs/OneFarmer'));
const Edgeworth = lazy(() => import('./labs/Edgeworth'));
const ThreeGoods = lazy(() => import('./labs/ThreeGoods'));
const MarketSquare = lazy(() => import('./labs/MarketSquare'));
const Society = lazy(() => import('./labs/Society'));
const Production = lazy(() => import('./labs/Production'));
const Externalities = lazy(() => import('./labs/Externalities'));
const PublicGoods = lazy(() => import('./labs/PublicGoods'));
const Evidence = lazy(() => import('./labs/Evidence'));
const ExamRoom = lazy(() => import('./exam/ExamRoom'));

export const LABS = [
  { route: '', num: '0', title: 'Prologue', group: '' },
  { route: 'farmer', num: '1', title: 'One farmer', group: 'Exchange' },
  { route: 'box', num: '2', title: 'The Edgeworth box', group: 'Exchange' },
  { route: 'chalk', num: '3a', title: 'Three goods', group: 'Exchange' },
  { route: 'square', num: '3b', title: 'The market square', group: 'Exchange' },
  { route: 'society', num: '4', title: 'Society', group: 'Welfare' },
  { route: 'production', num: '5', title: 'Production', group: 'Welfare' },
  { route: 'lake', num: '6', title: 'The lake', group: 'Market failure' },
  { route: 'road', num: '7', title: 'The Milchstraße', group: 'Market failure' },
  { route: 'evidence', num: '8', title: 'Evidence', group: 'Empirics' },
  { route: 'exam', num: '9', title: 'The exam room', group: 'Practice' },
];

function useRoute() {
  const get = () => window.location.hash.replace(/^#\/?/, '');
  const [r, setR] = useState(get());
  useEffect(() => {
    const on = () => setR(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export default function App() {
  const route = useRoute();
  const [head, ...rest] = route.split('/');
  const sub = rest.join('/');
  const mistakes = useApp((s) => s.mistakes.length);
  useEffect(() => {
    document.querySelector('.main')?.scrollTo({ top: 0 });
  }, [head]);
  const page = (() => {
    switch (head) {
      case 'farmer':
        return <OneFarmer />;
      case 'box':
        return <Edgeworth />;
      case 'chalk':
        return <ThreeGoods />;
      case 'square':
        return <MarketSquare />;
      case 'society':
        return <Society />;
      case 'production':
        return <Production />;
      case 'lake':
        return <Externalities sub={sub} />;
      case 'road':
        return <PublicGoods sub={sub} />;
      case 'evidence':
        return <Evidence sub={sub} />;
      case 'exam':
        return <ExamRoom sub={sub} />;
      default:
        return <Home />;
    }
  })();
  let lastGroup = '';
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <h1>
            Milk <span className="amp">&amp;</span> Benz
          </h1>
          <div className="sub">a living model of welfare economics</div>
        </div>
        <nav className="nav">
          {LABS.map((l) => {
            const g = l.group !== lastGroup ? l.group : '';
            lastGroup = l.group;
            return (
              <React.Fragment key={l.route}>
                {g && <div className="group">{g}</div>}
                <a href={'#/' + l.route} className={head === l.route ? 'on' : ''}>
                  <span className="num">§{l.num}</span>
                  <span>
                    {l.title}
                    {l.route === 'exam' && mistakes > 0 && <span className="muted small"> · {mistakes} to revisit</span>}
                  </span>
                </a>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="foot">
          <LensToggle />
          <div className="aside" style={{ marginTop: 8, fontSize: 12.5 }}>
            Swaps milk, Benz and the farmers for X, Y, A and B, and shows how each lab is examined.
          </div>
        </div>
      </aside>
      <main className="main">
        <div className="page">
          <Suspense fallback={<div className="muted">Loading the lab…</div>}>{page}</Suspense>
        </div>
      </main>
    </div>
  );
}

export function PageHead({ num, title, right }: { num: string; title: string; right?: React.ReactNode }) {
  return (
    <div className="page-head">
      <h2>
        <span className="sec">§{num}</span>
        {title}
      </h2>
      <div>{right ?? <LensToggle />}</div>
    </div>
  );
}
