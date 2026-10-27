// 続ける動機づけ: 連続日数・経験値(XP)・レベル・分野ごとの実力・バッジ。
// すべて解答記録(attempts)と復習リスト(mistakes)から計算する。別に保存しないので、
// 書き出し・取り込みしても同じ値に戻り、二重に数えることもない。

import { TYPES } from '../data/catalog';
import { localDay, type Attempt, type Mistake } from './model';

// ------------------------------------------------------------------ XP

/** 1回の解答で得るXP。難しい問題・理解の証明(新しい数値で正解)ほど多い。不正解でも挑戦した分だけ入る */
export function xpOf(a: Attempt): number {
  if (!a.correct) return 2;
  if (a.kind === 'retry_same') return 5; // 同じ問題の再挑戦は覚えている可能性があるので控えめ
  const base = 10 * a.difficulty;
  return a.kind === 'variant' ? base + 5 : base;
}

/** 復習リストから外れた(克服した)問題1つにつき */
export const XP_PER_CLEARED = 20;

export function totalXp(attempts: Iterable<Attempt>, mistakes: Iterable<Mistake>): number {
  let x = 0;
  for (const a of attempts) x += xpOf(a);
  for (const m of mistakes) if (m.cleared) x += XP_PER_CLEARED;
  return x;
}

/** レベル n に到達するのに必要な累計XP。Lv2=100, Lv3=300, Lv4=600, Lv5=1,000 … (1日10問正解で約100XP) */
export const xpForLevel = (n: number) => (50 * (n - 1) * n) | 0;

export interface LevelInfo {
  level: number;
  /** 今のレベルで積んだXP */
  into: number;
  /** 次のレベルまでに必要なXP(このレベルの幅) */
  span: number;
  /** 0..1 */
  ratio: number;
  title: string;
}

const RANKS: [number, string][] = [
  [1, '入門'],
  [3, '基礎'],
  [6, '標準'],
  [10, '応用'],
  [15, '実戦'],
  [20, '達人'],
];

export function levelOf(xp: number): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  let title = RANKS[0][1];
  for (const [l, t] of RANKS) if (level >= l) title = t;
  return { level, into: xp - lo, span: hi - lo, ratio: (xp - lo) / (hi - lo), title };
}

// ------------------------------------------------------------------ 日ごと・連続日数

export function dayOffset(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + delta).getTime());
}

export interface DayCell {
  day: string;
  n: number;
  correct: number;
  xp: number;
  goalMet: boolean;
}

export function dayCells(attempts: Iterable<Attempt>, today: string, days: number, goal: number): DayCell[] {
  const map = new Map<string, DayCell>();
  for (let i = days - 1; i >= 0; i--) {
    const day = dayOffset(today, -i);
    map.set(day, { day, n: 0, correct: 0, xp: 0, goalMet: false });
  }
  for (const a of attempts) {
    const c = map.get(a.day);
    if (!c) continue;
    c.n++;
    if (a.correct) c.correct++;
    c.xp += xpOf(a);
  }
  for (const c of map.values()) c.goalMet = c.n >= goal;
  return [...map.values()];
}

export interface Streak {
  /** 今日を含む(今日まだなら昨日までの)連続学習日数。1問でも解けば続く */
  current: number;
  best: number;
  /** 今日すでに解いたか */
  todayDone: boolean;
  /** 昨日まで続いていて、今日まだ解いていない(今日解かないと途切れる) */
  atRisk: boolean;
}

export function streakOf(attempts: Iterable<Attempt>, today: string): Streak {
  const days = new Set<string>();
  for (const a of attempts) days.add(a.day);
  const todayDone = days.has(today);
  let current = 0;
  let d = todayDone ? today : dayOffset(today, -1);
  while (days.has(d)) {
    current++;
    d = dayOffset(d, -1);
  }
  // 過去最長
  let best = 0;
  const sorted = [...days].sort();
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev && dayOffset(prev, 1) === day ? run + 1 : 1;
    prev = day;
    if (run > best) best = run;
  }
  return { current, best: Math.max(best, current), todayDone, atRisk: !todayDone && current > 0 };
}

// ------------------------------------------------------------------ 分野ごとの実力

export interface Mastery {
  typeId: string;
  /** 0..100。最近の解答ほど重く、難しい問題の正解ほど高い。★1だけ全問正解でも約33までしか上がらない */
  score: number;
  n: number;
  label: string;
}

export const MASTERY_LABELS: [number, string][] = [
  [0, '未習'],
  [1, '入門'],
  [20, '基礎'],
  [40, '標準'],
  [60, '応用'],
  [80, '実戦'],
];

export function masteryLabel(score: number, n: number): string {
  if (n === 0) return MASTERY_LABELS[0][1];
  let label = MASTERY_LABELS[1][1];
  for (const [s, l] of MASTERY_LABELS.slice(1)) if (score >= s) label = l;
  return label;
}

/** 分野ごとの実力。upTo を渡すと、その時刻までの解答だけで計算する(「1週間前との比較」用) */
export function masteryOf(attempts: Iterable<Attempt>, typeId: string, upTo = Infinity): Mastery {
  const list = [...attempts].filter((a) => a.typeId === typeId && a.ts <= upTo).sort((a, b) => b.ts - a.ts).slice(0, 30);
  if (!list.length) return { typeId, score: 0, n: 0, label: masteryLabel(0, 0) };
  let num = 0;
  let den = 0;
  list.forEach((a, i) => {
    const w = Math.pow(0.9, i); // 新しい解答ほど重い
    num += w * (a.correct ? a.difficulty : 0);
    den += w * 3;
  });
  const confidence = Math.min(1, list.length / 6); // 数問だけで高くならないように
  const score = Math.round((num / den) * 100 * confidence);
  return { typeId, score, n: list.length, label: masteryLabel(score, list.length) };
}

