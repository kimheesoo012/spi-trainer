import { describe, expect, it } from 'vitest';
import { bankItemsFor, bankQuestion } from '../src/data/bank';
import { makeBackup, parseBackup } from '../src/store/backup';
import { questionsForType, reshuffle } from '../src/store/logic';
import { DEFAULT_SETTINGS, type Mistake } from '../src/store/model';

// 本番形式(A/B/C の3択)は、選択肢の順番を変えない
describe('本番形式・3択', () => {
  const A = '本文から論理的に考えて、設問文は明らかに正しい';
  for (const typeId of ['gab_abc', 'eigo_abc']) {
    it(`${typeId}: 選択肢は3つで、いつも A・B・C の順`, () => {
      const items = bankItemsFor(typeId);
      expect(items.length).toBeGreaterThanOrEqual(24);
      for (const it0 of items) {
        for (const seed of [1, 7, 99]) {
          const q = bankQuestion(it0, seed);
          expect(q.choices).toEqual(it0.choices);
          expect(q.choices.length).toBe(3);
          expect(q.choices[q.answer]).toBe(it0.answer);
          expect(reshuffle(q, seed + 1)).toEqual(q);
        }
      }
      if (typeId === 'gab_abc') expect(items[0].choices[0]).toBe(A);
    });
    it(`${typeId}: 正解が A・B・C のどれかに偏っていない`, () => {
      const items = bankItemsFor(typeId);
      const n = [0, 0, 0];
      for (const it0 of items) n[it0.choices.indexOf(it0.answer)]++;
      for (const c of n) expect(c).toBeGreaterThanOrEqual(items.length * 0.2);
    });
  }
  it('出題リストに同じ問題が重ならない', () => {
    const qs = questionsForType('gab_abc', 0, 20);
    expect(qs.length).toBe(20);
    expect(new Set(qs.map((q) => q.id)).size).toBe(20);
  });
  it('3択の問題を含むバックアップを書き出して読み込める', () => {
    const q = bankQuestion(bankItemsFor('gab_abc')[0], 1);
    const m: Mistake = { qid: q.id, typeId: q.typeId, difficulty: q.difficulty, question: q, wrongCount: 1, sameStreak: 0, variantTries: 0, cleared: false, variantCleared: false, updatedAt: 1 } as Mistake;
    const r = parseBackup(JSON.stringify(makeBackup([], [m], DEFAULT_SETTINGS)));
    expect(r.ok).toBe(true);
    const bad = { ...m, question: { ...q, answer: 3 } };
    expect(parseBackup(JSON.stringify(makeBackup([], [bad as Mistake], DEFAULT_SETTINGS))).ok).toBe(false);
  });
});
