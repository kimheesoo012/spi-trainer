import { makeRng, randomSeed } from '../core/rng';
import type { Difficulty, Exam, Question } from '../core/types';
import { TYPES, typeById } from '../data/catalog';
import { bankItemsFor, bankQuestion } from '../data/bank';
import { generate, hasGenerator } from '../gen/registry';
import { localDay, type Attempt, type Mistake, type Mode, type Session, type SessionItem } from './model';

// ---------------------------------------------------------------- 採点・記録

export function isCorrect(s: Session, i: number): boolean {
  return s.answers[i] !== null && s.answers[i] === s.items[i].q.answer;
}

export function attemptFor(s: Session, i: number, now: number): Attempt {
  const it = s.items[i];
  const a = s.answers[i];
  return {
    id: `${s.id}:${i}`,
    sessionId: s.id,
    qid: it.q.id,
    typeId: it.q.typeId,
    exam: it.q.exam,
    difficulty: it.q.difficulty,
    kind: it.kind,
    parentQid: it.parentQid,
    correct: isCorrect(s, i),
    chosenText: a === null ? null : it.q.choices[a],
    timeMs: Math.round(s.times[i] ?? 0),
    mode: s.mode,
    ts: now,
    day: localDay(now),
  };
}

/** 復習から外す条件: 同じ問題で2回連続正解 + (生成問題なら)新しい数値の問題で1回正解 */
export function isMastered(m: Mistake): boolean {
  const needVariant = m.question.source === 'gen';
  return m.sameStreak >= 2 && (!needVariant || m.variantCleared);
}

/**
 * 解答1件を間違いリストに反映する。純粋関数(新しい Mistake を返す。変更なしなら null)。
 * 同じ attempt を2回渡さないこと(呼び出し側で attempt.id の重複を防ぐ)。
 */
export function applyAttempt(mistakes: Map<string, Mistake>, a: Attempt, q: Question): Mistake | null {
  const now = a.ts;
  if (a.kind === 'variant') {
    const m = a.parentQid ? mistakes.get(a.parentQid) : undefined;
    if (!m || m.cleared) return null;
    const next = { ...m, variantTries: m.variantTries + 1, variantCleared: m.variantCleared || a.correct, updatedAt: now };
    return finish(next, now);
  }
  const key = a.kind === 'retry_same' && a.parentQid ? a.parentQid : a.qid;
  const m = mistakes.get(key);
  if (a.correct) {
    if (!m || m.cleared) return null;
    const next = { ...m, sameStreak: m.sameStreak + 1, sameTries: m.sameTries + (a.kind === 'retry_same' ? 1 : 0), updatedAt: now };
    return finish(next, now);
  }
  if (!m || m.cleared) {
    return {
      qid: key,
      typeId: q.typeId,
      difficulty: q.difficulty,
      question: q,
      wrongCount: (m?.wrongCount ?? 0) + 1,
      firstWrongAt: m?.firstWrongAt ?? now,
      lastWrongAt: now,
      sameStreak: 0,
      sameTries: a.kind === 'retry_same' ? 1 : 0,
      variantCleared: false,
      variantTries: 0,
      cleared: false,
      updatedAt: now,
    };
  }
  return { ...m, wrongCount: m.wrongCount + 1, lastWrongAt: now, sameStreak: 0, sameTries: m.sameTries + (a.kind === 'retry_same' ? 1 : 0), updatedAt: now };
}

function finish(m: Mistake, now: number): Mistake {
  if (!m.cleared && isMastered(m)) return { ...m, cleared: true, clearedAt: now };
  return m;
}

// ---------------------------------------------------------------- 統計

export interface TypeStat {
  typeId: string;
  n: number;
  correct: number;
  rate: number;
  avgMs: number;
}

export function typeStats(attempts: Attempt[]): TypeStat[] {
  const m = new Map<string, { n: number; c: number; t: number }>();
  for (const a of attempts) {
    const s = m.get(a.typeId) ?? { n: 0, c: 0, t: 0 };
    s.n++;
    if (a.correct) s.c++;
    s.t += a.timeMs;
    m.set(a.typeId, s);
  }
  return [...m.entries()].map(([typeId, s]) => ({ typeId, n: s.n, correct: s.c, rate: s.c / s.n, avgMs: s.t / s.n }));
}

