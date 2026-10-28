import { F, Frac } from '../core/frac';
import { fracStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, tryF, type Draft } from './framework';
import { fInt } from './fmt';

// SPI 非言語「仕事算」。全体の仕事量を1とする

function lcm(a: number, b: number): number {
  let x = a;
  let y = b;
  while (y) [x, y] = [y, x % y];
  return (a / x) * b;
}

function together(rng: Rng): Draft | null {
  // (a−T)(b−T) = T² となる a, b を作ると、2人で T 日になる
  const T = rng.int(2, 12);
  const sq = T * T;
  const divs: number[] = [];
  for (let k = 1; k <= sq; k++) if (sq % k === 0) divs.push(k);
  const k = rng.pick(divs);
  const a = T + k;
  const b = T + sq / k;
  if (a === b || a > 60 || b > 60) return null;
  const fd = fInt('日');
  const W = lcm(a, b);
  return {
    question_ja: `ある仕事を、Aは1人で${a}日、Bは1人で${b}日で終える。この仕事をAとBの2人で一緒に行うと、何日で終わるか。`,
    correct: { text: `${T}日`, value: F(T) },
    wrong: [
      numCand(F(a + b, 2), fd, '日数を平均した'),
      numCand(F(Math.abs(a - b)), fd, '日数の差を出した'),
      numCand(F(a + b), fd, '日数を足した'),
    ],
    fillers: [numCand(F(T + 1), fd), numCand(F(T - 1), fd), numCand(F(T + 2), fd)],
    short: `全体を1とすると、1日の仕事量は A が 1/${a}、B が 1/${b}。\n{{1 ÷ (1/${a} + 1/${b}) = ${T}}}\n答えは ${T}日。`,
    steps: [
      `仕事全体を1とする。1日あたり A は 1/${a}、B は 1/${b} 進める。`,
      `2人なら1日に {{1/${a} + 1/${b} = ${fracStr(F(1, a).add(F(1, b)))}}}`,
      `かかる日数 = 1 ÷ 1日の量 = {{1 ÷ (${fracStr(F(1, a).add(F(1, b)))}) = ${T}}}日`,
    ],
    quick: [
      `全体を${a}と${b}の最小公倍数 ${W} と置くと分数が消える。`,
      `A は1日 {{${W} ÷ ${a} = ${W / a}}}、B は1日 {{${W} ÷ ${b} = ${W / b}}}。2人で1日 ${W / a + W / b}。`,
      `{{${W} ÷ ${W / a + W / b} = ${T}}}日。速い方(${Math.min(a, b)}日)より短くなるはずなので、${Math.min(a, b)}日以上の選択肢はすぐ消せる。`,
    ],
    ko: `전체 일을 1로 두면 하루에 A는 1/${a}, B는 1/${b}. 둘이 하면 1/${a} + 1/${b} = ${fracStr(F(1, a).add(F(1, b)))}이므로 1 ÷ ${fracStr(F(1, a).add(F(1, b)))} = ${T}일. 전체를 최소공배수 ${W}로 두면 분수 없이 계산할 수 있습니다.`,
    tip: '全体の仕事量を日数の最小公倍数に置くと、すべて整数で計算できる。',
    params: { template: 'together', a, b },
    check: () => F(1).div(F(1, a).add(F(1, b))),
  };
}

function thenAlone(rng: Rng): Draft | null {
  const a = rng.int(4, 20);
  const b = rng.int(4, 30);
  if (a === b) return null;
  const k = rng.int(1, 6);
  const done = F(k, a).add(F(k, b));
  const rest = F(1).sub(done);
  if (!rest.isPos()) return null;
  const x = rest.mul(b);
  if (!x.isInt() || x.n < 1) return null;
  const fd = fInt('日');
  const W = lcm(a, b);
  return {
    question_ja: `ある仕事を、Aは1人で${a}日、Bは1人で${b}日で終える。最初の${k}日間は2人で一緒に行い、残りをBが1人で行った。Bが1人で働いたのは何日間か。`,
    correct: { text: `${num(x)}日`, value: x },
    wrong: [
      numCand(F(b - k), fd, 'B1人の日数から引いただけ'),
      numCand(rest.mul(a), fd, '残りをAの速さで計算した'),
      numCand(x.add(k), fd, '全体の日数を答えた'),
    ],
    fillers: [numCand(x.add(1), fd), numCand(x.sub(1), fd), numCand(x.add(2), fd)],
    short: `${k}日で終わる量は {{(1/${a} + 1/${b}) × ${k} = ${fracStr(done)}}}、残りは ${fracStr(rest)}。\nBは1日 1/${b} 進めるので {{${fracStr(rest)} ÷ (1/${b}) = ${num(x)}}}\n答えは ${num(x)}日。`,
    steps: [
      `全体を1とする。2人で1日に {{1/${a} + 1/${b} = ${fracStr(F(1, a).add(F(1, b)))}}}`,
      `${k}日で {{${fracStr(F(1, a).add(F(1, b)))} × ${k} = ${fracStr(done)}}}、残り {{1 − ${fracStr(done)} = ${fracStr(rest)}}}`,
      `B 1人で {{${fracStr(rest)} × ${b} = ${num(x)}}}日`,
    ],
    quick: [
      `全体を ${W} と置く。A は1日 ${W / a}、B は1日 ${W / b}。`,
      `${k}日で {{(${W / a} + ${W / b}) × ${k} = ${(W / a + W / b) * k}}}、残り {{${W} − ${(W / a + W / b) * k} = ${W - (W / a + W / b) * k}}}`,
      `{{${W - (W / a + W / b) * k} ÷ ${W / b} = ${num(x)}}}日`,
    ],
    ko: `${k}일 동안 둘이 한 양은 (1/${a} + 1/${b}) × ${k} = ${fracStr(done)}, 남은 양 ${fracStr(rest)}. B는 하루 1/${b}이므로 ${fracStr(rest)} × ${b} = ${num(x)}일.`,
    tip: '「途中から1人」は、終わった量を引いて残りを1人の速さで割る。',
    params: { template: 'thenAlone', a, b, k },
    check: () => {
      // 1日ずつ進めて、B 1人で終わる日を数える(全体を W として整数で)
      let left = W - (W / a + W / b) * k;
      let days = 0;
      while (left > 0) {
        left -= W / b;
        days++;
      }
      return left === 0 ? F(days) : F(-1);
    },
  };
}

