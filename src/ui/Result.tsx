import { useState } from 'react';
import { typeById } from '../data/catalog';
import { fmtDuration, isCorrect, makeSession, modeLabel, questionsForType } from '../store/logic';
import { saveActive, useStore } from '../store/state';
import type { Nav } from '../App';
import { MathText, pctText, TableView, Top } from './common';
import { ChoiceButtons, Explanation } from './Explanation';

export function Result({ nav }: { nav: Nav }) {
  const st = useStore();
  const s = st.last;
  const [open, setOpen] = useState<number | null>(null);
  if (!s) {
    return (
      <>
        <Top title="結果" onBack={() => nav({ name: 'home' })} />
        <main>
          <p>結果はまだありません。</p>
        </main>
      </>
    );
  }
  const counted = s.items.map((_, i) => i).filter((i) => s.mode !== 'study' || s.revealed[i]);
  const correct = counted.filter((i) => isCorrect(s, i)).length;
  const total = counted.length;
  const timeMs = counted.reduce((a, i) => a + (s.times[i] ?? 0), 0);
  const wrongCount = total - correct;
  const types = [...new Set(s.items.map((it) => it.q.typeId))];

  const again = () => {
    // 同じ型・同じ難易度で新しい問題(生成問題は新しい数値)
    const items = s.items.map((it) => {
      const t = typeById(it.q.typeId)!;
      const [q] = questionsForType(t.id, t.kind === 'gen' ? it.q.difficulty : 0, 1);
      return { q: q ?? it.q, kind: 'new' as const };
    });
    saveActive(makeSession({ mode: s.mode, label: s.label, items, practiceSecFor: (id) => typeById(id)?.practiceSec ?? 60 }));
    nav({ name: 'quiz' });
  };

  return (
    <>
      <Top title="結果" onBack={() => nav({ name: 'home' })} />
      <main>
        <div className="card stack">
          <div className="small muted">
            {s.label}・{modeLabel(s.mode)}
          </div>
          <div className="score">
            <b>
              {correct} / {total}
            </b>
            <span>{total ? pctText(correct / total) : ''}</span>
          </div>
          <div className="small">
            所要時間 {fmtDuration(timeMs)}
            {total ? `(1問平均 ${Math.round(timeMs / total / 1000)}秒)` : ''}
          </div>
          {wrongCount > 0 && <div className="small muted">間違えた{wrongCount}問は「間違えた問題」に保存しました。</div>}
        </div>

        <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {wrongCount > 0 ? (
            <button className="btn primary" onClick={() => nav({ name: 'review' })}>
              間違えた問題だけ
            </button>
          ) : (
            <span />
          )}
          <button className="btn" onClick={again}>
            同じ分野でもう一度
          </button>
        </div>

        <section className="stack">
          <h2>1問ずつの結果</h2>
          {s.items.map((it, i) => {
            const isCounted = counted.includes(i);
            const ok = isCorrect(s, i);
            const q = it.q;
            return (
              <div className="res-item" key={i}>
                <button className="res-head" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span className={`mk ${isCounted ? (ok ? 'ok' : 'ng') : ''}`} aria-label={isCounted ? (ok ? '正解' : '不正解') : '未回答'}>
                    {isCounted ? (ok ? '○' : '×') : '−'}
                  </span>
                  <span className="t">
                    {i + 1}. {typeById(q.typeId)?.name}・{q.question_ja.replace(/\n/g, ' ')}
                  </span>
                  <span className="tiny muted num">{Math.round((s.times[i] ?? 0) / 1000)}秒</span>
                </button>
                {open === i && (
                  <div className="res-body">
                    {q.passage_ja && <div className="passage small">{q.passage_ja}</div>}
                    <div className="qtext">
                      <MathText text={q.question_ja} />
                    </div>
                    {q.table && <TableView t={q.table} />}
                    <ChoiceButtons q={q} chosen={s.answers[i]} reveal onChoose={() => {}} />
                    <Explanation q={q} chosen={s.answers[i]} timedOut={s.mode === 'speed' && s.answers[i] === null} />
                  </div>
                )}
              </div>
            );
          })}
        </section>
        <div className="tiny muted">分野: {types.map((t) => typeById(t)?.name).join('、')}</div>
      </main>
    </>
  );
}
