import { Frac, F } from '../core/frac';
import { decStr, fracStr, num } from '../core/format';

/** 小数点以下 maxDigits 桁以内の有限小数なら文字列、そうでなければ null */
export function decOK(v: Frac, maxDigits: number): string | null {
  if (!v.isTerminating()) return null;
  const s = decStr(v);
  const i = s.indexOf('.');
  if (i >= 0 && s.length - i - 1 > maxDigits) return null;
  return s;
}

export const fYen = (v: Frac) => (v.isInt() ? `${num(v)}円` : null);
export const fInt = (unit: string) => (v: Frac) => (v.isInt() ? `${num(v)}${unit}` : null);
export const fDec = (unit: string, digits = 2) => (v: Frac) => {
  const s = decOK(v, digits);
  return s === null ? null : `${s}${unit}`;
};
/** 割合(0.35)→「35%」。小数第 digits 位まで */
export const fPct = (digits = 1) => (v: Frac) => {
  const s = decOK(v.mul(100), digits);
  return s === null ? null : `${s}%`;
};
export const fFrac = (v: Frac) => fracStr(v);

/** 0.3 → "0.3"、1.25 → "1.25" (式の中で使う) */
export const d = (v: Frac | number) => num(v);

/** 割(1割=0.1) */
export const wari = (k: number) => F(k, 10);
