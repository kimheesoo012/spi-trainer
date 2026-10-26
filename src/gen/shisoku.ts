import { F, Frac } from '../core/frac';
import { fracStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, tryF, type Cand, type Draft } from './framework';
import { decOK } from './fmt';

// 玉手箱「四則逆算」: 式の□に入る数を求める

type Fmt = (v: Frac) => string | null;

interface Tpl {
  name: string;
  /** 表示する式(□を含む)。= の右も含む */
  eq: string;
  x: Frac;
  /** 正攻法(式変形)の手順 */
  steps: string[];
  quick: string[];
  wrong: (Frac | null)[];
  why: string[];
  /** 正解を別ルート(両辺の再計算)で確かめるための関数: x を入れた左辺 */
  lhs: (x: Frac) => Frac;
  rhs: Frac;
  ko: string;
}

const s = (v: Frac) => num(v);

function intOps(rng: Rng): Tpl | null {
  const x = F(rng.int(2, 60));
  const a = F(rng.int(2, 12));
  const b = F(rng.int(2, 90));
  const kind = rng.int(0, 3);
  if (kind === 0) {
    // □ × a + b = c
    const c = x.mul(a).add(b);
    return {
      name: 'mulAdd',
      eq: `□ × ${s(a)} + ${s(b)} = ${s(c)}`,
      x,
      steps: [
        `最後に足した ${s(b)} を先に戻す: {{${s(c)} − ${s(b)} = ${s(c.sub(b))}}}`,
        `次に × ${s(a)} を戻す: {{${s(c.sub(b))} ÷ ${s(a)} = ${s(x)}}}`,
      ],
      quick: [
        '逆算は「計算した順番の逆」から戻す。足し算・引き算を先に外し、最後に掛け算・割り算を外す。',
        `時間がないときは選択肢を□に入れ、一の位だけ確かめる: □ × ${s(a)} + ${s(b)} の一の位が ${s(c)} の一の位(${c.n % 10})になるものが候補。`,
      ],
      wrong: [tryF(() => c.add(b).div(a)), tryF(() => c.div(a).sub(b)), c.sub(b).mul(a)],
      why: ['引くべきところを足した', '戻す順番を誤った', '割るべきところを掛けた'],
      lhs: (v) => v.mul(a).add(b),
      rhs: c,
      ko: `거꾸로 계산: ${s(c)} − ${s(b)} = ${s(c.sub(b))}, ${s(c.sub(b))} ÷ ${s(a)} = ${s(x)}. 계산한 순서의 반대로(덧셈·뺄셈 먼저) 되돌립니다.`,
    };
  }
  if (kind === 1) {
    // (□ − a) × b = c
    const aa = F(rng.int(1, Math.max(1, x.n - 1)));
    if (!x.gt(aa)) return null;
    const c = x.sub(aa).mul(a);
    return {
      name: 'subMul',
      eq: `(□ − ${s(aa)}) × ${s(a)} = ${s(c)}`,
      x,
      steps: [
        `外側の × ${s(a)} を先に戻す: {{${s(c)} ÷ ${s(a)} = ${s(c.div(a))}}}`,
        `かっこの中の − ${s(aa)} を戻す: {{${s(c.div(a))} + ${s(aa)} = ${s(x)}}}`,
      ],
      quick: ['かっこがあるときは外側から戻す。', `検算: {{(${s(x)} − ${s(aa)}) × ${s(a)} = ${s(c)}}}`],
      wrong: [c.div(a).sub(aa), tryF(() => c.add(aa).div(a)), c.mul(a).add(aa)],
      why: ['足すべきところを引いた', '戻す順番を誤った', '割るべきところを掛けた'],
      lhs: (v) => v.sub(aa).mul(a),
      rhs: c,
      ko: `괄호 밖의 × ${s(a)}부터 되돌립니다: ${s(c)} ÷ ${s(a)} = ${s(c.div(a))}, 그다음 + ${s(aa)} → ${s(x)}.`,
    };
  }
  if (kind === 2) {
    // □ ÷ a − b = c  (□ は a の倍数)
    const xx = x.mul(a);
    const c = xx.div(a).sub(b);
    if (!c.isPos()) return null;
    return {
      name: 'divSub',
      eq: `□ ÷ ${s(a)} − ${s(b)} = ${s(c)}`,
      x: xx,
      steps: [
        `− ${s(b)} を戻す: {{${s(c)} + ${s(b)} = ${s(c.add(b))}}}`,
        `÷ ${s(a)} を戻す: {{${s(c.add(b))} × ${s(a)} = ${s(xx)}}}`,
      ],
      quick: ['割り算を戻すときは掛け算。', `検算: {{${s(xx)} ÷ ${s(a)} − ${s(b)} = ${s(c)}}}`],
      wrong: [c.sub(b).mul(a), c.mul(a).add(b), tryF(() => c.add(b).div(a))],
      why: ['足すべきところを引いた', '戻す順番を誤った', '掛けるべきところを割った'],
      lhs: (v) => v.div(a).sub(b),
      rhs: c,
      ko: `− ${s(b)}을 되돌려 ${s(c)} + ${s(b)} = ${s(c.add(b))}, ÷ ${s(a)}를 되돌려 × ${s(a)} → ${s(xx)}.`,
    };
  }
  // a − □ × b = c
  const big = x.mul(a).add(F(rng.int(1, 80)));
  const c = big.sub(x.mul(a));
  return {
    name: 'subFromMul',
    eq: `${s(big)} − □ × ${s(a)} = ${s(c)}`,
    x,
    steps: [
      `□ × ${s(a)} は「${s(big)} から引いた数」なので {{${s(big)} − ${s(c)} = ${s(big.sub(c))}}}`,
      `× ${s(a)} を戻す: {{${s(big.sub(c))} ÷ ${s(a)} = ${s(x)}}}`,
    ],
    quick: [`「${s(big)} − ○ = ${s(c)}」なら ○ = ${s(big)} − ${s(c)}。引かれる側・引く側の関係に注意。`, `検算: {{${s(big)} − ${s(x)} × ${s(a)} = ${s(c)}}}`],
    wrong: [tryF(() => big.add(c).div(a)), big.sub(c), tryF(() => c.sub(big).div(a).neg().add(1))],
    why: ['引き算の関係を足し算にした', '× の戻し忘れ', '近い値'],
    lhs: (v) => big.sub(v.mul(a)),
    rhs: c,
    ko: `□ × ${s(a)} = ${s(big)} − ${s(c)} = ${s(big.sub(c))}, 따라서 □ = ${s(big.sub(c))} ÷ ${s(a)} = ${s(x)}.`,
  };
}

