import { useCallback, useEffect, useState } from 'react';
import type { Exam } from './core/types';
import { useStore } from './store/state';
import { Home } from './ui/Home';
import { Setup } from './ui/Setup';
import { Quiz } from './ui/Quiz';
import { Result } from './ui/Result';
import { Review } from './ui/Review';
import { Stats } from './ui/Stats';
import { Settings } from './ui/Settings';
import { About } from './ui/About';

export type Route =
  | { name: 'home' }
  | { name: 'setup'; typeId: string }
  | { name: 'omakase'; exam: Exam }
  | { name: 'quiz' }
  | { name: 'result' }
  | { name: 'review' }
  | { name: 'stats' }
  | { name: 'settings' }
  | { name: 'about' };
export type Nav = (r: Route) => void;

export function App() {
  const st = useStore();
  // 進行中の問題があれば、開いたときにそのまま続きを表示する
  const [route, setRoute] = useState<Route>(() => (st.active ? { name: 'quiz' } : { name: 'home' }));
  const nav = useCallback<Nav>((r) => {
    setRoute(r);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (st.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', st.settings.theme);
  }, [st.settings.theme]);

  let screen;
  switch (route.name) {
    case 'home':
      screen = <Home nav={nav} />;
      break;
    case 'setup':
      screen = <Setup key={route.typeId} nav={nav} typeId={route.typeId} />;
      break;
    case 'omakase':
      screen = <Setup key={`o-${route.exam}`} nav={nav} exam={route.exam} />;
      break;
    case 'quiz':
      screen = <Quiz nav={nav} />;
      break;
    case 'result':
      screen = <Result nav={nav} />;
      break;
    case 'review':
      screen = <Review nav={nav} />;
      break;
    case 'stats':
      screen = <Stats nav={nav} />;
      break;
    case 'settings':
      screen = <Settings nav={nav} />;
      break;
    case 'about':
      screen = <About nav={nav} />;
      break;
  }
  return (
    <div className="app">
      {st.saveError && <div className="notice">{st.saveError}</div>}
      {st.backend === 'memory' && <div className="notice">この環境では記録を保存できません(再読み込みで消えます)。</div>}
      {screen}
    </div>
  );
}
