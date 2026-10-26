export type Exam = 'SPI' | 'SHL';
export type Difficulty = 1 | 2 | 3;

export interface TableData {
  caption?: string;
  headers: string[];
  rows: string[][];
  note?: string;
}

/** 画面に出す1問。生成問題もJSON問題もこの形にそろえる */
export interface Question {
  id: string;
  source: 'gen' | 'bank';
  exam: Exam;
  typeId: string;
  test_name: string;
  category: string;
  difficulty: Difficulty;
  passage_ja?: string;
  question_ja: string;
  table?: TableData;
  /** 表示順(シャッフル済み) */
  choices: string[];
  /** choices の中の正解の位置 */
  answer: number;
  explanation_short_ja: string;
  /** 正攻法の手順 */
  steps_ja: string[];
  /** 速解きの手順 */
  quick_ja: string[];
  explanation_ko: string;
  tip?: string;
  /** 生成問題の復元用 */
  gen?: { seed: number; params: Record<string, unknown> };
}

/** 問題JSON(直接作成問題)の1件 */
export interface BankItem {
  id: string;
  exam: Exam;
  test_name: string;
  category: string;
  difficulty: Difficulty;
  passage_ja?: string;
  question_ja: string;
  choices: string[];
  /** 正解の選択肢の文字列(choices のどれかと完全一致) */
  answer: string;
  explanation_short_ja: string;
  /** 手順の配列。文字列1つでもよい */
  explanation_detail_ja: string[] | string;
  explanation_ko: string;
  tip: string;
  /** 二重チェックが済んでいるか。false の問題は出題しない */
  reviewed: boolean;
}
