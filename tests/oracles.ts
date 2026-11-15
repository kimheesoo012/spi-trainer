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
    const round = (n: bigint, d: bigint) => (2n * n + d) / (2n * d); // 四捨五入(正の数)
    const ans = qn.choices[qn.answer];
    const cell = (c: string) => evaluate(c.replace('%', '')).n;
    // ---- グラフの問題(数値は qn.charts から読む)
    const ch = qn.charts ?? [];
    const big = (xs: number[]) => xs.map((x) => BigInt(x));
    const total = (i: number) => evaluate((ch[i].note ?? '').replace(/[^\d,]/g, '')).n;
    const uniqueMax = (xs: [bigint, bigint][]): number => {
      // 分数 xs[k] = [分子, 分母](分母は正)の最大がただ1つならその位置、そうでなければ -1
      let b = 0;
      for (let k = 1; k < xs.length; k++) if (xs[k][0] * xs[b][1] > xs[b][0] * xs[k][1]) b = k;
      return xs.some((x, k) => k !== b && x[0] * xs[b][1] === xs[b][0] * x[1]) ? -1 : b;
    };
    switch (p.template) {
      case 'barTimes': {
        const v = big(ch[0].series[0].values);
        const [a, b] = [Number(p.a), Number(p.b)];
        if (!qn.question_ja.includes(`${ch[0].labels[a]}年度の売上高は、${ch[0].labels[b]}年度の売上高の`)) return 'barTimes: wrong years';
        return expect(qn, q(round(v[a] * 10n, v[b]), 10n));
      }
      case 'barMaxRate': {
        const v = big(ch[0].series[0].values);
        const b = uniqueMax(v.slice(1).map((x, k) => [x - v[k], v[k]] as [bigint, bigint]));
        if (b < 0) return 'barMaxRate: tie';
        const who = `${ch[0].labels[b + 1]}年度`;
        return who === ans ? null : `barMaxRate: ${ans} vs ${who}`;
      }
      case 'pieAmount':
      case 'pieDiff': {
        const s = big(ch[0].series[0].values);
        if (s.reduce((a, b) => a + b, 0n) !== 100n) return 'pie: shares do not sum to 100';
        if (p.template === 'pieAmount') {
          if (!qn.question_ja.includes(`${ch[0].labels[Number(p.c)]}の売上高は`)) return 'pieAmount: wrong item';
          return expect(qn, q(total(0) * s[Number(p.c)], 100n));
        }
        const [hi, lo] = [Number(p.hi), Number(p.lo)];
        if (!qn.question_ja.includes(`${ch[0].labels[hi]}と${ch[0].labels[lo]}の売上高の差`)) return 'pieDiff: wrong items';
        return expect(qn, q(total(0) * (s[hi] - s[lo]), 100n));
      }
      case 'pie2Change': {
        const [s1, s2] = [big(ch[0].series[0].values), big(ch[1].series[0].values)];
        if (s1.reduce((a, b) => a + b, 0n) !== 100n || s2.reduce((a, b) => a + b, 0n) !== 100n) return 'pie2: shares do not sum to 100';
        if (!ch[0].caption.includes('2023年') || !ch[1].caption.includes('2024年')) return 'pie2: wrong order of years';
        const c = Number(p.c);
        if (!qn.question_ja.includes(`${ch[0].labels[c]}の売上高は`)) return 'pie2Change: wrong item';
        return expect(qn, q(total(1) * s2[c] - total(0) * s1[c], 100n));
      }
      case 'lineMaxGap': {
        const [E, I] = [big(ch[0].series[0].values), big(ch[0].series[1].values)];
        if (ch[0].series[0].name !== '輸出額' || ch[0].series[1].name !== '輸入額') return 'line: wrong series';
        const b = uniqueMax(E.map((e, k) => [e - I[k], 1n] as [bigint, bigint]));
        if (b < 0 || E[b] <= I[b]) return 'lineMaxGap: tie or no surplus';
        return ch[0].labels[b] === ans ? null : `lineMaxGap: ${ans} vs ${ch[0].labels[b]}`;
      }
      case 'lineRatio': {
        const [E, I] = [big(ch[0].series[0].values), big(ch[0].series[1].values)];
        const y = Number(p.y);
        if (!qn.question_ja.includes(`${ch[0].labels[y]}の輸入額は、同じ年の輸出額の`)) return 'lineRatio: wrong year';
        return expect(qn, q(round(I[y] * 100n, E[y]), 100n));
      }
      case 'densityMax': {
        const b = uniqueMax(t.rows.map((r) => [cell(r[1]), cell(r[2])] as [bigint, bigint]));
        if (b < 0) return 'densityMax: tie';
        return t.rows[b][0] === ans ? null : `densityMax: ${ans} vs ${t.rows[b][0]}`;
      }
      case 'indexAmount': {
        const [c, y] = [Number(p.c), Number(p.y)];
        if (!qn.question_ja.includes(`${t.rows[c][0]}の${t.headers[2 + y]}の生産台数`)) return 'indexAmount: wrong cell';
        return expect(qn, q(cell(t.rows[c][1]) * cell(t.rows[c][2 + y]), 100n));
      }
      case 'indexGrowth': {
        const c = Number(p.c);
        if (!qn.question_ja.includes(`${t.rows[c][0]}の2024年の生産台数は、2022年に比べて`)) return 'indexGrowth: wrong row';
        const [i1, i2] = [cell(t.rows[c][2]), cell(t.rows[c][3])];
        if (t.headers[2] !== '2022年' || t.headers[3] !== '2024年') return 'indexGrowth: wrong columns';
        return expect(qn, q(round((i2 - i1) * 100n, i1), 100n));
      }
    }
    if (p.template === 'compAmount' || p.template === 'compTimes') {
      const s = t.rows.slice(0, 5).map((r) => r.slice(1).map(cell));
      const T = t.rows[5].slice(1).map(cell);
      for (let y = 0; y < 3; y++) if (s.reduce((a, r) => a + r[y], 0n) !== 100n) return 'comp: shares do not sum to 100';
      const c = Number(p.c);
      if (!qn.question_ja.includes(String(t.rows[c][0]))) return 'comp: wrong row';
      if (p.template === 'compAmount') {
        const y = Number(p.y);
        if (!qn.question_ja.includes(t.headers[y + 1])) return 'comp: wrong year';
        return expect(qn, q(round(T[y] * s[c][y], 100n), 1n));
      }
      return expect(qn, q(round(T[2] * s[c][2] * 10n, T[1] * s[c][1]), 10n));
    }
    if (p.template === 'prevFromRate') {
      const c = Number(p.c);
      if (!qn.question_ja.includes(String(t.rows[c][0]))) return 'prevFromRate: wrong row';
      return expect(qn, q(round(cell(t.rows[c][1]) * 100n, 100n + cell(t.rows[c][2])), 1n));
    }
    const v = t.rows.map((r) => r.slice(1).map((c) => evaluate(c).n)); // [国][年]
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
  ryokin: (qn) => {
    const p = P(qn);
    const t = qn.question_ja;
    const g = (re: RegExp) => {
      const m = re.exec(t);
      if (!m) throw new Error(`ryokin: no match ${re}`);
      return m.slice(1).map((x) => evaluate(x).n);
    };
    const [price] = g(/1人([\d,]+)円である/);
    const [limit] = g(/(\d+)人を超える団体は/);
    const [limit2] = g(/、(\d+)人を超えた分の人数/);
    const [r] = g(/入場料が(\d)割引になる/);
    if (limit !== limit2) return 'ryokin: limit mismatch';
    // n 人の総額 × 10(割引は 10 − r 割)
    const cost10 = (n: bigint) => price * (10n * (n < limit ? n : limit) + (10n - r) * (n > limit ? n - limit : 0n));
    switch (p.template) {
      case 'groupTotal': {
        const [m] = g(/。(\d+)人の団体で入場するとき、入場料の総額/);
        return expect(qn, q(cost10(m), 10n));
      }
      case 'groupAverage': {
        const [m] = g(/。(\d+)人の団体で入場するとき、1人あたりの入場料は平均/);
        return expect(qn, q(cost10(m), 10n * m));
      }
      case 'splitVsTogether': {
        const [a, b] = g(/。(\d+)人の団体と(\d+)人の団体が、別々に入場する場合と、まとめて1つの団体として/);
        return expect(qn, q(cost10(a) + cost10(b) - cost10(a + b), 10n));
      }
    }
    return `unknown template ${p.template}`;
  },
  seisan: (qn) => {
    const p = P(qn);
    const t = qn.question_ja;
    const g = (re: RegExp) => {
      const m = re.exec(t);
      if (!m) throw new Error(`seisan: no match ${re}`);
      return m.slice(1).map((x) => evaluate(x).n);
    };
    switch (p.template) {
      case 'equalShare3': {
        const [a, b] = g(/Xが([\d,]+)円、Yが([\d,]+)円を支払い、Zは支払っていない/);
        return expect(qn, q(a + b, 3n));
      }
      case 'payToX': {
        const [a, b, c] = g(/Xが宿泊費([\d,]+)円、Yが交通費([\d,]+)円、Zが食事代([\d,]+)円を支払った/);
        if (!t.includes('ZはXにいくら支払えばよいか')) return 'payToX: wrong question';
        // Y と Z が負担額より少なく、X だけが多く支払っていること(支払い先が X に決まる条件)
        if (!(3n * b < a + b + c && 3n * c < a + b + c)) return 'payToX: receiver is not unique';
        return expect(qn, q(a + b + c - 3n * c, 3n));
      }
      case 'withDebt': {
        const [loan] = g(/XはYに([\d,]+)円を借りている/);
        const [a, b] = g(/Xが([\d,]+)円、Yが([\d,]+)円を支払った/);
        if (!t.includes('XはYにいくら支払えばよいか')) return 'withDebt: wrong question';
        const want = q(2n * loan + b - a, 2n);
        if (want.n <= 0n) return 'withDebt: X does not pay';
        return expect(qn, want);
      }
    }
    return `unknown template ${p.template}`;
  },
  bunkatsu: (qn) => {
    const p = P(qn);
    const t = qn.question_ja;
    const g = (re: RegExp) => {
      const m = re.exec(t);
      if (!m) throw new Error(`bunkatsu: no match ${re}`);
      return m.slice(1).map((x) => BigInt(x));
    };
    switch (p.template) {
      case 'afterDeposit': {
        const [a, n] = g(/頭金として総額の1\/(\d+)を支払い、残りを(\d+)回の均等払いにする。分割手数料はかからないものとする。均等払いの1回分は/);
        return expect(qn, q(a - 1n, a * n));
      }
      case 'twoDeposits': {
        const [a, b, n] = g(/契約時に総額の1\/(\d+)を、納品時に総額の1\/(\d+)を支払い、残りを(\d+)回の均等払い/);
        return expect(qn, q(a * b - a - b, a * b * n));
      }
      case 'paidSoFar': {
        const [a, n] = g(/頭金として総額の1\/(\d+)を支払い、残りを(\d+)回の均等払いにする/);
        const [k] = g(/均等払いの(\d+)回目を支払い終えた時点で、支払い済みの額/);
        if (k >= n) return 'paidSoFar: k out of range';
        return expect(qn, q(n + k * (a - 1n), a * n));
      }
      case 'withFee': {
        const [a, n] = g(/頭金として総額の1\/(\d+)を支払い、残額を(\d+)回の均等払いにする/);
        const [f] = g(/残額の1\/(\d+)にあたる分割手数料が残額に加算され/);
        return expect(qn, q((a - 1n) * (f + 1n), a * f * n));
      }
    }
    return `unknown template ${p.template}`;
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
