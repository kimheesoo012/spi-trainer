import { useState } from 'react';
import { mockById, mockSession } from '../store/mock';
import { saveActive, useStore } from '../store/state';
import type { Nav } from '../App';
import { Top } from './common';

/** 本番セットの開始画面 */
export function Mock({ nav, id }: { nav: Nav; id: string }) {
  const st = useStore();
  const m = mockById(id);
  const [err, setErr] = useState<string | null>(null);
  if (!m) {
    return (
      <>
        <Top title="本番セット" onBack={() => nav({ name: 'home' })} />
        <main>
          <p>このセットは見つかりません。</p>
        </main>
      </>
    );
  }
  const start = () => {
    const s = mockSession(m, [...st.attempts.values()]);
    if (s.items.length < m.count) {
      setErr('問題が足りないため、このセットを始められません。');
      return;
    }
    saveActive(s);
    nav({ name: 'quiz' });
  };
  return (
    <>
      <Top title="本番セット" onBack={() => nav({ name: 'home' })} />
      <main>
        <div className="stack">
          <h2>{m.name}</h2>
          <div className="small muted" lang="ko">
            {m.name_ko}
          </div>
          <div className="score">
            <b>{m.count}問</b>
            <span>制限時間 {m.minutes}分</span>
          </div>
          <div className="small muted">{m.note}</div>
        </div>
        <ul className="small" style={{ margin: 0, paddingLeft: '1.2em', lineHeight: 1.9 }}>
          <li>前の問題には戻れません。</li>
          <li>解説は、最後にまとめて表示します。</li>
          <li>時間が切れたら、そこまでに見た問題で採点します。</li>
        </ul>
        {err && <div className="notice">{err}</div>}
        <div className="sticky-next">
          <button className="btn primary" onClick={start}>
            始める
          </button>
        </div>
      </main>
    </>
  );
}
