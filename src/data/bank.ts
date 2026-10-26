import { makeRng } from '../core/rng';
import type { BankItem, Difficulty, Question } from '../core/types';
import { TYPES, type TypeDef } from './catalog';

// 直接作成した問題(JSON)。src/data/bank/ に .json を追加すると自動で読み込まれる(再ビルドが必要)。
// 1ファイルは BankItem の配列。

const files = import.meta.glob('./bank/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;

const REQUIRED_STR = ['id', 'test_name', 'category', 'question_ja', 'answer', 'explanation_short_ja', 'explanation_ko', 'tip'] as const;

export function typeForCategory(category: string): TypeDef | undefined {
  return TYPES.find((t) => t.kind === 'bank' && t.name === category);
}

/** 1件の形式チェック。問題がなければ空配列 */
export function validateBankItem(x: unknown): string[] {
  const errs: string[] = [];
  if (!x || typeof x !== 'object') return ['not an object'];
  const o = x as Record<string, unknown>;
  for (const k of REQUIRED_STR) if (typeof o[k] !== 'string' || !(o[k] as string).trim()) errs.push(`missing ${k}`);
  if (o.exam !== 'SPI' && o.exam !== 'SHL') errs.push('exam must be SPI or SHL');
  if (![1, 2, 3].includes(o.difficulty as number)) errs.push('difficulty must be 1-3');
  if (!Array.isArray(o.choices) || o.choices.length !== 4) errs.push('choices must have 4 items');
  else {
    if (o.choices.some((c) => typeof c !== 'string' || !c.trim())) errs.push('empty choice');
    if (new Set(o.choices).size !== 4) errs.push('duplicate choices');
    if (o.choices.filter((c) => c === o.answer).length !== 1) errs.push('answer is not exactly one of the choices');
  }
  const det = o.explanation_detail_ja;
  if (!(typeof det === 'string' && det.trim()) && !(Array.isArray(det) && det.length > 0 && det.every((s) => typeof s === 'string' && s.trim())))
    errs.push('missing explanation_detail_ja');
  if (typeof o.reviewed !== 'boolean') errs.push('reviewed must be boolean');
  if (o.passage_ja !== undefined && typeof o.passage_ja !== 'string') errs.push('passage_ja must be string');
  const t = typeof o.category === 'string' ? typeForCategory(o.category) : undefined;
  if (!t) errs.push(`unknown category ${String(o.category)}`);
  else if (t.exam !== o.exam) errs.push(`exam ${String(o.exam)} does not match category ${t.name}`);
  return errs;
}

export interface BankLoad {
  items: (BankItem & { typeId: string })[];
  rejected: { file: string; id: string; errors: string[] }[];
}

export function loadBank(src: Record<string, unknown> = files): BankLoad {
  const items: BankLoad['items'] = [];
  const rejected: BankLoad['rejected'] = [];
  const seen = new Set<string>();
  for (const [file, data] of Object.entries(src)) {
    if (!Array.isArray(data)) {
      rejected.push({ file, id: '-', errors: ['file must be an array'] });
      continue;
    }
    for (const raw of data) {
      const errs = validateBankItem(raw);
      const id = String((raw as { id?: unknown })?.id ?? '?');
      if (seen.has(id)) errs.push('duplicate id');
      if (errs.length) {
        rejected.push({ file, id, errors: errs });
        continue;
      }
      seen.add(id);
      const it = raw as BankItem;
      items.push({ ...it, typeId: typeForCategory(it.category)!.id });
    }
  }
  return { items, rejected };
}

export const BANK = loadBank();
if (BANK.rejected.length && typeof console !== 'undefined') console.warn('問題JSONの形式エラー', BANK.rejected);

/** 出題対象(二重チェック済み)の問題 */
export const bankItemsFor = (typeId: string, difficulty?: Difficulty) =>
  BANK.items.filter((x) => x.typeId === typeId && x.reviewed && (!difficulty || x.difficulty === difficulty));

export const verifiedCount = (typeId: string) => bankItemsFor(typeId).length;

export function bankQuestion(item: BankItem & { typeId: string }, shuffleSeed: number): Question {
  const rng = makeRng(shuffleSeed);
  const choices = rng.shuffle(item.choices);
  const det = Array.isArray(item.explanation_detail_ja) ? item.explanation_detail_ja : [item.explanation_detail_ja];
  return {
    id: `b:${item.id}`,
    source: 'bank',
    exam: item.exam,
    typeId: item.typeId,
    test_name: item.test_name,
    category: item.category,
    difficulty: item.difficulty,
    passage_ja: item.passage_ja,
    question_ja: item.question_ja,
    choices,
    answer: choices.indexOf(item.answer),
    explanation_short_ja: item.explanation_short_ja,
    steps_ja: det,
    quick_ja: item.tip ? [item.tip] : [],
    explanation_ko: item.explanation_ko,
    tip: item.tip,
  };
}

export const bankById = (id: string) => BANK.items.find((x) => `b:${x.id}` === id);
