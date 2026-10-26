import { useState } from 'react';
import { typeById } from '../data/catalog';
import { makeSession, reviewItems, type ReviewPlan } from '../store/logic';
import type { Mode } from '../store/model';
import { saveActive, useStore } from '../store/state';
import type { Nav } from '../App';
import { Top } from './common';

export function Review({ nav }: { nav: Nav }) {
  const st = useStore();
  const all = [...st.mistakes.values()];
  const open = all.filter((m) => !m.cleared).sort((a, b) => b.lastWrongAt - a.lastWrongAt);
  const cleared = all.filter((m) => m.cleared).length;
  const [plan, setPlan] = useState<ReviewPlan>('both');
  const [mode, setMode] = useState<Mode>('study');
  const [msg, setMsg] = useState<string | null>(null);

  const start = () => {
    const items = reviewItems(open, plan, 20);
    if (!items.length) {
      setMsg(plan === 'variant' ? '新しい数値で確認できる問題(自動生成の分野)がありません。' : '復習する問題がありません。');
      return;
    }
    saveActive(makeSession({ mode, label: '間違えた問題の復習', items, practiceSecFor: (id) => typeById(id)?.practiceSec ?? 60 }));
    nav({ name: 'quiz' });
  };

  return (
    <>
      <Top title="間違えた問題" onBack={() => nav({ name: 'home' })} />
      <main>
        <div className="card small stack" style={{ gap: 6 }}>
          <b>復習リストから外れる条件</b>
          <div>・自動生成の問題: 同じ問題で2回続けて正解し、さらに同じ型の新しい数値の問題で1回正解する</div>
          <div>・直接作成の問題(言語・推論): 同じ問題で2回続けて正解する</div>
          <div className="muted">同じ問題の再挑戦と新しい数値の問題は別々に記録します(答えを覚えただけかどうかを区別するため)。再挑戦では前回の答えと正解は表示せず、選択肢の順番も入れ替えます。</div>
        </div>

        <div className="row">
          <b>復習待ち {open.length}問</b>
          <span className="small muted">(克服済み {cleared}問)</span>
        </div>

        {open.length > 0 && (
          <>
            <fieldset>
              <legend>出し方</legend>
              <div className="seg" role="group">
                {(
                  [
                    ['both', '両方'],
                    ['same', '同じ問題'],
                    ['variant', '新しい数値'],
                  ] as [ReviewPlan, string][]
                ).map(([p, l]) => (
                  <button key={p} aria-pressed={plan === p} onClick={() => setPlan(p)}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>モード</legend>
              <div className="seg" role="group">
                {(
                  [
                    ['study', '学習'],
                    ['exam', '実戦'],
                  ] as [Mode, string][]
                ).map(([m, l]) => (
                  <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            {msg && <div className="notice">{msg}</div>}
            <button className="btn primary block" onClick={start}>
              間違えた問題だけ解く(最大20問)
            </button>

            <div className="type-list">
              {open.map((m) => (
                <div key={m.qid} className="type-row" style={{ cursor: 'default' }}>
                  <span className="name" style={{ fontWeight: 400 }}>
                    <span className="small">
                      <b>{typeById(m.typeId)?.name}</b> ★{m.difficulty}・{m.wrongCount}回まちがい
                    </span>
                    <div className="tiny muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.question.question_ja.replace(/\n/g, ' ')}
                    </div>
                  </span>
                  <span className="meta" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span className="badge">同じ問題 {Math.min(m.sameStreak, 2)}/2</span>
                    {m.question.source === 'gen' && <span className={`badge ${m.variantCleared ? 'accent' : ''}`}>新数値 {m.variantCleared ? '済' : '未'}</span>}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {open.length === 0 && <p className="muted">復習待ちの問題はありません。</p>}
      </main>
    </>
  );
}
