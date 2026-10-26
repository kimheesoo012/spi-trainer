import { Frac } from '../core/frac';
import { makeRng, type Rng } from '../core/rng';
import type { Difficulty, Question, TableData } from '../core/types';

/** 選択肢の候補。value があれば数値として重複判定する */
export interface Cand {
  text: string;
  value?: Frac;
  /** どんな間違いから来る選択肢か(テストとデバッグ用) */
  why?: string;
}

export interface Draft {
  question_ja: string;
  table?: TableData;
  correct: Cand;
  /** よくある間違いから作った誤答。優先順 */
  wrong: (Cand | null)[];
  /** 誤答が足りないときの近い値 */
  fillers?: (Cand | null)[];
  short: string;
  steps: string[];
  quick: string[];
  ko: string;
  tip: string;
  params: Record<string, unknown> & { template: string };
  /** 正解を別の方法で計算し直す(総当たり・代入など)。正解と一致しなければ生成をやり直す */
  check: () => Frac | string;
  /** 数値の選択肢は正の数だけにする(既定 true) */
  positiveOnly?: boolean;
}

export type GenFn = (rng: Rng, d: Difficulty) => Draft | null;

export interface GenMeta {
  exam: 'SPI' | 'SHL';
  typeId: string;
  test_name: string;
  category: string;
}

export class GenerationError extends Error {}

function sameCand(a: Cand, b: Cand): boolean {
  if (a.text === b.text) return true;
  if (a.value && b.value) return a.value.eq(b.value);
  return false;
}

/** 誤答候補から3つ選ぶ。値が同じもの・正解と同じもの・不正な値は捨てる */
export function pickDistractors(d: Draft, n = 3): Cand[] | null {
  const out: Cand[] = [];
  const positiveOnly = d.positiveOnly ?? true;
  for (const c of [...d.wrong, ...(d.fillers ?? [])]) {
    if (!c || !c.text) continue;
    if (c.value && positiveOnly && !c.value.isPos()) continue;
    if (sameCand(c, d.correct)) continue;
    if (out.some((o) => sameCand(o, c))) continue;
    out.push(c);
    if (out.length === n) return out;
  }
  return null;
}

export function buildQuestion(meta: GenMeta, fn: GenFn, difficulty: Difficulty, seed: number, wantTemplate?: string): Question {
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 400; attempt++) {
    let d: Draft | null;
    try {
      d = fn(rng, difficulty);
    } catch (e) {
      // 桁あふれなどはやり直し
      if (e instanceof Error && e.message.startsWith('Frac')) continue;
      throw e;
    }
    if (!d) continue;
    if (wantTemplate && d.params.template !== wantTemplate) continue;
    const ds = pickDistractors(d);
    if (!ds) continue;
    const re = d.check();
    const ok = re instanceof Frac ? !!d.correct.value && re.eq(d.correct.value) : re === d.correct.text;
    if (!ok) throw new GenerationError(`${meta.typeId}: check mismatch (${String(re)} vs ${d.correct.text})`);
    const all = rng.shuffle([d.correct, ...ds]);
    return {
      id: `g:${meta.typeId}:${difficulty}:${seed}`,
      source: 'gen',
      exam: meta.exam,
      typeId: meta.typeId,
      test_name: meta.test_name,
      category: meta.category,
      difficulty,
      question_ja: d.question_ja,
      table: d.table,
      choices: all.map((c) => c.text),
      answer: all.indexOf(d.correct),
      explanation_short_ja: d.short,
      steps_ja: d.steps,
      quick_ja: d.quick,
      explanation_ko: d.ko,
      tip: d.tip,
      gen: { seed, params: { ...d.params, wrongWhy: ds.map((x) => x.why ?? '') } },
    };
  }
  throw new GenerationError(`${meta.typeId}: could not generate (seed ${seed})`);
}

/** 数値候補を作る。fmt が null を返す(きれいに表せない)なら候補にしない */
export function numCand(value: Frac | null, fmt: (v: Frac) => string | null, why?: string): Cand | null {
  if (!value) return null;
  const text = fmt(value);
  if (!text) return null;
  return { text, value, why };
}

/** 例外を出さずに計算する(ゼロ除算などは null) */
export function tryF(f: () => Frac): Frac | null {
  try {
    return f();
  } catch {
    return null;
  }
}