function tank(rng: Rng): Draft | null {
  const a = rng.int(6, 40);
  const b = rng.int(6, 60);
  const c = rng.int(8, 90);
  if (a === b || b === c || a === c) return null; // 同じ時間だと打ち消し合って解説が不自然になる
  const rate = F(1, a).add(F(1, b)).sub(F(1, c));
  if (!rate.isPos()) return null;
  const T = F(1).div(rate);
  if (!T.isInt() || T.n > 120) return null;
  const fm = fInt('分');
  const W = lcm(lcm(a, b), c);
  const noDrain = tryF(() => F(1).div(F(1, a).add(F(1, b))));
  const plusDrain = F(1).div(F(1, a).add(F(1, b)).add(F(1, c)));
  return {
    question_ja: `空の水槽に、給水管Aだけでは${a}分、給水管Bだけでは${b}分で満水になる。また、満水の水槽を排水管Cだけで空にするには${c}分かかる。A・Bで給水しながら同時にCで排水すると、空の水槽が満水になるまで何分かかるか。`,
    correct: { text: `${num(T)}分`, value: T },
    wrong: [
      numCand(noDrain as Frac | null, fm, '排水を無視した'),
      numCand(plusDrain, fm, '排水を足してしまった'),
      numCand(F(a + b + c, 3), fm, '時間を平均した'),
    ],
    fillers: [numCand(T.add(2), fm), numCand(T.sub(2), fm), numCand(T.add(5), fm)],
    short: `1分あたり {{1/${a} + 1/${b} − 1/${c} = ${fracStr(rate)}}} たまる。\n{{1 ÷ (${fracStr(rate)}) = ${num(T)}}}\n答えは ${num(T)}分。`,
    steps: [
      '水槽の容量を1とする。給水はプラス、排水はマイナスで考える。',
      `1分あたり: A 1/${a}、B 1/${b}、C −1/${c}`,
      `合計 {{1/${a} + 1/${b} − 1/${c} = ${fracStr(rate)}}}`,
      `満水まで {{1 ÷ (${fracStr(rate)}) = ${num(T)}}}分`,
    ],
    quick: [
      `容量を ${a}・${b}・${c} の最小公倍数 ${W} と置く。`,
      `1分に A ${W / a}、B ${W / b}、C −${W / c} → {{${W / a} + ${W / b} − ${W / c} = ${W / a + W / b - W / c}}}`,
      `{{${W} ÷ ${W / a + W / b - W / c} = ${num(T)}}}分`,
    ],
    ko: `수조 용량을 1로 두면 1분에 1/${a} + 1/${b} − 1/${c} = ${fracStr(rate)}씩 찹니다. 1 ÷ ${fracStr(rate)} = ${num(T)}분. 배수관은 빼야 합니다(더하면 틀림).`,
    tip: '排水管はマイナスの仕事。容量を最小公倍数に置くと整数で計算できる。',
    params: { template: 'tank', a, b, c },
    check: () => {
      let v = 0;
      let m = 0;
      while (v < W && m < 1000) {
        v += W / a + W / b - W / c;
        m++;
      }
      return v === W ? F(m) : F(-1);
    },
  };
}

export function genShigoto(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return together(rng);
  if (diff === 2) return thenAlone(rng);
  return rng.chance(0.5) ? tank(rng) : thenAlone(rng);
}
