import type { Exam } from '../core/types';
import { FOUR_CHOICE_NOTE, TYPES } from '../data/catalog';
import { verifiedCount } from '../data/bank';
import { daySummary, fmtDuration, typeStats } from '../store/logic';
import { allMastery, dayCells, levelOf, streakOf, totalXp } from '../store/progress';
import { localDay } from '../store/model';
import { updateSettings, useStore } from '../store/state';
import type { Nav } from '../App';
import { Top } from './common';
import { GoalRing, LevelBar, MasteryBar, StreakBadge, WeekDots } from './Progress';

export function Home({ nav }: { nav: Nav }) {
  const st = useStore();
  const exam = st.settings.lastExam;
  const attempts = [...st.attempts.values()];
  const todayKey = localDay(Date.now());
  const today = daySummary(attempts, todayKey);
  const stats = new Map(typeStats(attempts).map((s) => [s.typeId, s]));
  const goal = st.settings.dailyGoal;
  const streak = streakOf(attempts, todayKey);
  const xp = totalXp(attempts, st.mistakes.values());
  const lv = levelOf(xp);
  const week = dayCells(attempts, todayKey, 7, goal);
  const mastery = allMastery(attempts);
  const remain = Math.max(0, goal - today.n);
  const openMistakes = [...st.mistakes.values()].filter((m) => !m.cleared).length;
  const sections = [...new Set(TYPES.filter((t) => t.exam === exam).map((t) => t.section))];

  return (
    <>
      <Top
        title="SPI・玉手箱 練習帳"
        right={
          <button className="icon-btn" onClick={() => nav({ name: 'settings' })} aria-label="設定">
            ⚙
          </button>
        }
      />
      <main>
        {st.active && (
          <div className="card stack">
            <div>
              <b>解きかけの問題があります</b>
              <div className="small muted">
                {st.active.label}・{st.active.index + 1}/{st.active.items.length}問目
              </div>
            </div>
            <button className="btn primary block" onClick={() => nav({ name: 'quiz' })}>
              続きから解く
            </button>
          </div>
        )}

        <button className="card hero" style={{ border: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit' }} onClick={() => nav({ name: 'stats' })} aria-label="今日の進み具合。タップで記録を見る">
          <GoalRing n={today.n} goal={goal} />
          <div className="stack" style={{ gap: 4, minWidth: 0 }}>
            <StreakBadge s={streak} />
            <div className="small">
              {today.n >= goal ? (
                <span style={{ color: 'var(--ok)', fontWeight: 700 }}>今日の目標 {goal}問を達成!</span>
              ) : streak.atRisk ? (
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>今日まだ解いていません。1問で連続記録が続きます</span>
              ) : (
                <span className="muted">目標まであと{remain}問・学習時間 {fmtDuration(today.timeMs)}</span>
              )}
            </div>
          </div>
          <LevelBar lv={lv} xp={xp} />
          <WeekDots cells={week} today={todayKey} />
        </button>

        <div className="seg" role="group" aria-label="検査の種類">
          {(['SPI', 'SHL'] as Exam[]).map((e) => (
            <button key={e} aria-pressed={exam === e} onClick={() => updateSettings({ lastExam: e })}>
              {e === 'SPI' ? 'SPI' : '玉手箱・SHL系'}
            </button>
          ))}
        </div>

        <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <button className="btn primary" onClick={() => nav({ name: 'omakase', exam })}>
            おまかせ
            <div className="tiny" style={{ fontWeight: 400 }}>苦手な分野を多めに</div>
          </button>
          <button className="btn" onClick={() => nav({ name: 'review' })}>
            間違えた問題
            <div className="tiny muted" style={{ fontWeight: 400 }}>
              復習待ち {openMistakes}問
            </div>
          </button>
        </div>

        {sections.map((sec) => (
          <section key={sec} className="stack">
            <div className="section-label">{sec}</div>
            <div className="type-list">
              {TYPES.filter((t) => t.exam === exam && t.section === sec).map((t) => {
                const s = stats.get(t.id);
                const cnt = t.kind === 'bank' ? verifiedCount(t.id) : 0;
                return (
                  <button key={t.id} className="type-row" onClick={() => nav({ name: 'setup', typeId: t.id })} disabled={t.kind === 'bank' && cnt === 0}>
                    <span className="name">
                      {t.name}
                      <div className="tiny muted" style={{ fontWeight: 400 }}>
                        {t.test_name === 'SPI3' ? 'SPI3 類似' : `${t.test_name} 類似`}
                      </div>
                    </span>
                    <span className="meta">
                      {t.kind === 'gen' ? <span className="badge accent">自動生成</span> : <span className="badge">検証済み {cnt}問</span>}
                      {s ? <MasteryBar m={mastery.get(t.id)!} compact /> : <span className="rate">未習</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="tiny muted" style={{ margin: 0 }}>
          {FOUR_CHOICE_NOTE}
          <br />
          分野の横のバーは実力の目安(最近の正答と難易度から計算)。<button className="btn ghost" style={{ minHeight: 0, padding: 0, border: 0, color: 'var(--accent)', fontWeight: 400 }} onClick={() => nav({ name: 'about' })}>このアプリについて・試験情報の出典</button>
        </p>
      </main>
    </>
  );
}
