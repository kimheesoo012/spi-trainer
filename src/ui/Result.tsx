import { useState } from 'react';
import { typeById } from '../data/catalog';
import { countedIndexes, fmtDuration, isCorrect, makeSession, modeLabel, questionsForType } from '../store/logic';
import { mockById, mockSession } from '../store/mock';
import { saveActive, useStore } from '../store/state';
import { sessionGains } from '../store/progress';
import { localDay } from '../store/model';
import type { Nav } from '../App';
import { MathText, pctText, TableView, Top } from './common';
import { ChoiceButtons, Explanation } from './Explanation';
import { ChartView } from './Chart';

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
  const counted = countedIndexes(s);
  const correct = counted.filter((i) => isCorrect(s, i)).length;
  const total = counted.length;
  const timeMs = counted.reduce((a, i) => a + (s.times[i] ?? 0), 0);
  const wrongCount = total - correct;
  const types = [...new Set(s.items.map((it) => it.q.typeId))];
  const gains = total > 0 ? sessionGains([...st.attempts.values()], [...st.mistakes.values()], s.id, st.settings.dailyGoal, localDay(Date.now())) : null;

  const again = () => {
    // 本番セットは、同じセットを新しい問題で作り直す
    const mock = s.mockId ? mockById(s.mockId) : undefined;
    if (mock) {
      saveActive(mockSession(mock, [...st.attempts.values()]));
      nav({ name: 'quiz' });
      return;
    }
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
          {s.mode !== 'study' && total < s.items.length && (
            <div className="small">
              全{s.items.length}問のうち{total}問目まで進みました。見ていない問題は記録していません。
            </div>
          )}
          {wrongCount > 0 && <div className="small muted">間違えた{wrongCount}問は「間違えた問題」に保存しました。</div>}
        </div>

        {gains && (
          <div className="gain" aria-live="polite">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="big num">+{gains.xp} XP</span>
              <span className="small">
                Lv.{gains.levelAfter.level}
                {gains.levelAfter.level > gains.levelBefore.level && <b style={{ color: 'var(--ok)' }}> レベルアップ!</b>}
              </span>
            </div>
            <div className="bar" aria-hidden="true">
              <span style={{ width: `${Math.round(gains.levelAfter.ratio * 100)}%` }} />
            </div>
            <div className="small">
              {gains.goalJustMet ? (
                <span style={{ color: 'var(--ok)', fontWeight: 700 }}>今日の目標 {gains.goal}問を達成! </span>
              ) : gains.todayN < gains.goal ? (
                <span>今日 {gains.todayN}/{gains.goal}問。あと{gains.goal - gains.todayN}問で目標達成。 </span>
              ) : (
                <span>今日 {gains.todayN}問(目標達成済み)。 </span>
              )}
              <span>
                🔥 {gains.streak.current}日連続{gains.streak.current >= 2 && gains.streak.current === gains.streak.best ? '(自己最長)' : ''}
              </span>
            </div>
            {gains.newBadges.length > 0 && (
              <div className="small">
                新しいバッジ: {gains.newBadges.map((b) => `「${b.name}」`).join('')}
              </div>
            )}
          </div>
        )}

        <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          {wrongCount > 0 ? (
            <button className="btn primary" onClick={() => nav({ name: 'review' })}>
              間違えた問題だけ
            </button>
          ) : (
            <span />
          )}
          <button className="btn" onClick={again}>
            {s.mockId ? 'セットをもう一度' : '同じ分野でもう一度'}
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
                    {q.charts?.map((c, k) => <ChartView key={k} c={c} />)}
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