export function allMastery(attempts: Iterable<Attempt>, upTo = Infinity): Map<string, Mastery> {
  const arr = [...attempts];
  return new Map(TYPES.map((t) => [t.id, masteryOf(arr, t.id, upTo)]));
}

/** 全体の実力: 解いたことのある分野の平均 */
export function overallMastery(m: Map<string, Mastery>): number {
  const used = [...m.values()].filter((x) => x.n > 0);
  if (!used.length) return 0;
  return Math.round(used.reduce((s, x) => s + x.score, 0) / used.length);
}

// ------------------------------------------------------------------ バッジ

export interface Badge {
  id: string;
  name: string;
  desc: string;
  icon: string;
  earned: boolean;
}

export function badgesOf(attempts: Iterable<Attempt>, mistakes: Iterable<Mistake>, today: string): Badge[] {
  const at = [...attempts];
  const n = at.length;
  const streak = streakOf(at, today);
  const cleared = [...mistakes].filter((m) => m.cleared).length;
  const typesDone = new Set(at.map((a) => a.typeId));
  const bySession = new Map<string, Attempt[]>();
  for (const a of at) bySession.set(a.sessionId, [...(bySession.get(a.sessionId) ?? []), a]);
  const perfect10 = [...bySession.values()].some((s) => s.length >= 10 && s.every((a) => a.correct));
  const hard = at.filter((a) => a.difficulty === 3 && a.correct).length;
  const fast = [...bySession.values()].some(
    (s) => s.length >= 10 && s[0].typeId === 'shisoku' && s.filter((a) => a.correct).length >= s.length * 0.8 && s.reduce((x, a) => x + a.timeMs, 0) / s.length < 10000,
  );
  const b = (id: string, name: string, desc: string, icon: string, earned: boolean): Badge => ({ id, name, desc, icon, earned });
  return [
    b('first', '最初の一歩', '1問解いた', '○', n >= 1),
    b('q50', '50問', '50問解いた', '50', n >= 50),
    b('q200', '200問', '200問解いた', '200', n >= 200),
    b('q1000', '1000問', '1000問解いた', '1k', n >= 1000),
    b('s3', '3日連続', '3日続けて学習した', '3', streak.best >= 3),
    b('s7', '1週間連続', '7日続けて学習した', '7', streak.best >= 7),
    b('s30', '1か月連続', '30日続けて学習した', '30', streak.best >= 30),
    b('c1', '初めての克服', '間違えた問題を1つ克服した', '✓', cleared >= 1),
    b('c10', '10問克服', '間違えた問題を10問克服した', '✓10', cleared >= 10),
    b('hard20', '難問20', '★3の問題に20問正解した', '★3', hard >= 20),
    b('perfect', '全問正解', '10問以上の回で全問正解した', '10/10', perfect10),
    b('fast', 'スピード', '四則逆算10問以上を平均10秒未満・正答率80%以上', '⚡', fast),
    b('all', '全分野', `${TYPES.length}分野すべてを解いた`, '全', typesDone.size >= TYPES.length),
  ];
}

// ------------------------------------------------------------------ 1回の結果に対する動機づけの要約

export interface SessionGains {
  xp: number;
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  streak: Streak;
  todayN: number;
  goal: number;
  /** この回で初めて目標に届いたか */
  goalJustMet: boolean;
  newBadges: Badge[];
}

export function sessionGains(allAttempts: Attempt[], mistakes: Mistake[], sessionId: string, goal: number, today: string): SessionGains {
  const mine = allAttempts.filter((a) => a.sessionId === sessionId);
  const others = allAttempts.filter((a) => a.sessionId !== sessionId);
  const xp = mine.reduce((s, a) => s + xpOf(a), 0);
  // 克服ボーナスはこの回で cleared になったものだけ
  const clearedNow = mistakes.filter((m) => m.cleared && m.clearedAt && mine.some((a) => a.ts === m.clearedAt)).length;
  const xpAfter = totalXp(allAttempts, mistakes);
  const xpBefore = xpAfter - xp - clearedNow * XP_PER_CLEARED;
  const todayN = allAttempts.filter((a) => a.day === today).length;
  const beforeN = others.filter((a) => a.day === today).length;
  const badgesBefore = new Set(
    badgesOf(others, mistakes.filter((m) => !(m.cleared && m.clearedAt && mine.some((a) => a.ts === m.clearedAt))), today)
      .filter((b) => b.earned)
      .map((b) => b.id),
  );
  const newBadges = badgesOf(allAttempts, mistakes, today).filter((b) => b.earned && !badgesBefore.has(b.id));
  return {
    xp: xp + clearedNow * XP_PER_CLEARED,
    levelBefore: levelOf(Math.max(0, xpBefore)),
    levelAfter: levelOf(xpAfter),
    streak: streakOf(allAttempts, today),
    todayN,
    goal,
    goalJustMet: beforeN < goal && todayN >= goal,
    newBadges,
  };
}
