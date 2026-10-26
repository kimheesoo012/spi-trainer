import { parseNumber, q, type Q } from './exactEval';

/** 選択肢の文字列を値に直す(アプリの計算とは独立)。数値でなければ null */
export function choiceValue(text: string): Q | null {
  let t = text.replace(/^約/, '').replace(/^(時速|分速|秒速)/, '').trim();
  if (t === '増減なし') return q(0n);
  let sign = 1n;
  if (/増$/.test(t)) t = t.slice(0, -1);
  else if (/減$/.test(t)) {
    t = t.slice(0, -1);
    sign = -1n;
  }
  const m = /^(-?[\d,]+(?:\.\d+)?)(?:\/(\d+))?\s*(%|円|人|日|分|時間|km|m|通り|倍|個|台|万人|万台|億円|万円|kg|回|点|歳|ポイント|分後|時間後)?$/.exec(t);
  if (!m) return null;
  let v = parseNumber(m[1].replace('-', ''));
  if (m[1].startsWith('-')) sign = -sign;
  if (m[2]) v = q(v.n, v.d * BigInt(m[2]));
  if (m[3] === '%') v = q(v.n, v.d * 100n);
  return q(sign * v.n, v.d);
}

