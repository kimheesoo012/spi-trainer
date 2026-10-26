// 生成器ごとの「別ルートの答え合わせ」。問題文・パラメータから、アプリと独立に答えを計算する。
import type { Question } from '../src/core/types';
import { evaluate, q, qeq, type Q } from './exactEval';
import { choiceValue } from './choiceValue';

type Oracle = (qn: Question) => string | null;

const B = (x: unknown) => BigInt(x as number);
const P = (qn: Question) => qn.gen!.params as Record<string, unknown>;
const ansVal = (qn: Question) => choiceValue(qn.choices[qn.answer]);

function expect(qn: Question, want: Q): string | null {
  const got = ansVal(qn);
  if (!got) return `answer not numeric: ${qn.choices[qn.answer]}`;
  return qeq(got, want) ? null : `oracle mismatch: ${qn.choices[qn.answer]} vs ${Number(want.n) / Number(want.d)}`;
}

/** 問題文から数値をすべて抜き出す */
function nums(text: string): Q[] {
  return [...text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)].map((m) => evaluate(m[0]));
}

export const ORACLES: Record<string, Oracle> = {
  shisoku: (qn) => {
    const line = qn.question_ja.split('\n').find((l) => l.includes('□') && l.includes('='))!;
    const [l, r] = line.split('=');
    const sat = qn.choices.filter((c) => {
      const v = choiceValue(c);
      if (!v) return false;
      const lhs = evaluate(l.replace('□', `(${v.n}/${v.d})`));
      return qeq(lhs, evaluate(r));
    });
    if (sat.length !== 1) return `shisoku: ${sat.length} choices satisfy ${line}`;
    if (sat[0] !== qn.choices[qn.answer]) return `shisoku: wrong answer for ${line}`;
    return null;
  },
  wariai: (qn) => {
    const p = P(qn);
    const ns = nums(qn.question_ja);
    switch (p.template) {
      case 'participation': // 定員N, 参加者M → M/N
        return expect(qn, q(ns[1].n * ns[0].d, ns[1].d * ns[0].n));
      case 'percentOf': // 代金の p% … X円 → X × p/100
        return expect(qn, q(ns[0].n * ns[1].n, 100n * ns[0].d * ns[1].d));
      case 'successive': {
        const a = B(p.a);
        const b = B(p.b);
        return expect(qn, q((100n + a) * (100n - b) - 10000n, 10000n));
      }
      case 'partOfPart': {
        const [a, b] = String(p.f1).split('/').map(BigInt);
        const [c, d] = String(p.f2).split('/').map(BigInt);
        return expect(qn, q(a * c, b * d));
      }
      case 'reverseGrowth': // 今年N, p% → N/(1+p/100)
        return expect(qn, q(ns[0].n * 100n, ns[0].d * (100n + ns[1].n)));
      case 'mixedRate': {
        const [x, pp, y, qq] = [ns[0].n, ns[1].n, ns[2].n, ns[3].n];
        return expect(qn, q(x * pp + y * qq, 100n * (x + y)));
      }
    }
    return `unknown template ${p.template}`;
  },
  soneki: (qn) => {
    const p = P(qn);
    const ns = nums(qn.question_ja);
    switch (p.template) {
      case 'listPrice': // 原価C, a割
        return expect(qn, q(ns[0].n * (10n + ns[1].n), 10n));
      case 'discountPrice':
        return expect(qn, q(ns[0].n * (10n - ns[1].n), 10n));
      case 'profitAfterDiscount': {
        const [C, a, b] = [ns[0].n, ns[1].n, ns[2].n];
        return expect(qn, q(C * (10n + a) * (10n - b) - 100n * C, 100n));
      }
      case 'costFromProfit': {
        // 原価x: x(1+a/10)(1-b/10) - x = G を総当たりで解く(100円単位)
        const [a, b, G] = [ns[0].n, ns[1].n, ns[2].n];
        const sols: bigint[] = [];
        for (let x = 100n; x <= 20000n; x += 100n) if (x * (10n + a) * (10n - b) - 100n * x === 100n * G) sols.push(x);
        if (sols.length !== 1) return `costFromProfit: ${sols.length} solutions`;
        return expect(qn, q(sols[0]));
      }
      case 'lossAndGain': {
        const [G, b, L] = [ns[0].n, ns[1].n, ns[2].n];
        const sols: bigint[] = [];
        for (let x = 10n; x <= 20000n; x += 10n) {
          const T = x + G;
          if (T * (10n - b) === 10n * (x - L)) sols.push(x);
        }
        if (sols.length !== 1) return `lossAndGain: ${sols.length} solutions`;
        return expect(qn, q(sols[0]));
      }
    }
    return `unknown template ${p.template}`;
  },

  hayasa: (qn) => {
    const p = P(qn);
    const ns = nums(qn.question_ja);
    switch (p.template) {
      case 'distanceKm':
        return expect(qn, q(ns[0].n * ns[1].n, 60n));
      case 'minutesWalk':
        return expect(qn, q(ns[1].n * 1000n, ns[1].d * ns[0].n));
      case 'roundTrip': {
        const [a, b] = [ns[0].n, ns[1].n];
        return expect(qn, q(2n * a * b, a + b));
      }
      case 'meetOrChase': {
        const [L, a, b] = [ns[1].n, ns[2].n, ns[3].n]; // 「1周L m」の1が先頭
        const rel = p.opposite ? a + b : a > b ? a - b : b - a;
        return expect(qn, q(L, rel));
      }
      case 'chaseLater': {
        const [a, t, b] = [ns[0].n, ns[1].n, ns[2].n];
        return expect(qn, q(a * t, b - a));
      }
    }
    return `unknown template ${p.template}`;
  },
  shigoto: (qn) => {
    const p = P(qn);
    // 「1人で」の 1 を拾わないよう、日数・分数・日間だけを取り出す
    const ns = [...qn.question_ja.matchAll(/(\d+)(?:日|分)/g)].map((m) => BigInt(m[1]));
    switch (p.template) {
      case 'together': {
        const [a, b] = ns;
        return expect(qn, q(a * b, a + b));
      }
      case 'thenAlone': {
        const [a, b, k] = ns;
        // B の日数 = (1 − k/a − k/b) × b
        return expect(qn, q((a * b - k * b - k * a) * b, a * b));
      }
      case 'tank': {
        const [a, b, c] = ns;
        return expect(qn, q(a * b * c, b * c + a * c - a * b));
      }
    }
    return `unknown template ${p.template}`;
  },
  shugo: (qn) => {
    const p = P(qn);
    const ns = nums(qn.question_ja).map((x) => x.n);
    switch (p.template) {
      case 'twoSetsBoth': {
        const [N, A, B, none] = ns;
        return expect(qn, q(A + B + none - N));
      }
      case 'twoSetsNone': {
        const [N, A, B, both] = ns;
        return expect(qn, q(N - A - B + both));
      }
      case 'twoSetsOnlyA': {
        const [N, , B, none] = ns;
        return expect(qn, q(N - none - B));
      }
      case 'threeSets': {
        const [N, A, B, C, AB, BC, AC, ABC] = [...qn.question_ja.matchAll(/(\d+)人/g)].map((m) => BigInt(m[1]));
        return expect(qn, q(N - (A + B + C - AB - BC - AC + ABC)));
      }
    }
    return `unknown template ${p.template}`;
  },
  kakuritsu: (qn) => {
    const p = P(qn);
    let fav = 0n;
    let tot = 0n;
    switch (p.template) {
      case 'diceSum':
        for (let a = 1; a <= 6; a++)
          for (let b = 1; b <= 6; b++) {
            tot++;
            if (p.atLeast ? a + b >= Number(p.s) : a + b === Number(p.s)) fav++;
          }
        break;
      case 'cardMultiple':
        for (let i = 1; i <= Number(p.N); i++) {
          tot++;
          if (i % Number(p.k) === 0 || i % Number(p.m) === 0) fav++;
        }
        break;
      case 'drawTwo': {
        // 順番付きで2個取り出す(戻さない)場合を数えても同じ確率になる
        const r = Number(p.r);
        const n = r + Number(p.w);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            tot++;
            const ri = i < r;
            const rj = j < r;
            if (p.mode === 'bothRed' ? ri && rj : ri !== rj) fav++;
          }
        break;
      }
      case 'dice6': {
        const n = Number(p.n);
        for (let m = 0; m < 6 ** n; m++) {
          tot++;
          let x = m;
          let has = false;
          for (let i = 0; i < n; i++) {
            if (x % 6 === 5) has = true;
            x = Math.floor(x / 6);
          }
          if (has) fav++;
        }
        break;
      }
      case 'coinsExact': {
        const n = Number(p.n);
        for (let m = 0; m < 2 ** n; m++) {
          tot++;
          if (m.toString(2).split('').filter((c) => c === '1').length === Number(p.k)) fav++;
        }
        break;
      }
      case 'lottery': {
        const n = Number(p.n);
        const a = Number(p.a);
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            tot++;
            if (i < a || j < a) fav++;
          }
        break;
      }
      default:
        return `unknown template ${p.template}`;
    }
    return expect(qn, q(fav, tot));
  },
  baai: (qn) => {
    const p = P(qn);
    const n = Number(p.n);
    // 並べ方をすべて作る(n ≦ 10、長さ k)
    const seqs = (pool: number, k: number): number[][] => {
      const out: number[][] = [];
      const rec = (cur: number[]) => {
        if (cur.length === k) return void out.push(cur);
        for (let i = 0; i < pool; i++) if (!cur.includes(i)) rec([...cur, i]);
      };
      rec([]);
      return out;
    };
    switch (p.template) {
      case 'arrange':
        return expect(qn, q(BigInt(seqs(n, Number(p.k)).length)));
      case 'choose': {
        const k = Number(p.k);
        return expect(qn, q(BigInt(seqs(n, k).filter((s) => s.every((v, i) => i === 0 || s[i - 1] < v)).length)));
      }
      case 'atLeastOneWoman': {
        const m = Number(p.m);
        const k = Number(p.k);
        const all = seqs(m + Number(p.f), k).filter((s) => s.every((v, i) => i === 0 || s[i - 1] < v));
        return expect(qn, q(BigInt(all.filter((s) => s.some((v) => v >= m)).length)));
      }
      case 'digits':
      case 'digitsEven': {
        const all = seqs(n + 1, 3).filter((s) => s[0] !== 0 && (p.template === 'digits' || s[2] % 2 === 0));
        return expect(qn, q(BigInt(all.length)));
      }
      case 'adjacent': {
        const all = seqs(n, n).filter((s) => Math.abs(s.indexOf(0) - s.indexOf(1)) === 1);
        return expect(qn, q(BigInt(all.length)));
      }
      case 'circle': {
        // 回転で重なるものを同一視: 文字列の最小回転を代表にする
        const reps = new Set(
          seqs(n, n).map((s) => {
            const rots = s.map((_, i) => [...s.slice(i), ...s.slice(0, i)].join(''));
            return rots.sort()[0];
          }),
        );
        return expect(qn, q(BigInt(reps.size)));
      }
    }
    return `unknown template ${p.template}`;
  },
  zuhyo: (qn) => {
    const p = P(qn);
    const t = qn.table!;
    const v = t.rows.map((r) => r.slice(1).map((c) => evaluate(c).n)); // [国][年]
    const round = (n: bigint, d: bigint) => (2n * n + d) / (2n * d); // 四捨五入(正の数)
    const ans = qn.choices[qn.answer];
    switch (p.template) {
      case 'share': {
        const c = Number(p.c);
        const tot = v.reduce((s, r) => s + r[2], 0n);
        return expect(qn, q(round(v[c][2] * 100n, tot), 100n));
      }
      case 'growth': {
        const c = Number(p.c);
        return expect(qn, q(round((v[c][2] - v[c][1]) * 100n, v[c][1]), 100n));
      }
      case 'ratioTimes': {
        const [i, j] = [Number(p.i), Number(p.j)];
        return expect(qn, q(round(v[i][2] * 10n, v[j][2]), 10n));
      }
      case 'maxIncrease': {
        const inc = v.map((r) => r[2] - r[0]);
        const mx = inc.reduce((a, b) => (b > a ? b : a));
        const who = t.rows.filter((_, i) => inc[i] === mx).map((r) => r[0]);
        if (who.length !== 1) return 'maxIncrease: tie';
        return who[0] === ans ? null : `maxIncrease: ${ans} vs ${who[0]}`;
      }
    }
    return `unknown template ${p.template}`;
  },
  kuuran: (qn) => {
    const t = qn.table!;
    const qi = t.rows.findIndex((r) => r.includes('?'));
    const val = (c: string) => evaluate(c.replace(/(kg|円|人)$/, ''));
    const ys = t.rows.map((r) => (r[r.length - 1] === '?' ? null : val(r[r.length - 1])));
    const xs = t.rows.map((r) => r.slice(0, -1).map(val));
    const withConst = t.headers.length === 2 || t.headers.length === 4 || P(qn).template === 'linear3';
    const rowVec = (i: number) => (withConst ? [q(1n), ...xs[i]] : xs[i]);
    // 既知の行で最小二乗ではなく厳密に解く: ガウス消去
    const known = t.rows.map((_, i) => i).filter((i) => i !== qi);
    const A = known.map((i) => rowVec(i));
    const b = known.map((i) => ys[i]!);
    const n = A[0].length;
    const M = A.map((r, i) => [...r, b[i]]);
    const sub = (x: Q, y: Q) => q(x.n * y.d - y.n * x.d, x.d * y.d);
    const mul = (x: Q, y: Q) => q(x.n * y.n, x.d * y.d);
    const div = (x: Q, y: Q) => q(x.n * y.d, x.d * y.n);
    let row = 0;
    for (let col = 0; col < n; col++) {
      const pr = M.findIndex((r, i) => i >= row && r[col].n !== 0n);
      if (pr < 0) return 'kuuran: not unique';
      [M[row], M[pr]] = [M[pr], M[row]];
      const pv = M[row][col];
      M[row] = M[row].map((x) => div(x, pv));
      for (let r = 0; r < M.length; r++) if (r !== row && M[r][col].n !== 0n) {
        const f = M[r][col];
        M[r] = M[r].map((x, k) => sub(x, mul(f, M[row][k])));
      }
      row++;
    }
    for (let r = row; r < M.length; r++) if (M[r][n].n !== 0n) return 'kuuran: inconsistent';
    const coef = M.slice(0, n).map((r) => r[n]);
    const pred = rowVec(qi).reduce((s, x, i) => { const m = mul(x, coef[i]); return q(s.n * m.d + m.n * s.d, s.d * m.d); }, q(0n));
    return expect(qn, pred);
  },
  shiryo: (qn) => {
    const p = P(qn);
    const t = qn.table!;
    const a = t.rows.map((r) => BigInt(r[1]));
    const b = t.rows.map((r) => BigInt(r[2]));
    const ans = qn.choices[qn.answer];
    if (p.template === 'densityRatio') {
      const [i, j] = [Number(p.i), Number(p.j)];
      const n = a[i] * b[j] * 10n;
      const d = b[i] * a[j];
      return expect(qn, q((2n * n + d) / (2n * d), 10n));
    }
    // 密度(人口 ÷ 面積)または人数(人口 × 割合)の最大
    const score = (i: number) => (p.template === 'densityMax' ? q(a[i], b[i]) : q(a[i] * b[i]));
    const better = (x: Q, y: Q) => x.n * y.d > y.n * x.d;
    let best = 0;
    for (let i = 1; i < t.rows.length; i++) if (better(score(i), score(best))) best = i;
    const ties = t.rows.filter((_, i) => qeq(score(i), score(best))).length;
    if (ties !== 1) return 'shiryo: tie';
    return t.rows[best][0] === ans ? null : `shiryo: ${ans} vs ${t.rows[best][0]}`;
  },
};