function decOps(rng: Rng): Tpl | null {
  const x = F(rng.int(2, 99), 10);
  const a = rng.pick([F(1, 5), F(2, 5), F(1, 2), F(1, 4), F(3, 2), F(5, 2), F(4, 5), F(6, 5), F(3, 4)]);
  const b = F(rng.int(1, 60), 10);
  const kind = rng.int(0, 2);
  if (kind === 0) {
    const c = x.mul(a).add(b);
    return {
      name: 'decMulAdd',
      eq: `□ × ${s(a)} + ${s(b)} = ${s(c)}`,
      x,
      steps: [`{{${s(c)} − ${s(b)} = ${s(c.sub(b))}}}`, `{{${s(c.sub(b))} ÷ ${s(a)} = ${s(x)}}}`],
      quick: [
        `${s(a)} = ${fracStr(a)} なので、÷ ${s(a)} は × ${fracStr(a.inv())} と同じ。`,
        `{{${s(c.sub(b))} × ${fracStr(a.inv())} = ${s(x)}}}`,
      ],
      wrong: [tryF(() => c.add(b).div(a)), c.sub(b).mul(a), tryF(() => c.div(a).sub(b))],
      why: ['引くべきところを足した', '割るべきところを掛けた', '戻す順番を誤った'],
      lhs: (v) => v.mul(a).add(b),
      rhs: c,
      ko: `${s(c)} − ${s(b)} = ${s(c.sub(b))}, ${s(c.sub(b))} ÷ ${s(a)} = ${s(x)}. 소수로 나눌 때는 분수(${fracStr(a)})로 바꿔 역수를 곱하면 빠릅니다.`,
    };
  }
  if (kind === 1) {
    // (□ + b) ÷ a = c
    const c = x.add(b).div(a);
    return {
      name: 'decAddDiv',
      eq: `(□ + ${s(b)}) ÷ ${s(a)} = ${s(c)}`,
      x,
      steps: [`÷ ${s(a)} を戻す: {{${s(c)} × ${s(a)} = ${s(c.mul(a))}}}`, `+ ${s(b)} を戻す: {{${s(c.mul(a))} − ${s(b)} = ${s(x)}}}`],
      quick: [`÷ ${s(a)} を戻すときは × ${s(a)}。小数の掛け算は整数にしてから桁を戻すと速い。`, `検算: {{(${s(x)} + ${s(b)}) ÷ ${s(a)} = ${s(c)}}}`],
      wrong: [tryF(() => c.div(a).sub(b)), c.mul(a).add(b), c.sub(b).mul(a)],
      why: ['掛けるべきところを割った', '引くべきところを足した', '戻す順番を誤った'],
      lhs: (v) => v.add(b).div(a),
      rhs: c,
      ko: `÷ ${s(a)}를 되돌려 ${s(c)} × ${s(a)} = ${s(c.mul(a))}, + ${s(b)}를 되돌려 ${s(c.mul(a))} − ${s(b)} = ${s(x)}.`,
    };
  }
  // b × □ − a = c
  const m = rng.pick([F(3, 2), F(5, 2), F(12, 5), F(5, 4), F(4, 5)]);
  const c = m.mul(x).sub(a);
  if (!c.isPos()) return null;
  return {
    name: 'decMulSub',
    eq: `${s(m)} × □ − ${s(a)} = ${s(c)}`,
    x,
    steps: [`{{${s(c)} + ${s(a)} = ${s(c.add(a))}}}`, `{{${s(c.add(a))} ÷ ${s(m)} = ${s(x)}}}`],
    quick: [`${s(m)} = ${fracStr(m)}。÷ ${fracStr(m)} は × ${fracStr(m.inv())}。`, `{{${s(c.add(a))} × ${fracStr(m.inv())} = ${s(x)}}}`],
    wrong: [tryF(() => c.sub(a).div(m)), c.add(a).mul(m), tryF(() => c.div(m).add(a))],
    why: ['足すべきところを引いた', '割るべきところを掛けた', '戻す順番を誤った'],
    lhs: (v) => m.mul(v).sub(a),
    rhs: c,
    ko: `${s(c)} + ${s(a)} = ${s(c.add(a))}, ${s(c.add(a))} ÷ ${s(m)} = ${s(x)}. ${s(m)} = ${fracStr(m)}이므로 ${fracStr(m.inv())}을 곱해도 됩니다.`,
  };
}

