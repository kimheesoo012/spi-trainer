import { describe, expect, it } from 'vitest';
import { GENERATORS, generate, regenerateFromId } from '../src/gen/registry';
import type { Difficulty, Question } from '../src/core/types';
import { checkChain, evaluate, mathSegments, q, qeq } from './exactEval';
import { choiceValue } from './choiceValue';
import { ORACLES } from './oracles';

const N = Number(process.env.GEN_N ?? 3000);

function allText(qn: Question): string[] {
  return [qn.explanation_short_ja, ...qn.steps_ja, ...qn.quick_ja];
}

function checkQuestion(qn: Question): string[] {
  const errs: string[] = [];
  if (qn.choices.length !== 4) errs.push('choices != 4');
  if (new Set(qn.choices).size !== 4) errs.push(`duplicate choice text: ${qn.choices.join(' | ')}`);
  if (qn.answer < 0 || qn.answer > 3) errs.push('answer index out of range');
  const vals = qn.choices.map(choiceValue);
  if (vals.every((v) => v)) {
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) if (qeq(vals[i]!, vals[j]!)) errs.push(`same value: ${qn.choices[i]} = ${qn.choices[j]}`);
  }
  const correct = qn.choices[qn.answer];
  if (!qn.explanation_short_ja.includes(correct)) errs.push(`short explanation lacks answer "${correct}"`);
  for (const t of allText(qn)) {
    for (const seg of mathSegments(t)) {
      const e = checkChain(seg);
      if (e) errs.push(e);
    }
  }
  if (!qn.explanation_ko) errs.push('no korean');
  const oracle = ORACLES[qn.typeId];
  if (oracle) {
    const e = oracle(qn);
    if (e) errs.push(e);
  }
  return errs;
}

describe('generators', () => {
  for (const typeId of Object.keys(GENERATORS)) {
    for (const diff of [1, 2, 3] as Difficulty[]) {
      it(`${typeId} difficulty ${diff} × ${N}`, () => {
        const failures: string[] = [];
        const templates = new Map<string, number>();
        const positions = [0, 0, 0, 0];
        for (let seed = 1; seed <= N; seed++) {
          const qn = generate(typeId, diff, seed * 7919 + diff);
          const errs = checkQuestion(qn);
          if (errs.length) failures.push(`[${qn.id}] ${qn.question_ja.slice(0, 60)} :: ${errs.join(' / ')}`);
          templates.set(String(qn.gen!.params.template), (templates.get(String(qn.gen!.params.template)) ?? 0) + 1);
          positions[qn.answer]++;
          if (seed <= 200) {
            // 同じシードで同じ問題に戻るか(保存・復元の前提)
            const again = regenerateFromId(qn.id);
            expect(again).toEqual(qn);
          }
        }
        expect(failures.slice(0, 10)).toEqual([]);
        // 正解の位置が偏っていない
        for (const c of positions) expect(c).toBeGreaterThan(N * 0.15);
        // どのテンプレートも出る
        expect(templates.size).toBeGreaterThan(0);
      });
    }
  }
});

describe('evaluator self-test', () => {
  it('evaluates', () => {
    expect(qeq(evaluate('1,200 × 25%'), q(300n))).toBe(true);
    expect(qeq(evaluate('3/4 × 100'), q(75n))).toBe(true);
    expect(qeq(evaluate('5C2'), q(10n))).toBe(true);
    expect(qeq(evaluate('4P2'), q(12n))).toBe(true);
    expect(qeq(evaluate('(2 − 1) × 3!'), q(6n))).toBe(true);
    expect(checkChain('1 + 1 = 3')).not.toBeNull();
    expect(checkChain('100 ÷ 3 ≒ 33')).toBeNull();
  });
  it('parses choices', () => {
    expect(qeq(choiceValue('4%減')!, q(-1n, 25n))).toBe(true);
    expect(qeq(choiceValue('1,500円')!, q(1500n))).toBe(true);
    expect(qeq(choiceValue('3/8')!, q(3n, 8n))).toBe(true);
    expect(choiceValue('A市')).toBeNull();
  });
});
