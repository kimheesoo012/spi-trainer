import type { Attempt, Mistake, Settings } from './model';

export const APP_ID = 'spi-tamate-trainer';
export const SCHEMA_VERSION = 1;
export const APP_VERSION = '1.0.0';

export interface BackupFile {
  app: typeof APP_ID;
  schema: number;
  appVersion: string;
  exportedAt: string;
  attempts: Attempt[];
  mistakes: Mistake[];
  settings: Settings;
}

export function makeBackup(attempts: Attempt[], mistakes: Mistake[], settings: Settings): BackupFile {
  return { app: APP_ID, schema: SCHEMA_VERSION, appVersion: APP_VERSION, exportedAt: new Date().toISOString(), attempts, mistakes, settings };
}

const isStr = (x: unknown) => typeof x === 'string';
const isNum = (x: unknown) => typeof x === 'number' && Number.isFinite(x);
const isBool = (x: unknown) => typeof x === 'boolean';

function checkAttempt(a: unknown): string | null {
  if (!a || typeof a !== 'object') return '解答記録の形式が不正';
  const o = a as Record<string, unknown>;
  for (const k of ['id', 'sessionId', 'qid', 'typeId', 'exam', 'kind', 'mode', 'day']) if (!isStr(o[k])) return `解答記録に ${k} がない`;
  if (!isBool(o.correct) || !isNum(o.timeMs) || !isNum(o.ts) || ![1, 2, 3].includes(o.difficulty as number)) return '解答記録の値が不正';
  if (!['new', 'retry_same', 'variant'].includes(o.kind as string)) return '解答記録の kind が不正';
  return null;
}

function checkQuestion(q: unknown): string | null {
  if (!q || typeof q !== 'object') return '問題データがない';
  const o = q as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.question_ja) || !isStr(o.typeId)) return '問題データの形式が不正';
  if (!Array.isArray(o.choices) || o.choices.length !== 4 || !o.choices.every(isStr)) return '問題の選択肢が4つでない';
  if (!isNum(o.answer) || (o.answer as number) < 0 || (o.answer as number) > 3) return '問題の正解の位置が不正';
  return null;
}

function checkMistake(m: unknown): string | null {
  if (!m || typeof m !== 'object') return '復習リストの形式が不正';
  const o = m as Record<string, unknown>;
  if (!isStr(o.qid) || !isStr(o.typeId)) return '復習リストに qid がない';
  for (const k of ['wrongCount', 'sameStreak', 'variantTries', 'updatedAt']) if (!isNum(o[k])) return `復習リストの ${k} が不正`;
  if (!isBool(o.cleared) || !isBool(o.variantCleared)) return '復習リストの状態が不正';
  return checkQuestion(o.question);
}

export type ParseResult = { ok: true; data: BackupFile } | { ok: false; error: string };

/** 取り込むファイルを検査する。1か所でも不正ならファイル全体を拒否する(既存の記録は変えない) */
export function parseBackup(text: string): ParseResult {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSONとして読み込めません。' };
  }
  if (!o || typeof o !== 'object') return { ok: false, error: 'ファイルの中身が不正です。' };
  const b = o as Record<string, unknown>;
  if (b.app !== APP_ID) return { ok: false, error: 'このアプリの書き出しファイルではありません。' };
  if (!isNum(b.schema)) return { ok: false, error: 'バージョン情報がありません。' };
  if ((b.schema as number) > SCHEMA_VERSION) return { ok: false, error: `新しいバージョン(${b.schema})のファイルです。アプリを更新してください。` };
  if ((b.schema as number) < 1) return { ok: false, error: 'バージョン情報が不正です。' };
  if (!Array.isArray(b.attempts) || !Array.isArray(b.mistakes)) return { ok: false, error: '記録のデータがありません。' };
  for (const a of b.attempts) {
    const e = checkAttempt(a);
    if (e) return { ok: false, error: e };
  }
  for (const m of b.mistakes) {
    const e = checkMistake(m);
    if (e) return { ok: false, error: e };
  }
  return { ok: true, data: o as BackupFile };
}

/** 既存の記録に合流させる。同じIDの解答は1件として数え、復習リストは更新が新しい方を残す */
export function mergeBackup(attempts: Map<string, Attempt>, mistakes: Map<string, Mistake>, data: BackupFile) {
  const newAttempts: Attempt[] = [];
  for (const a of data.attempts) if (!attempts.has(a.id)) newAttempts.push(a);
  const newMistakes: Mistake[] = [];
  for (const m of data.mistakes) {
    const cur = mistakes.get(m.qid);
    if (!cur || cur.updatedAt < m.updatedAt) newMistakes.push(m);
  }
  return { newAttempts, newMistakes };
}
