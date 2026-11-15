import { describe, expect, it } from 'vitest';
import { generate } from '../src/gen/registry';
import { countedIndexes, makeSession } from '../src/store/logic';
import { MOCKS, mockById, mockSession, passageSet } from '../src/store/mock';
import { typeById } from '../src/data/catalog';

const sec = (id: string) => typeById(id)?.practiceSec ?? 60;

describe('本番セット', () => {
  it('言語: 長文8本 × 設問4つ = 32問・15分。同じ長文の設問は続けて出る', () => {
    const s = mockSession(mockById('mock_gab')!, []);
    expect(s.items.length).toBe(32);
    expect(s.limitMs).toBe(15 * 60 * 1000);
    expect(s.mode).toBe('exam');
    expect(s.mockId).toBe('mock_gab');
    const passages = s.items.map((it) => it.q.passage_ja);
    for (let p = 0; p < 8; p++) {
      const block = passages.slice(p * 4, p * 4 + 4);
      expect(new Set(block).size).toBe(1);
    }
    expect(new Set(passages).size).toBe(8);
    expect(new Set(s.items.map((it) => it.q.id)).size).toBe(32);
    for (const it of s.items) expect(it.q.choices.length).toBe(3);
  });
  it('英語: 長文8本 × 設問3つ = 24問・10分', () => {
    const s = mockSession(mockById('mock_eigo')!, []);
    expect(s.items.length).toBe(24);
    expect(s.limitMs).toBe(10 * 60 * 1000);
    const passages = s.items.map((it) => it.q.passage_ja);
    for (let p = 0; p < 8; p++) expect(new Set(passages.slice(p * 3, p * 3 + 3)).size).toBe(1);
    expect(new Set(passages).size).toBe(8);
  });
  it('計数: 図表の読み取り 29問・15分。5択で、表とグラフの両方が出る', () => {
    const s = mockSession(mockById('mock_zuhyo')!, []);
    expect(s.items.length).toBe(29);
    expect(s.limitMs).toBe(15 * 60 * 1000);
    for (const it of s.items) expect(it.q.choices.length).toBe(5);
    expect(new Set(s.items.map((it) => it.q.question_ja)).size).toBe(29);
    expect(s.items.some((it) => it.q.charts?.length)).toBe(true);
    expect(s.items.some((it) => it.q.table)).toBe(true);
  });
  it('まだ解いていない長文を優先する', () => {
    const first = passageSet('gab_abc', 8, 4, new Set(), 123);
    const seen = new Set(first.map((q) => q.id));
    const second = passageSet('gab_abc', 8, 4, seen, 456);
    expect(second.some((q) => seen.has(q.id))).toBe(false);
  });
  it('どのセットも、必要な数の問題を用意できる', () => {
    for (const m of MOCKS) for (let k = 0; k < 5; k++) expect(m.build(new Set()).length).toBe(m.count);
  });
});

describe('採点の対象', () => {
  const qs = [1, 2, 3, 4, 5].map((k) => generate('shisoku', 1, k));
  const base = () => makeSession({ mode: 'exam', label: 'e', items: qs.map((q) => ({ q, kind: 'new' as const })), practiceSecFor: sec });
  it('時間切れ・途中終了: 画面に出た問題までを数え、見ていない問題は数えない', () => {
    const s = { ...base(), index: 2, answers: [0, null, null, null, null] };
    expect(countedIndexes(s)).toEqual([0, 1, 2]);
  });
  it('最後まで進んだら全問を数える(未回答は不正解)', () => {
    const s = { ...base(), index: 4, answers: [0, null, 1, null, null] };
    expect(countedIndexes(s)).toEqual([0, 1, 2, 3, 4]);
  });
  it('学習モードは、解説を見た問題だけ', () => {
    const s = { ...makeSession({ mode: 'study', label: 's', items: qs.map((q) => ({ q, kind: 'new' as const })), practiceSecFor: sec }), index: 3, revealed: [true, true, false, false, false] };
    expect(countedIndexes(s)).toEqual([0, 1]);
  });
  it('制限時間を指定しなければ、分野ごとの目安の合計になる', () => {
    expect(base().limitMs).toBe(5 * sec('shisoku') * 1000);
  });
});
