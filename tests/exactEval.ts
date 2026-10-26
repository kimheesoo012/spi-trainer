// テスト専用の独立した式評価器(BigInt の有理数)。
// アプリ側の Frac とは別実装にして、解説の式とアプリの計算を突き合わせる。

export interface Q {
  n: bigint;
  d: bigint;
}

const abs = (a: bigint) => (a < 0n ? -a : a);
function g(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export function q(n: bigint, d = 1n): Q {
  if (d === 0n) throw new Error('div0');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const k = g(n, d) || 1n;
  return { n: n / k, d: d / k };
}
const add = (a: Q, b: Q) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Q, b: Q) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Q, b: Q) => q(a.n * b.n, a.d * b.d);
const div = (a: Q, b: Q) => q(a.n * b.d, a.d * b.n);
export const qeq = (a: Q, b: Q) => a.n === b.n && a.d === b.d;
export const qnum = (a: Q) => Number(a.n) / Number(a.d);

function fact(n: bigint): bigint {
  let r = 1n;
  for (let i = 2n; i <= n; i++) r *= i;
  return r;
}
function perm(n: bigint, k: bigint): bigint {
  let r = 1n;
  for (let i = 0n; i < k; i++) r *= n - i;
  return r;
}

/** 数値文字列(3桁区切り・小数OK)を有理数に */
export function parseNumber(s: string): Q {
  const t = s.replace(/,/g, '');
  const [i, f = ''] = t.split('.');
  return q(BigInt(i + f), 10n ** BigInt(f.length));
}

type Tok = { t: 'num'; v: Q } | { t: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const s = src.replace(/（/g, '(').replace(/）/g, ')').replace(/−/g, '-').replace(/\s+/g, '');
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    const m = /^\d{1,3}(,\d{3})+(\.\d+)?|^\d+(\.\d+)?/.exec(s.slice(i));
    if (m) {
      out.push({ t: 'num', v: parseNumber(m[0]) });
      i += m[0].length;
      continue;
    }
    if ('+-×÷*/()%!CP'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`unexpected '${c}' in "${src}"`);
  }
  return out;
}

/** 四則演算・かっこ・%・!・nCr・nPr を評価する */
export function evaluate(src: string): Q {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek().v === v;

  function primary(): Q {
    const tk = toks[p++];
    if (!tk) throw new Error(`unexpected end: ${src}`);
    if (tk.t === 'num') return tk.v;
    if (tk.v === '(') {
      const v = expr();
      if (!isOp(')')) throw new Error(`missing ) in ${src}`);
      p++;
      return v;
    }
    if (tk.v === '-') return mul(q(-1n), postfix());
    throw new Error(`bad token ${tk.v} in ${src}`);
  }
  function postfix(): Q {
    let v = primary();
    for (;;) {
      if (isOp('%')) {
        p++;
        v = div(v, q(100n));
      } else if (isOp('!')) {
        p++;
        v = q(fact(v.n));
      } else if (isOp('C') || isOp('P')) {
        const op = toks[p++].v;
        const k = primary();
        const pr = perm(v.n, k.n);
        v = op === 'P' ? q(pr) : q(pr / fact(k.n));
      } else return v;
    }
  }
  function term(): Q {
    let v = postfix();
    for (;;) {
      if (isOp('×') || isOp('*')) {
        p++;
        v = mul(v, postfix());
      } else if (isOp('÷') || isOp('/')) {
        p++;
        v = div(v, postfix());
      } else return v;
    }
  }
  function expr(): Q {
    let v = term();
    for (;;) {
      if (isOp('+')) {
        p++;
        v = add(v, term());
      } else if (isOp('-')) {
        p++;
        v = sub(v, term());
      } else return v;
    }
  }
  const v = expr();
  if (p !== toks.length) throw new Error(`trailing tokens in "${src}"`);
  return v;
}

/** 文中の {{ ... }} をすべて取り出す */
export function mathSegments(text: string): string[] {
  return [...text.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1]);
}

/**
 * 「a = b ≒ c」の連鎖を確かめる。= は完全一致、≒ は相対誤差 tol 以内。
 * 失敗したら理由を返す。
 */
export function checkChain(seg: string, tol = 0.08): string | null {
  const parts = seg.split(/(=|≒)/);
  const vals: Q[] = [];
  const rels: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) rels.push(parts[i]);
    else {
      try {
        vals.push(evaluate(parts[i]));
      } catch (e) {
        return `parse error in {{${seg}}}: ${(e as Error).message}`;
      }
    }
  }
  if (vals.length < 2) return `no relation in {{${seg}}}`;
  for (let i = 0; i < rels.length; i++) {
    const a = vals[i];
    const b = vals[i + 1];
    if (rels[i] === '=') {
      if (!qeq(a, b)) return `not equal: {{${seg}}} (${qnum(a)} vs ${qnum(b)})`;
    } else {
      const x = qnum(a);
      const y = qnum(b);
      if (Math.abs(x - y) > tol * Math.max(Math.abs(x), Math.abs(y), 1e-9)) return `approx too far: {{${seg}}}`;
    }
  }
  return null;
}
