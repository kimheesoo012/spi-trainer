import type { Difficulty, Question } from '../core/types';
import { typeById } from '../data/catalog';
import { buildQuestion, type GenFn } from './framework';
import { genWariai } from './wariai';
import { genSoneki } from './soneki';
import { genShisoku } from './shisoku';
import { genHayasa } from './hayasa';
import { genShigoto } from './shigoto';
import { genShugo } from './shugo';
import { genKakuritsu } from './kakuritsu';
import { genBaai } from './baai';
import { genZuhyo } from './zuhyo';
import { genKuuran } from './kuuran';
import { genShiryo } from './shiryo';

export const GENERATORS: Record<string, GenFn> = {
  wariai: genWariai,
  soneki: genSoneki,
  hayasa: genHayasa,
  shigoto: genShigoto,
  shugo: genShugo,
  kakuritsu: genKakuritsu,
  baai: genBaai,
  shiryo: genShiryo,
  shisoku: genShisoku,
  zuhyo: genZuhyo,
  kuuran: genKuuran,
};

export const hasGenerator = (typeId: string) => typeId in GENERATORS;

export function generate(typeId: string, difficulty: Difficulty, seed: number, wantTemplate?: string): Question {
  const t = typeById(typeId);
  const fn = GENERATORS[typeId];
  if (!t || !fn) throw new Error(`no generator: ${typeId}`);
  return buildQuestion({ exam: t.exam, typeId, test_name: t.test_name, category: t.name }, fn, difficulty, seed, wantTemplate);
}

/** 保存しておいたIDから同じ問題を作り直す。id = g:typeId:difficulty:seed */
export function regenerateFromId(id: string): Question | null {
  const m = /^g:([a-z_]+):([123]):(\d+)$/.exec(id);
  if (!m) return null;
  try {
    return generate(m[1], Number(m[2]) as Difficulty, Number(m[3]));
  } catch {
    return null;
  }
}
