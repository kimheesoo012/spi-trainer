import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { generate } from '../src/gen/registry';
import { applyAttempt, isMastered, makeSession, reshuffle, reviewItems, summaryText, weakest, typeStats } from '../src/store/logic';
import { makeBackup, parseBackup } from '../src/store/backup';
import type { Attempt, Mistake, Session } from '../src/store/model';
import { finishSession, getState, initStore, recordAttempt, saveActive, importData, clearAll } from '../src/store/state';
import { BANK, bankQuestion } from '../src/data/bank';

const sec = () => 60;

function answerWrong(s: Session, i: number): Session {
  const q = s.items[i].q;
  const answers = s.answers.slice();
  answers[i] = (q.answer + 1) % 4;
  const revealed = s.revealed.slice();
  revealed[i] = true;
  return { ...s, answers, revealed };
}
function answerRight(s: Session, i: number): Session {
  const answers = s.answers.slice();
  answers[i] = s.items[i].q.answer;
  const revealed = s.revealed.slice();
  revealed[i] = true;
  return { ...s, answers, revealed };
}

beforeEach(async () => {
  await initStore();
  await clearAll();
});

describe('記録と復習リスト', () => {
  it('同じ解答は二重に記録しない', () => {
    const q = generate('wariai', 1, 11);
    let s = makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec });
    s = answerWrong(s, 0);
    recordAttempt(s, 0);
    recordAttempt(s, 0);
    finishSession(s);
    finishSession(s);
    expect(getState().attempts.size).toBe(1);
    expect(getState().mistakes.get(q.id)!.wrongCount).toBe(1);
  });

  it('生成問題: 同じ問題で2回連続正解 + 新しい数値で1回正解 → 復習リストから外れる', () => {
    const q = generate('soneki', 2, 5);
    const first = answerWrong(makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec }), 0);
    recordAttempt(first, 0);
    const m0 = getState().mistakes.get(q.id)!;
    expect(m0.cleared).toBe(false);

    // 復習セット: 同じ問題(選択肢の順番は入れ替え) + 新しい数値の問題
    const items = reviewItems([m0], 'both', 10);
    expect(items.map((x) => x.kind)).toEqual(['retry_same', 'variant']);
    expect(items[0].q.id).toBe(q.id);
    expect(items[0].q.choices.slice().sort()).toEqual(q.choices.slice().sort());
    expect(items[0].q.choices[items[0].q.answer]).toBe(q.choices[q.answer]);
    expect(items[1].q.id).not.toBe(q.id);
    expect(items[1].q.typeId).toBe('soneki');
    expect(items[1].q.gen!.params.template).toBe(q.gen!.params.template);

    // 1回目の再挑戦: 正解 → まだ残る
    let s = answerRight(makeSession({ mode: 'study', label: 'r', items: [items[0]], practiceSecFor: sec }), 0);
    recordAttempt(s, 0);
    expect(getState().mistakes.get(q.id)!.sameStreak).toBe(1);
    // 新しい数値: 正解 → まだ残る(同じ問題が1回だけ)
    s = answerRight(makeSession({ mode: 'study', label: 'v', items: [items[1]], practiceSecFor: sec }), 0);
    recordAttempt(s, 0);
    expect(getState().mistakes.get(q.id)!.variantCleared).toBe(true);
    expect(getState().mistakes.get(q.id)!.cleared).toBe(false);
    // 2回目の再挑戦: 正解 → 外れる
    s = answerRight(makeSession({ mode: 'study', label: 'r2', items: [{ q: reshuffle(q, 9), kind: 'retry_same', parentQid: q.id }], practiceSecFor: sec }), 0);
    recordAttempt(s, 0);
    expect(getState().mistakes.get(q.id)!.cleared).toBe(true);
    // 記録上は種類ごとに別
    const kinds = [...getState().attempts.values()].map((a) => a.kind).sort();
    expect(kinds).toEqual(['new', 'retry_same', 'retry_same', 'variant']);
  });

  it('再挑戦で間違えると連続正解が0に戻る', () => {
    const q = generate('hayasa', 1, 3);
    recordAttempt(answerWrong(makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec }), 0), 0);
    const it1 = { q, kind: 'retry_same' as const, parentQid: q.id };
    recordAttempt(answerRight(makeSession({ mode: 'study', label: 'a', items: [it1], practiceSecFor: sec }), 0), 0);
    recordAttempt(answerWrong(makeSession({ mode: 'study', label: 'b', items: [it1], practiceSecFor: sec }), 0), 0);
    const m = getState().mistakes.get(q.id)!;
    expect(m.sameStreak).toBe(0);
    expect(m.wrongCount).toBe(2);
  });

  it('直接作成の問題は同じ問題で2回連続正解すれば外れる', () => {
    const item = BANK.items.find((x) => x.typeId === 'goi')!;
    const q = bankQuestion(item, 1);
    recordAttempt(answerWrong(makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec }), 0), 0);
    expect(reviewItems([getState().mistakes.get(q.id)!], 'both', 10).map((x) => x.kind)).toEqual(['retry_same']);
    for (const lab of ['a', 'b']) recordAttempt(answerRight(makeSession({ mode: 'study', label: lab, items: [{ q, kind: 'retry_same', parentQid: q.id }], practiceSecFor: sec }), 0), 0);
    expect(getState().mistakes.get(q.id)!.cleared).toBe(true);
  });

  it('実戦モードは終了時に全問記録(未回答は不正解)', () => {
    const qs = [generate('shisoku', 1, 1), generate('shisoku', 1, 2), generate('shisoku', 1, 3)];
    let s = makeSession({ mode: 'exam', label: 'e', items: qs.map((q) => ({ q, kind: 'new' })), practiceSecFor: () => 12 });
    expect(s.limitMs).toBe(36000);
    s = { ...s, answers: [qs[0].answer, null, (qs[2].answer + 1) % 4] };
    finishSession(s);
    const at = [...getState().attempts.values()];
    expect(at.length).toBe(3);
    expect(at.filter((a) => a.correct).length).toBe(1);
    expect(getState().mistakes.size).toBe(2);
  });
});

