import { describe, expect, it } from 'vitest';
import type { Attempt, Mistake } from '../src/store/model';
import { badgesOf, dayCells, dayOffset, levelOf, masteryOf, sessionGains, streakOf, totalXp, xpForLevel, xpOf } from '../src/store/progress';

const mk = (o: Partial<Attempt>): Attempt => ({
  id: Math.random().toString(36),
  sessionId: 's',
  qid: 'q',
  typeId: 'wariai',
  exam: 'SPI',
  difficulty: 1,
  kind: 'new',
  correct: true,
  chosenText: 'x',
  timeMs: 1000,
  mode: 'study',
  ts: 0,
  day: '2026-10-27',
  ...o,
});

describe('XP とレベル', () => {
  it('難しい問題・新しい数値の正解ほど多く、不正解でも少し入る', () => {
    expect(xpOf(mk({ difficulty: 1 }))).toBe(10);
    expect(xpOf(mk({ difficulty: 3 }))).toBe(30);
    expect(xpOf(mk({ correct: false, difficulty: 3 }))).toBe(2);
    expect(xpOf(mk({ kind: 'retry_same' }))).toBe(5);
    expect(xpOf(mk({ kind: 'variant', difficulty: 2 }))).toBe(25);
  });
  it('レベルの境目', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(100);
    expect(xpForLevel(3)).toBe(300);
    expect(levelOf(0).level).toBe(1);
    expect(levelOf(99).level).toBe(1);
    expect(levelOf(100).level).toBe(2);
    expect(levelOf(100).into).toBe(0);
    expect(levelOf(299).level).toBe(2);
    expect(levelOf(300)).toMatchObject({ level: 3, into: 0, span: 300, title: '基礎' });
    for (let x = 0; x < 20000; x += 37) {
      const l = levelOf(x);
      expect(l.ratio).toBeGreaterThanOrEqual(0);
      expect(l.ratio).toBeLessThan(1);
    }
  });
  it('克服した問題はボーナス', () => {
    const m = { cleared: true } as Mistake;
    expect(totalXp([mk({})], [m, { cleared: false } as Mistake])).toBe(30);
  });
});

describe('連続日数', () => {
  it('日付の計算は月をまたぐ', () => {
    expect(dayOffset('2026-11-01', -1)).toBe('2026-10-31');
    expect(dayOffset('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('今日解いていれば今日を含めて数える', () => {
    const at = ['2026-10-25', '2026-10-26', '2026-10-27'].map((day) => mk({ day }));
    expect(streakOf(at, '2026-10-27')).toMatchObject({ current: 3, best: 3, todayDone: true, atRisk: false });
  });
  it('今日まだなら昨日までを数え、途切れそうと知らせる', () => {
    const at = ['2026-10-25', '2026-10-26'].map((day) => mk({ day }));
    expect(streakOf(at, '2026-10-27')).toMatchObject({ current: 2, todayDone: false, atRisk: true });
  });
  it('1日空くと 0 に戻る。過去最長は残る', () => {
    const at = ['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-25'].map((day) => mk({ day }));
    expect(streakOf(at, '2026-10-27')).toMatchObject({ current: 0, best: 3, atRisk: false });
    expect(streakOf([], '2026-10-27')).toMatchObject({ current: 0, best: 0 });
  });
  it('日ごとの集計と目標', () => {
    const at = [mk({ day: '2026-10-27' }), mk({ day: '2026-10-27', correct: false }), mk({ day: '2026-10-26' })];
    const cells = dayCells(at, '2026-10-27', 7, 2);
    expect(cells.length).toBe(7);
    expect(cells[6]).toMatchObject({ day: '2026-10-27', n: 2, correct: 1, xp: 12, goalMet: true });
    expect(cells[5]).toMatchObject({ n: 1, goalMet: false });
    expect(cells[0].day).toBe('2026-10-21');
  });
});

describe('分野の実力', () => {
  it('解けば上がり、難しい問題で上限が上がる', () => {
    const easy = Array.from({ length: 10 }, (_, i) => mk({ ts: i, difficulty: 1 }));
    const e = masteryOf(easy, 'wariai');
    expect(e.score).toBeGreaterThan(25);
    expect(e.score).toBeLessThanOrEqual(34);
    const hard = Array.from({ length: 10 }, (_, i) => mk({ ts: i, difficulty: 3 }));
    expect(masteryOf(hard, 'wariai').score).toBe(100);
    expect(masteryOf([], 'wariai')).toMatchObject({ score: 0, n: 0, label: '未習' });
    expect(masteryOf(easy, 'soneki').n).toBe(0);
  });
  it('数問だけでは高くならず、最近の間違いで下がる', () => {
    expect(masteryOf([mk({ difficulty: 3 })], 'wariai').score).toBeLessThanOrEqual(17);
    const good = Array.from({ length: 10 }, (_, i) => mk({ ts: i, difficulty: 2 }));
    const thenBad = [...good, ...Array.from({ length: 5 }, (_, i) => mk({ ts: 100 + i, difficulty: 2, correct: false }))];
    expect(masteryOf(thenBad, 'wariai').score).toBeLessThan(masteryOf(good, 'wariai').score);
    // upTo で過去時点の値を出せる
    expect(masteryOf(thenBad, 'wariai', 50).score).toBe(masteryOf(good, 'wariai').score);
  });
});

describe('バッジと1回分の獲得', () => {
  it('条件を満たしたものだけ獲得', () => {
    const at = Array.from({ length: 10 }, (_, i) => mk({ sessionId: 'p', id: `p${i}` }));
    const b = badgesOf(at, [], '2026-10-27');
    const earned = b.filter((x) => x.earned).map((x) => x.id);
    expect(earned).toEqual(['first', 'perfect']);
  });
  it('この回で得たXP・目標達成・新バッジ', () => {
    const prev = Array.from({ length: 4 }, (_, i) => mk({ sessionId: 'old', id: `o${i}`, ts: 1 }));
    const now = Array.from({ length: 6 }, (_, i) => mk({ sessionId: 'new', id: `n${i}`, ts: 10 + i, difficulty: 2, correct: i < 5 }));
    const g = sessionGains([...prev, ...now], [], 'new', 10, '2026-10-27');
    expect(g.xp).toBe(5 * 20 + 2);
    expect(g.levelBefore.level).toBe(1);
    expect(g.levelAfter.level).toBe(2); // 40 + 102 = 142 XP
    expect(g.goalJustMet).toBe(true);
    expect(g.todayN).toBe(10);
    expect(g.newBadges.map((b) => b.id)).toEqual([]);
    expect(g.streak.current).toBe(1);
  });
});
