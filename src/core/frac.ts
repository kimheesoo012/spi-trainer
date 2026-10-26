// 有理数(分数)。生成器の計算はすべてこれで行い、浮動小数点は使わない。

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function safe(n: number): number {
  if (!Number.isSafeInteger(n)) throw new Error(`Frac overflow: ${n}`);
  return n;
}

export class Frac {
  readonly n: number;
  readonly d: number;

  constructor(n: number, d = 1) {
    if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error(`Frac needs integers: ${n}/${d}`);
    if (d === 0) throw new Error('Frac: division by zero');
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1;
    this.n = safe(n / g);
    this.d = safe(d / g);
  }

  static of(n: number, d = 1): Frac {
    return new Frac(n, d);
  }

  /** "12.5" のような有限小数文字列から作る */
  static dec(s: string): Frac {
    const neg = s.startsWith('-');
    const t = neg ? s.slice(1) : s;
    const [i, f = ''] = t.split('.');
    const v = new Frac(Number(i + f), 10 ** f.length);
    return neg ? v.neg() : v;
  }

  add(o: Frac | number): Frac {
    const b = toF(o);
    return new Frac(safe(this.n * b.d + b.n * this.d), safe(this.d * b.d));
  }
  sub(o: Frac | number): Frac {
    return this.add(toF(o).neg());
  }
  mul(o: Frac | number): Frac {
    const b = toF(o);
    return new Frac(safe(this.n * b.n), safe(this.d * b.d));
  }
  div(o: Frac | number): Frac {
    const b = toF(o);
    if (b.n === 0) throw new Error('Frac: division by zero');
    return new Frac(safe(this.n * b.d), safe(this.d * b.n));
  }
  neg(): Frac {
    return new Frac(-this.n, this.d);
  }
  inv(): Frac {
    return new Frac(this.d, this.n);
  }
  eq(o: Frac | number): boolean {
    const b = toF(o);
    return this.n === b.n && this.d === b.d;
  }
  cmp(o: Frac | number): number {
    const b = toF(o);
    return Math.sign(this.n * b.d - b.n * this.d);
  }
  lt(o: Frac | number): boolean {
    return this.cmp(o) < 0;
  }
  gt(o: Frac | number): boolean {
    return this.cmp(o) > 0;
  }
  isInt(): boolean {
    return this.d === 1;
  }
  isPos(): boolean {
    return this.n > 0;
  }
  /** 10進の有限小数で表せるか(分母が2と5だけ) */
  isTerminating(): boolean {
    let d = this.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  }
  /** 小数点以下 digits 桁に四捨五入(0.5は切り上げ。正の数を想定) */
  round(digits = 0): Frac {
    const p = 10 ** digits;
    const scaled = this.mul(p);
    const sign = scaled.n < 0 ? -1 : 1;
    const a = Math.abs(scaled.n);
    const q = Math.floor(a / scaled.d);
    const r = a - q * scaled.d;
    const rounded = 2 * r >= scaled.d ? q + 1 : q;
    return new Frac(sign * rounded, p);
  }
  floor(): number {
    return Math.floor(this.n / this.d);
  }
  /** 表示・近似比較専用。計算には使わない */
  approx(): number {
    return this.n / this.d;
  }
  toJSON(): string {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }
}

export function toF(x: Frac | number): Frac {
  return x instanceof Frac ? x : new Frac(x, 1);
}

export const F = (n: number, d = 1) => new Frac(n, d);

export function fracGcd(a: number, b: number): number {
  return gcd(a, b);
}