function fracOps(rng: Rng): Tpl | null {
  const kind = rng.int(0, 1);
  if (kind === 0) {
    // □ × p/q − r/s = t
    const x = F(rng.int(1, 9), rng.pick([2, 3, 4, 5, 6]));
    const pq = F(rng.int(1, 7), rng.pick([2, 3, 4, 5, 6, 8]));
    const rs = F(rng.int(1, 5), rng.pick([2, 3, 4, 6, 8, 12]));
    if (x.isInt() || pq.isInt() || rs.isInt()) return null;
    const t = x.mul(pq).sub(rs);
    if (!t.isPos() || t.d > 24 || x.d > 12) return null;
    return {
      name: 'fracMulSub',
      eq: `□ × ${fracStr(pq)} − ${fracStr(rs)} = ${fracStr(t)}`,
      x,
      steps: [
        `− ${fracStr(rs)} を戻す: {{${fracStr(t)} + ${fracStr(rs)} = ${fracStr(t.add(rs))}}} (通分してから足す)`,
        `× ${fracStr(pq)} を戻す = 逆数 ${fracStr(pq.inv())} を掛ける: {{${fracStr(t.add(rs))} × ${fracStr(pq.inv())} = ${fracStr(x)}}}`,
      ],
      quick: [
        '分数で割るときは逆数を掛ける。約分は掛ける前にたすき掛けで済ませると数が小さいまま計算できる。',
        `検算: {{${fracStr(x)} × ${fracStr(pq)} − ${fracStr(rs)} = ${fracStr(t)}}}`,
      ],
      wrong: [tryF(() => t.sub(rs).div(pq)), t.add(rs).mul(pq), tryF(() => t.div(pq).add(rs))],
      why: ['足すべきところを引いた', '逆数にし忘れた', '戻す順番を誤った'],
      lhs: (v) => v.mul(pq).sub(rs),
      rhs: t,
      ko: `${fracStr(t)} + ${fracStr(rs)} = ${fracStr(t.add(rs))}, 여기에 ${fracStr(pq)}의 역수 ${fracStr(pq.inv())}를 곱하면 ${fracStr(x)}. 분수로 나누기 = 역수 곱하기.`,
    };
  }
  // N ÷ □ − a = b (□ が割る数)
  const x = F(rng.pick([2, 3, 4, 5, 6, 8, 12, 15, 16, 20, 24, 25, 40]));
  const q = F(rng.int(2, 40), rng.pick([1, 2, 5, 10]));
  const N = q.mul(x);
  const a = F(rng.int(1, 30), 10);
  const b = q.sub(a);
  if (!b.isPos() || !decOK(N, 2) || !decOK(b, 2)) return null;
  return {
    name: 'divisorUnknown',
    eq: `${s(N)} ÷ □ − ${s(a)} = ${s(b)}`,
    x,
    steps: [
      `− ${s(a)} を戻す: {{${s(b)} + ${s(a)} = ${s(q)}}}`,
      `${s(N)} ÷ □ = ${s(q)} なので □ = ${s(N)} ÷ ${s(q)}: {{${s(N)} ÷ ${s(q)} = ${s(x)}}}`,
    ],
    quick: [`「A ÷ □ = B」なら □ = A ÷ B。□が割る数のときは掛け算に戻さない。`, `検算: {{${s(N)} ÷ ${s(x)} − ${s(a)} = ${s(b)}}}`],
    wrong: [N.mul(q), tryF(() => N.div(b.sub(a))), tryF(() => N.div(b))],
    why: ['割るべきところを掛けた', '足すべきところを引いた', '− の戻し忘れ'],
    lhs: (v) => N.div(v).sub(a),
    rhs: b,
    ko: `${s(b)} + ${s(a)} = ${s(q)}. ${s(N)} ÷ □ = ${s(q)}이므로 □ = ${s(N)} ÷ ${s(q)} = ${s(x)}. □가 나누는 수일 때는 곱하지 말고 나눕니다.`,
  };
}

