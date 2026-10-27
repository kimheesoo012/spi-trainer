import { useState } from 'react';
import { TYPES, typeById } from '../data/catalog';
import { daySummary, fmtDuration, summaryText, typeStats, weakest } from '../store/logic';
import { localDay } from '../store/model';
import { useStore } from '../store/state';
import type { Nav } from '../App';
import { pctText, Toast, Top, useCopy } from './common';
import { allMastery, badgesOf, dayCells, levelOf, overallMastery, streakOf, totalXp } from '../store/progress';
import { BadgeGrid, DayChart, LevelBar, MasteryList, StreakBadge } from './Progress';

export function Stats({ nav }: { nav: Nav }) {
  const st = useStore();
  const attempts = [...st.attempts.values()];
  const day = localDay(Date.now());
  const today = daySummary(attempts, day);
  const all = typeStats(attempts);
  const weak = weakest(all);
  const openMistakes = [...st.mistakes.values()].filter((m) => !m.cleared).length;
  const { copy, fallback } = useCopy();
  const [toast, setToast] = useState<string | null>(null);
  const order = new Map(TYPES.map((t, i) => [t.id, i]));
  const days = [...new Set(attempts.map((a) => a.day))].sort().reverse().slice(0, 7);
  const goal = st.settings.dailyGoal;
  const streak = streakOf(attempts, day);
  const xp = totalXp(attempts, st.mistakes.values());
  const lv = levelOf(xp);
  const cells14 = dayCells(attempts, day, 14, goal);
  const mastNow = allMastery(attempts);
  const mastWeekAgo = allMastery(attempts, Date.now() - 7 * 86400000);
  const overall = overallMastery(mastNow);
  const overallPrev = overallMastery(mastWeekAgo);
  const badges = badgesOf(attempts, st.mistakes.values(), day);
  const xpToday = cells14[cells14.length - 1]?.xp ?? 0;

  return (
    <>
      <Top title="記録" onBack={() => nav({ name: 'home' })} />
      <main>
        <section className="card stack">
          <h2>今日({day})</h2>
          <div className="today">
            <div>
              <span className="tiny muted">解いた問題</span>
              <b>{today.n}問</b>
            </div>
            <div>
              <span className="tiny muted">学習時間</span>
              <b>{fmtDuration(today.timeMs)}</b>
            </div>
            <div>
              <span className="tiny muted">正答率</span>
              <b>{today.n ? pctText(today.correct / today.n) : '—'}</b>
            </div>
          </div>
          <div className="tiny muted">
            目標 {goal}問{today.n >= goal ? ' 達成' : `(あと${goal - today.n}問)`}。学習時間は問題を解いていた時間の合計(解説を読んでいる時間は含まない)。
          </div>
          <button
            className="btn primary block"
            onClick={async () => {
              const ok = await copy(summaryText(attempts, day, openMistakes, { streak: streak.current, level: lv.level, xp, xpToday, goal }));
              setToast(ok ? '今日の結果をコピーしました' : 'コピーできませんでした。下の文章を選択してコピーしてください');
            }}
          >
            今日の結果をコピー
          </button>
          {fallback && <textarea readOnly value={fallback} id="copy-fallback" onFocus={(e) => e.currentTarget.select()} />}
        </section>

        <section className="card stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <StreakBadge s={streak} />
            <span className="small muted">自己最長 {streak.best}日</span>
          </div>
          <LevelBar lv={lv} xp={xp} />
          <div className="small">
            全体の実力 <b className="num">{overall}</b>
            <span className="muted">/100</span>
            {overall !== overallPrev && (
              <span className={overall > overallPrev ? 'mastery up' : 'mastery down'} style={{ display: 'inline', marginLeft: 6 }}>
                {overall > overallPrev ? '↑' : '↓'}
                {Math.abs(overall - overallPrev)} <span className="tiny muted">(1週間前比)</span>
              </span>
            )}
          </div>
        </section>

        <section className="stack">
          <h2>最近14日</h2>
          <DayChart cells={cells14} goal={goal} />
        </section>

        <section className="stack">
          <h2>分野ごとの実力</h2>
          <div className="tiny muted">最近30問の正答と難易度から計算(★1だけでは約33まで)。矢印は1週間前との差。</div>
          <MasteryList cur={mastNow} prev={mastWeekAgo} onPick={(id) => nav({ name: 'setup', typeId: id })} />
        </section>

        <section className="stack">
          <h2>バッジ({badges.filter((b) => b.earned).length}/{badges.length})</h2>
          <BadgeGrid badges={badges} />
        </section>

        <section className="stack">
          <h2>よく間違える分野(上位3つ)</h2>
          {weak.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              3問以上解いた分野が出てくると表示します。
            </p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: '1.4em' }}>
              {weak.map((w) => (
                <li key={w.typeId}>
                  <button className="btn ghost" style={{ minHeight: 44, padding: '4px 0', border: 0, textAlign: 'left' }} onClick={() => nav({ name: 'setup', typeId: w.typeId })}>
                    {typeById(w.typeId)?.name}({typeById(w.typeId)?.exam === 'SPI' ? 'SPI' : '玉手箱・SHL系'})正答率 {pctText(w.rate)}・{w.n}問 →
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="stack">
          <h2>分野別(累計)</h2>
          {all.length === 0 ? (
            <p className="small muted" style={{ margin: 0 }}>
              まだ記録がありません。
            </p>
          ) : (
            <div className="table-wrap">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>分野</th>
                    <th>問題数</th>
                    <th>正答率</th>
                    <th>平均時間</th>
                  </tr>
                </thead>
                <tbody>
                  {all
                    .sort((a, b) => (order.get(a.typeId) ?? 0) - (order.get(b.typeId) ?? 0))
                    .map((s) => (
                      <tr key={s.typeId}>
                        <td>
                          {typeById(s.typeId)?.name}
                          <div className="bar">
                            <span style={{ width: `${s.rate * 100}%` }} />
                          </div>
                        </td>
                        <td>{s.n}</td>
                        <td>{pctText(s.rate)}</td>
                        <td>{Math.round(s.avgMs / 1000)}秒</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {days.length > 0 && (
          <section className="stack">
            <h2>最近の7日</h2>
            <div className="table-wrap">
              <table className="stat-table">
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>問題数</th>
                    <th>正答率</th>
                    <th>時間</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const x = daySummary(attempts, d);
                    return (
                      <tr key={d}>
                        <td>{d}</td>
                        <td>{x.n}</td>
                        <td>{x.n ? pctText(x.correct / x.n) : '—'}</td>
                        <td>{fmtDuration(x.timeMs)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <p className="tiny muted" style={{ margin: 0 }}>
          1回の解答は1件として記録し、画面を再読み込みしても二重に数えません。間違えた問題の再挑戦・新しい数値の問題も1件ずつ数えます。
        </p>
      </main>
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
