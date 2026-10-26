import { Frac, toF } from './frac';

/** 3桁区切り(1000以上) */
export function comma(n: number): string {
  const neg = n < 0;
  const s = String(Math.abs(n));
  const out = s.length > 3 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
  return neg ? `-${out}` : out;
}

/** 有限小数なら小数で、そうでなければ分数で表す */
export function num(x: Frac | number): string {
  const f = toF(x);
  if (f.isInt()) return comma(f.n);
  if (f.isTerminating()) return decStr(f);
  return fracStr(f);
}

/** 必ず分数で表す(整数なら整数) */
export function fracStr(x: Frac | number): string {
  const f = toF(x);
  if (f.isInt()) return comma(f.n);
  return `${f.n < 0 ? '-' : ''}${Math.abs(f.n)}/${f.d}`;
}

/** 有限小数の文字列。整数部に3桁区切りを付ける */
export function decStr(f: Frac): string {
  if (!f.isTerminating()) throw new Error('not terminating');
  const neg = f.n < 0;
  let n = Math.abs(f.n);
  let d = f.d;
  let digits = 0;
  while (d !== 1) {
    // 分母を10の累乗にそろえる
    if (d % 10 === 0) d /= 10;
    else if (d % 2 === 0) {
      n *= 5;
      d /= 2;
    } else {
      n *= 2;
      d /= 5;
    }
    digits++;
  }
  // ここで値 = n / 10^digits
  const s = String(n).padStart(digits + 1, '0');
  const ip = s.slice(0, s.length - digits);
  const fp = s.slice(s.length - digits).replace(/0+$/, '');
  return `${neg ? '-' : ''}${comma(Number(ip))}${fp ? '.' + fp : ''}`;
}

/** 割合(0.25)を「25%」に */
export function pct(x: Frac | number): string {
  return `${num(toF(x).mul(100))}%`;
}

export const yen = (x: Frac | number) => `${num(x)}円`;