export function genShisoku(rng: Rng, diff: Difficulty): Draft | null {
  const t = diff === 1 ? intOps(rng) : diff === 2 ? decOps(rng) : fracOps(rng);
  if (!t) return null;
  const useFrac = t.name.startsWith('frac');
  const fmt: Fmt = useFrac ? (v) => (v.d <= 60 ? fracStr(v) : null) : (v) => decOK(v, 2);
  const xs = fmt(t.x);
  if (!xs) return null;
  const wrong: (Cand | null)[] = t.wrong.map((w, i) => numCand(w, fmt, t.why[i]));
  const step = t.x.isInt() ? F(1) : useFrac ? F(1, t.x.d) : F(1, 10);
  const fillers = [numCand(t.x.add(step), fmt), numCand(t.x.sub(step), fmt), numCand(t.x.add(step.mul(2)), fmt)];
  return {
    question_ja: `次の式の□に入る数を求めなさい。\n${t.eq}`,
    correct: { text: xs, value: t.x },
    wrong,
    fillers,
    short: `計算した順番の逆から戻す。\n${t.steps.map((x) => x.replace(/^.*?: /, '')).join(' → ')}\n答えは ${xs}。`,
    steps: [`式: ${t.eq}`, ...t.steps, `検算: □に ${xs} を入れると左辺 = ${useFrac ? fracStr(t.rhs) : s(t.rhs)} になる。`],
    quick: t.quick,
    ko: t.ko,
    tip: '足し算・引き算を先に外し、最後に掛け算・割り算を外す。答えを□に入れて検算。',
    params: { template: t.name, eq: t.eq },
    check: () => {
      // 正解を左辺に代入して右辺と一致するか(一致しなければ不一致を返す)
      return t.lhs(t.x).eq(t.rhs) ? t.x : F(-999999);
    },
  };
}