/** 正答率の低い順に3つ(3問以上解いた型だけ) */
export function weakest(stats: TypeStat[], k = 3): TypeStat[] {
  return stats
    .filter((s) => s.n >= 3)
    .sort((a, b) => a.rate - b.rate || b.n - a.n)
    .slice(0, k);
}

export interface DaySummary {
  day: string;
  n: number;
  correct: number;
  timeMs: number;
  byType: TypeStat[];
}

export function daySummary(attempts: Attempt[], day: string): DaySummary {
  const list = attempts.filter((a) => a.day === day);
  return {
    day,
    n: list.length,
    correct: list.filter((a) => a.correct).length,
    timeMs: list.reduce((s, a) => s + a.timeMs, 0),
    byType: typeStats(list),
  };
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h) return `${h}時間${m}分`;
  if (m) return `${m}分${sec}秒`;
  return `${sec}秒`;
}

const pct = (r: number) => `${Math.round(r * 100)}%`;

export function summaryText(attempts: Attempt[], day: string, openMistakes: number, extra: { streak: number; level: number; xp: number; xpToday: number; goal: number } | null = null): string {
  const d = daySummary(attempts, day);
  const all = typeStats(attempts);
  const weak = weakest(all);
  const lines = [
    `【SPI・玉手箱 練習記録】${day}`,
    `解いた問題: ${d.n}問 / 正解: ${d.correct}問${d.n ? `(${pct(d.correct / d.n)})` : ''}${extra ? `(目標${extra.goal}問${d.n >= extra.goal ? ' 達成' : ''})` : ''}`,
    `学習時間: ${fmtDuration(d.timeMs)}`,
  ];
  if (extra) lines.push(`連続学習: ${extra.streak}日 / Lv.${extra.level}(累計${extra.xp}XP、今日+${extra.xpToday}XP)`);
  if (d.byType.length) {
    lines.push('今日の分野別:');
    for (const s of d.byType) lines.push(`・${typeById(s.typeId)?.name ?? s.typeId}: ${s.correct}/${s.n}(${pct(s.rate)})平均${(s.avgMs / 1000).toFixed(0)}秒`);
  }
  if (weak.length) lines.push(`苦手な分野(累計): ${weak.map((w) => `${typeById(w.typeId)?.name}(${pct(w.rate)})`).join('、')}`);
  lines.push(`復習待ちの問題: ${openMistakes}問`);
  return lines.join('\n');
}

// ---------------------------------------------------------------- 出題

/** 選択肢の順番だけを並べ替えた同じ問題 */
export function reshuffle(q: Question, seed: number): Question {
  const rng = makeRng(seed);
  const order = rng.shuffle([0, 1, 2, 3]);
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}

function newId(): string {
  return `${Date.now().toString(36)}${randomSeed().toString(36)}`;
}

export interface SessionOpts {
  mode: Mode;
  label: string;
  items: SessionItem[];
  practiceSecFor: (typeId: string) => number;
}

export function makeSession(o: SessionOpts, now = Date.now()): Session {
  const n = o.items.length;
  const totalSec = o.items.reduce((s, it) => s + o.practiceSecFor(it.q.typeId), 0);
  return {
    id: newId(),
    createdAt: now,
    mode: o.mode,
    label: o.label,
    items: o.items,
    answers: Array(n).fill(null),
    times: Array(n).fill(0),
    revealed: Array(n).fill(false),
    index: 0,
    limitMs: o.mode === 'exam' ? totalSec * 1000 : undefined,
    perQMs: o.mode === 'speed' ? o.practiceSecFor(o.items[0]?.q.typeId) * 1000 : undefined,
    elapsedMs: 0,
    status: 'active',
  };
}

