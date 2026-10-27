import type { Difficulty, Exam, Question } from '../core/types';

export type Mode = 'study' | 'exam' | 'speed';
/** new: 初めての出題 / retry_same: 間違えた問題そのもの / variant: 同じ型の新しい数値の問題 */
export type AttemptKind = 'new' | 'retry_same' | 'variant';

export interface Attempt {
  /** `${sessionId}:${index}`。同じ解答を二重に数えないためのキー */
  id: string;
  sessionId: string;
  qid: string;
  typeId: string;
  exam: Exam;
  difficulty: Difficulty;
  kind: AttemptKind;
  /** retry_same / variant のときの元の(間違えた)問題 */
  parentQid?: string;
  correct: boolean;
  chosenText: string | null;
  timeMs: number;
  mode: Mode;
  ts: number;
  /** 端末の現地日付 YYYY-MM-DD */
  day: string;
}

export interface Mistake {
  qid: string;
  typeId: string;
  difficulty: Difficulty;
  /** 復元用に問題をそのまま保存(生成問題はシード・パラメータ・選択肢・正解を含む) */
  question: Question;
  wrongCount: number;
  firstWrongAt: number;
  lastWrongAt: number;
  /** 同じ問題での連続正解数 */
  sameStreak: number;
  sameTries: number;
  /** 新しい数値の問題で正解したか(生成問題のみ) */
  variantCleared: boolean;
  variantTries: number;
  cleared: boolean;
  clearedAt?: number;
  updatedAt: number;
}

export interface SessionItem {
  q: Question;
  kind: AttemptKind;
  parentQid?: string;
}

export interface Session {
  id: string;
  createdAt: number;
  mode: Mode;
  label: string;
  items: SessionItem[];
  /** 選んだ選択肢の位置。未回答は null */
  answers: (number | null)[];
  /** 各問の所要時間(ms) */
  times: number[];
  /** 学習モードで解説を表示済みか */
  revealed: boolean[];
  index: number;
  /** 実戦モード: 全体の制限時間 / speed: 1問あたりの制限時間 */
  limitMs?: number;
  perQMs?: number;
  /** 実戦モードの経過時間 */
  elapsedMs: number;
  status: 'active' | 'done';
  finishedAt?: number;
}

export interface Settings {
  koMode: 'tap' | 'always';
  theme: 'system' | 'light' | 'dark';
  lastExam: Exam;
  count: number;
  /** 1日の目標問題数 */
  dailyGoal: number;
}

export const DEFAULT_SETTINGS: Settings = { koMode: 'tap', theme: 'system', lastExam: 'SPI', count: 10, dailyGoal: 10 };

export function localDay(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