describe('保存と復元', () => {
  it('進行中のセッションを再読み込み後に同じ問題・同じ選択肢順で復元する', async () => {
    const q = generate('kuuran', 3, 777);
    const s = makeSession({ mode: 'exam', label: 'x', items: [{ q, kind: 'new' }, { q: generate('zuhyo', 2, 8), kind: 'new' }], practiceSecFor: sec });
    saveActive({ ...s, index: 1, answers: [2, null], elapsedMs: 12345 });
    await new Promise((r) => setTimeout(r, 50));
    await initStore(); // アプリを開き直す
    const a = getState().active!;
    expect(a.index).toBe(1);
    expect(a.answers).toEqual([2, null]);
    expect(a.elapsedMs).toBe(12345);
    expect(a.items[0].q).toEqual(q);
    // 生成問題はシードからも同じ問題を作り直せる
    expect(generate('kuuran', 3, a.items[0].q.gen!.seed)).toEqual(q);
  });

  it('記録と復習リストも開き直したあとに残る', async () => {
    const q = generate('baai', 2, 42);
    recordAttempt(answerWrong(makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec }), 0), 0);
    await new Promise((r) => setTimeout(r, 50));
    await initStore();
    expect(getState().attempts.size).toBe(1);
    expect(getState().mistakes.get(q.id)!.question).toEqual(q);
  });
});

describe('書き出し・取り込み', () => {
  it('書き出したファイルは取り込める。同じ記録は重複しない', () => {
    const q = generate('shugo', 1, 4);
    recordAttempt(answerWrong(makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec }), 0), 0);
    const st = getState();
    const text = JSON.stringify(makeBackup([...st.attempts.values()], [...st.mistakes.values()], st.settings));
    const r = parseBackup(text);
    expect(r.ok).toBe(true);
    if (r.ok) expect(importData(r.data)).toEqual({ attempts: 0, mistakes: 0 });
    expect(getState().attempts.size).toBe(1);
  });

  it('不正なファイルは拒否し、既存の記録を変えない', () => {
    const q = generate('shugo', 1, 4);
    recordAttempt(answerWrong(makeSession({ mode: 'study', label: 't', items: [{ q, kind: 'new' }], practiceSecFor: sec }), 0), 0);
    const before = getState().attempts.size;
    const good = makeBackup([...getState().attempts.values()], [...getState().mistakes.values()], getState().settings);
    const cases = [
      'not json',
      '{}',
      JSON.stringify({ ...good, app: 'other' }),
      JSON.stringify({ ...good, schema: 99 }),
      JSON.stringify({ ...good, schema: undefined }),
      JSON.stringify({ ...good, attempts: [{ id: 'x' }] }),
      JSON.stringify({ ...good, mistakes: [{ ...good.mistakes[0], question: { ...good.mistakes[0].question, choices: ['a'] } }] }),
    ];
    for (const c of cases) expect(parseBackup(c).ok, c.slice(0, 40)).toBe(false);
    expect(getState().attempts.size).toBe(before);
  });
});

describe('統計', () => {
  it('苦手な分野の上位3つと要約テキスト', () => {
    const mk = (typeId: string, correct: boolean, i: number): Attempt => ({
      id: `${typeId}${i}`,
      sessionId: 's',
      qid: `q${typeId}${i}`,
      typeId,
      exam: 'SPI',
      difficulty: 1,
      kind: 'new',
      correct,
      chosenText: 'x',
      timeMs: 30000,
      mode: 'study',
      ts: 0,
      day: '2026-10-26',
    });
    const at: Attempt[] = [];
    for (let i = 0; i < 4; i++) at.push(mk('wariai', i < 3, i), mk('soneki', i < 1, i), mk('hayasa', i < 2, i), mk('shugo', false, i));
    at.push(mk('baai', false, 0)); // 3問未満は対象外
    expect(weakest(typeStats(at)).map((w) => w.typeId)).toEqual(['shugo', 'soneki', 'hayasa']);
    const txt = summaryText(at, '2026-10-26', 5);
    expect(txt).toContain('解いた問題: 17問');
    expect(txt).toContain('復習待ちの問題: 5問');
  });

  it('applyAttempt は同じ型の Mistake を正しく作る', () => {
    const q = generate('wariai', 1, 1);
    const a: Attempt = { id: 'a', sessionId: 's', qid: q.id, typeId: q.typeId, exam: 'SPI', difficulty: 1, kind: 'new', correct: false, chosenText: null, timeMs: 1, mode: 'study', ts: 1, day: 'd' };
    const m = applyAttempt(new Map(), a, q) as Mistake;
    expect(m.question).toBe(q);
    expect(isMastered(m)).toBe(false);
  });
});
