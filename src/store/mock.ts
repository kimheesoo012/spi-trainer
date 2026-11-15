import { makeRng, randomSeed } from '../core/rng';
import type { Exam, Question } from '../core/types';
import { bankItemsFor, bankQuestion } from '../data/bank';
import { typeById } from '../data/catalog';
import { makeSession, questionsForType } from './logic';
import type { Attempt, Session } from './model';

/** 本番セット: 本番と同じ問題数・制限時間で通して解く */
export interface MockSet {
  id: string;
  exam: Exam;
  name: string;
  name_ko: string;
  /** 出題のしかた(1行) */
  note: string;
  count: number;
  minutes: number;
  build: (seen: Set<string>) => Question[];
}

/**
 * 長文つきの問題を「長文ごと」にまとめて出す。同じ長文の設問は続けて並べる。
 * まだ解いていない設問が多い長文を優先する。
 */
export function passageSet(typeId: string, passages: number, perPassage: number, seen: Set<string>, seed = randomSeed()): Question[] {
  const rng = makeRng(seed);
  const groups = new Map<string, ReturnType<typeof bankItemsFor>>();
  for (const it of bankItemsFor(typeId)) {
    const key = it.id.replace(/-\d+$/, '');
    groups.set(key, [...(groups.get(key) ?? []), it]);
  }
  const usable = rng.shuffle([...groups.values()].filter((g) => g.length >= perPassage));
  const seenCount = (g: ReturnType<typeof bankItemsFor>) => g.filter((it) => seen.has(`b:${it.id}`)).length;
  usable.sort((a, b) => seenCount(a) - seenCount(b));
  const out: Question[] = [];
  for (const g of usable.slice(0, passages)) {
    // 1つの長文の中では、まだ解いていない設問を先に選ぶ
    const items = rng.shuffle(g).sort((a, b) => Number(seen.has(`b:${a.id}`)) - Number(seen.has(`b:${b.id}`)));
    for (const it of items.slice(0, perPassage)) out.push(bankQuestion(it, rng.int(1, 2 ** 31 - 1)));
  }
  return out;
}

export const MOCKS: MockSet[] = [
  {
    id: 'mock_zuhyo',
    exam: 'SHL',
    name: '計数(図表の読み取り)',
    name_ko: '계수(도표 읽기)',
    note: '表とグラフの問題を難易度を混ぜて出題。5択',
    count: 29,
    minutes: 15,
    build: () => questionsForType('zuhyo', 0, 29),
  },
  {
    id: 'mock_gab',
    exam: 'SHL',
    name: '言語(論理的読解)',
    name_ko: '언어(논리적 독해)',
    note: '長文8本 × 設問4つ。A・B・C の3択',
    count: 32,
    minutes: 15,
    build: (seen) => passageSet('gab_abc', 8, 4, seen),
  },
  {
    id: 'mock_eigo',
    exam: 'SHL',
    name: '英語(論理的読解)',
    name_ko: '영어(논리적 독해)',
    note: '長文8本 × 設問3つ。A・B・C の3択',
    count: 24,
    minutes: 10,
    build: (seen) => passageSet('eigo_abc', 8, 3, seen),
  },
];

export const mockById = (id: string) => MOCKS.find((m) => m.id === id);

export function mockSession(m: MockSet, attempts: Attempt[]): Session {
  const qs = m.build(new Set(attempts.map((a) => a.qid)));
  return makeSession({
    mode: 'exam',
    label: `本番セット ${m.name}`,
    items: qs.map((q) => ({ q, kind: 'new' })),
    practiceSecFor: (id) => typeById(id)?.practiceSec ?? 60,
    limitMs: m.minutes * 60 * 1000,
    mockId: m.id,
  });
}