/** 1つの型から count 問。difficulty 0 はミックス */
export function questionsForType(typeId: string, difficulty: Difficulty | 0, count: number, avoid: Set<string> = new Set()): Question[] {
  const out: Question[] = [];
  const pickDiff = (i: number): Difficulty => (difficulty === 0 ? (((i % 3) + 1) as Difficulty) : difficulty);
  if (hasGenerator(typeId)) {
    const seen = new Set<string>();
    for (let i = 0; out.length < count && i < count * 5; i++) {
      const q = generate(typeId, pickDiff(i), randomSeed());
      // 同じ回の中で同じ文面が続かないようにする
      if (seen.has(q.question_ja)) continue;
      seen.add(q.question_ja);
      out.push(q);
    }
    return out;
  }
  const pool = makeRng(randomSeed()).shuffle(bankItemsFor(typeId, difficulty === 0 ? undefined : difficulty));
  // まだ解いていない問題を優先
  pool.sort((a, b) => Number(avoid.has(`b:${a.id}`)) - Number(avoid.has(`b:${b.id}`)));
  for (const it of pool.slice(0, count)) out.push(bankQuestion(it, randomSeed()));
  return out;
}

/** おまかせ: 正答率の低い型ほど多く出す */
export function omakase(exam: Exam, attempts: Attempt[], count: number): Question[] {
  const stats = new Map(typeStats(attempts.filter((a) => a.exam === exam)).map((s) => [s.typeId, s]));
  const types = TYPES.filter((t) => t.exam === exam && (t.kind === 'gen' || bankItemsFor(t.id).length > 0));
  const weight = (id: string) => {
    const s = stats.get(id);
    if (!s) return 0.7; // まだ解いていない型
    const smoothed = (s.correct + 1) / (s.n + 2);
    return Math.max(0.1, 1 - smoothed);
  };
  const rng = makeRng(randomSeed());
  const seenIds = new Set(attempts.map((a) => a.qid));
  const out: Question[] = [];
  for (let k = 0; out.length < count && k < count * 4; k++) {
    const total = types.reduce((s, t) => s + weight(t.id), 0);
    let r = rng.next() * total;
    let pick = types[0];
    for (const t of types) {
      r -= weight(t.id);
      if (r <= 0) {
        pick = t;
        break;
      }
    }
    const s = stats.get(pick.id);
    const diff: Difficulty = !s ? 1 : s.rate >= 0.8 ? 3 : s.rate >= 0.5 ? 2 : 1;
    const qs = questionsForType(pick.id, pick.kind === 'gen' ? diff : 0, 1, seenIds);
    const q = qs[0];
    if (!q || out.some((x) => x.id === q.id)) continue;
    out.push(q);
  }
  return out;
}

export type ReviewPlan = 'both' | 'same' | 'variant';

/** 間違えた問題の復習セット。同じ問題(選択肢の順番は入れ替える)と新しい数値の問題を区別して入れる */
export function reviewItems(mistakes: Mistake[], plan: ReviewPlan, limit: number): SessionItem[] {
  const open = mistakes.filter((m) => !m.cleared).sort((a, b) => a.updatedAt - b.updatedAt);
  const items: SessionItem[] = [];
  for (const m of open) {
    if (items.length >= limit) break;
    if (plan !== 'variant' && m.sameStreak < 2) items.push({ q: reshuffle(m.question, randomSeed()), kind: 'retry_same', parentQid: m.qid });
    if (items.length >= limit) break;
    if (plan !== 'same' && m.question.source === 'gen' && !m.variantCleared) {
      const tpl = String(m.question.gen?.params.template ?? '');
      let v: Question | null = null;
      for (let i = 0; i < 5 && !v; i++) {
        try {
          const cand = generate(m.typeId, m.difficulty, randomSeed(), tpl || undefined);
          if (cand.question_ja !== m.question.question_ja) v = cand;
        } catch {
          /* テンプレートが出ないシードは飛ばす */
        }
      }
      if (v) items.push({ q: v, kind: 'variant', parentQid: m.qid });
    }
  }
  return items;
}

export function modeLabel(m: Mode): string {
  return m === 'study' ? '学習モード' : m === 'exam' ? '実戦モード' : '1問ごと制限';
}
