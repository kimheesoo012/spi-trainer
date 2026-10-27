import type { ReactNode } from 'react';
import { typeById } from '../data/catalog';
import type { Badge, DayCell, LevelInfo, Mastery, Streak } from '../store/progress';

/** 今日の目標に対する進み具合の輪 */
export function GoalRing({ n, goal, size = 72 }: { n: number; goal: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const ratio = Math.min(1, goal ? n / goal : 0);
  const done = n >= goal;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`今日 ${n}問 / 目標 ${goal}問`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? 'var(--ok)' : 'var(--accent)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <b className="num">{n}</b>
        <span className="tiny muted">/{goal}</span>
      </div>
    </div>
  );
}

export function StreakBadge({ s }: { s: Streak }) {
  return (
    <div className={`streak ${s.todayDone ? 'on' : s.atRisk ? 'risk' : ''}`} aria-label={`連続 ${s.current}日`}>
      <span className="flame" aria-hidden="true">
        {s.todayDone ? '🔥' : '🕯'}
      </span>
      <span>
        <b className="num">{s.current}</b>
        <span className="small">日連続</span>
      </span>
    </div>
  );
}

export function LevelBar({ lv, xp }: { lv: LevelInfo; xp: number }) {
  return (
    <div className="lvl">
      <div className="row" style={{ justifyContent: 'space-between', gap: 6 }}>
        <span>
          <b>Lv.{lv.level}</b> <span className="small muted">{lv.title}</span>
        </span>
        <span className="tiny muted num">
          {xp.toLocaleString()} XP・次まで {lv.span - lv.into}
        </span>
      </div>
      <div className="bar" aria-hidden="true">
        <span style={{ width: `${Math.round(lv.ratio * 100)}%` }} />
      </div>
    </div>
  );
}

const WD = ['日', '月', '火', '水', '木', '金', '土'];

/** 直近7日のカレンダー。目標達成は塗り、1問以上は輪、今日は枠 */
export function WeekDots({ cells, today }: { cells: DayCell[]; today: string }) {
  return (
    <div className="week" role="list" aria-label="最近7日の学習">
      {cells.map((c) => {
        const d = new Date(c.day + 'T00:00:00');
        const cls = c.goalMet ? 'met' : c.n > 0 ? 'some' : '';
        return (
          <div key={c.day} role="listitem" className={`wd ${cls} ${c.day === today ? 'today' : ''}`} title={`${c.day}: ${c.n}問`}>
            <span className="tiny muted">{WD[d.getDay()]}</span>
            <span className="dot" aria-hidden="true">
              {c.goalMet ? '✓' : c.n > 0 ? '・' : ''}
            </span>
            <span className="sr-only">
              {c.n}問{c.goalMet ? '(目標達成)' : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 分野の実力(0..100)を小さなバーで */
export function MasteryBar({ m, prev, compact }: { m: Mastery; prev?: Mastery; compact?: boolean }) {
  const diff = prev ? m.score - prev.score : 0;
  return (
    <div className={`mastery ${compact ? 'compact' : ''}`} aria-label={`実力 ${m.label} ${m.score}`}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 6, flexWrap: 'nowrap' }}>
        <span className="tiny">
          {m.label}
          {!compact && m.n > 0 && <span className="muted"> {m.score}</span>}
        </span>
        {diff !== 0 && (
          <span className={`tiny num ${diff > 0 ? 'up' : 'down'}`}>
            {diff > 0 ? '↑' : '↓'}
            {Math.abs(diff)}
          </span>
        )}
      </div>
      <div className="bar">
        <span style={{ width: `${m.score}%` }} />
      </div>
    </div>
  );
}

/** 直近14日の問題数の棒グラフ(1系列)。目標の線を引く */
export function DayChart({ cells, goal }: { cells: DayCell[]; goal: number }) {
  const W = 320;
  const H = 120;
  const padL = 28;
  const padB = 20;
  const padT = 10;
  const max = Math.max(goal, ...cells.map((c) => c.n), 1);
  const nice = Math.ceil((max * 1.2) / 5) * 5; // 目標線が上端に貼り付かないよう少し余裕をとる
  const plotH = H - padB - padT;
  const bw = (W - padL) / cells.length;
  const y = (v: number) => padT + plotH - (v / nice) * plotH;
  const ticks = [0, nice / 2, nice].map((v) => Math.round(v));
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="最近14日に解いた問題数">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--ok)" strokeWidth="1.5" strokeDasharray="4 3" />
        <text x={padL + 3} y={y(goal) - 4 < padT ? y(goal) + 12 : y(goal) - 4} textAnchor="start" fontSize="10" fill="var(--ok)">
          目標 {goal}
        </text>
        {cells.map((c, i) => {
          const h = (c.n / nice) * plotH;
          const x = padL + i * bw + bw * 0.2;
          const d = new Date(c.day + 'T00:00:00');
          const last = i === cells.length - 1;
          return (
            <g key={c.day}>
              <title>{`${c.day}: ${c.n}問(正解${c.correct})`}</title>
              {c.n > 0 && <rect x={x} y={y(c.n)} width={bw * 0.6} height={Math.max(2, h)} rx="3" fill={c.goalMet ? 'var(--accent)' : 'var(--accent-soft)'} stroke={c.goalMet ? 'none' : 'var(--accent)'} strokeWidth="1" />}
              {(i % 2 === 1 || last) && (
                <text x={x + bw * 0.3} y={H - 6} textAnchor="middle" fontSize="10" fill={last ? 'var(--ink)' : 'var(--muted)'} fontWeight={last ? 700 : 400}>
                  {d.getDate()}
                </text>
              )}
              {c.n > 0 && last && (
                <text x={x + bw * 0.3} y={y(c.n) - 3} textAnchor="middle" fontSize="10" fill="var(--ink)">
                  {c.n}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="tiny muted">塗りつぶしは目標達成の日。数字は日付。</figcaption>
    </figure>
  );
}

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <div className="badges" role="list">
      {badges.map((b) => (
        <div key={b.id} role="listitem" className={`bd ${b.earned ? 'on' : ''}`} title={b.desc}>
          <span className="bd-icon" aria-hidden="true">
            {b.icon}
          </span>
          <span className="tiny">{b.name}</span>
          <span className="sr-only">{b.earned ? '獲得済み' : '未獲得'}: {b.desc}</span>
        </div>
      ))}
    </div>
  );
}

export function MasteryList({ cur, prev, onPick }: { cur: Map<string, Mastery>; prev: Map<string, Mastery>; onPick: (typeId: string) => void }) {
  const rows: ReactNode[] = [];
  for (const [id, m] of cur) {
    const t = typeById(id);
    if (!t || m.n === 0) continue;
    rows.push(
      <button key={id} className="mrow" onClick={() => onPick(id)}>
        <span className="small" style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
          {t.name}
          <span className="tiny muted"> {t.exam === 'SPI' ? 'SPI' : 'SHL系'}・{m.n}問</span>
        </span>
        <span style={{ width: 150, flexShrink: 0 }}>
          <MasteryBar m={m} prev={prev.get(id)} />
        </span>
      </button>,
    );
  }
  if (!rows.length) return <p className="small muted" style={{ margin: 0 }}>まだ解いた分野がありません。</p>;
  return <div className="stack" style={{ gap: 6 }}>{rows}</div>;
}
