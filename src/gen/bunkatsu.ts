import { F, Frac } from '../core/frac';
import { fracStr } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';

// SPI 非言語「分割払い」。総額を1として、分数で考える

const ITEMS = ['パソコン', '自動車', 'ピアノ', '家具'];
const fr = (v: Frac) => (v.isPos() && v.lt(1) ? fracStr(v) : null);
const fs = fracStr;

function afterDeposit(rng: Rng): Draft | null {
  const item = rng.pick(ITEMS);
  const a = rng.pick([3, 4, 5, 6, 8]);
  const n = rng.pick([4, 5, 6, 8, 10, 12]);
  const rest = F(a - 1, a);
  const ans = rest.div(n);
  return {
    question_ja: `${item}を分割払いで購入した。購入時に頭金として総額の1/${a}を支払い、残りを${n}回の均等払いにする。分割手数料はかからないものとする。均等払いの1回分は、総額のどれだけにあたるか。`,
    correct: { text: fs(ans), value: ans },
    wrong: [numCand(F(1, n), fr, '頭金を引かずに、総額を等分した'), numCand(F(1, a * n), fr, '頭金のほうを等分した'), numCand(rest.div(n + 1), fr, '頭金も1回分に数えた'), numCand(rest, fr, '残り全体を答えた')],
    fillers: [numCand(rest.div(n - 1), fr), numCand(rest.div(n + 2), fr)],
    short: `総額を1とすると、残りは {{1 − 1/${a} = ${fs(rest)}}}。これを${n}回に分ける。\n{{${fs(rest)} ÷ ${n} = ${fs(ans)}}}\n答えは ${fs(ans)}。`,
    steps: [`総額を1とする。頭金を支払った残り: {{1 − 1/${a} = ${fs(rest)}}}`, `残りを${n}回に等分する: {{${fs(rest)} ÷ ${n} = ${fs(ans)}}}`, `1回分は、総額の ${fs(ans)}`],
    quick: [`分数を整数で割るときは、分母にその数を掛ける: {{${a - 1}/${a} ÷ ${n} = ${a - 1}/${a * n}}}`, '等分するのは「残り」。総額(1)を回数で割ってしまう選択肢が入っている。'],
    ko: `총액을 1로 놓고 분수로 생각합니다.\n계약금을 낸 나머지: 1 − 1/${a} = ${fs(rest)}\n이것을 ${n}회로 나눔: ${fs(rest)} ÷ ${n} = ${fs(ans)}.\n요령: 분수를 정수로 나눌 때는 분모에 그 수를 곱합니다.\n함정: 계약금을 빼지 않고 총액을 ${n}등분한 값(1/${n})이 선택지에 있습니다.`,
    intuition: `金額がわからないので、総額を1とおく。頭金 1/${a} を支払うと、残りは ${fs(rest)}。その残りを${n}回に等しく分けるので、1回分は残りの 1/${n} になる。`,
    cue: '「頭金を払った残りを n 回の均等払い」→ (1 − 頭金の割合) ÷ n',
    fast: [],
    tip: '分割払いは総額を1とおく。等分するのは「残り」のほう。',
    params: { template: 'afterDeposit' },
    // 総額を a × n 個の単位に分けて数える
    check: () => F(a * n - n, n).div(a * n),
  };
}

function twoDeposits(rng: Rng): Draft | null {
  const item = rng.pick(ITEMS);
  const a = rng.pick([3, 4, 5, 6, 8, 10]);
  const b = rng.pick([3, 4, 5, 6, 8, 10]);
  if (a === b) return null;
  const n = rng.pick([4, 5, 6, 8, 10]);
  const paid = F(1, a).add(F(1, b));
  const rest = F(1).sub(paid);
  const ans = rest.div(n);
  return {
    question_ja: `${item}を分割払いで購入した。契約時に総額の1/${a}を、納品時に総額の1/${b}を支払い、残りを${n}回の均等払いにする。分割手数料はかからないものとする。均等払いの1回分は、総額のどれだけにあたるか。`,
    correct: { text: fs(ans), value: ans },
    wrong: [
      numCand(F(a - 1, a).div(n), fr, '納品時の支払いを引き忘れた'),
      numCand(paid.div(n), fr, '支払い済みの分のほうを等分した'),
      numCand(rest, fr, '残り全体を答えた'),
      numCand(F(b - 1, b).div(n), fr, '契約時の支払いを引き忘れた'),
    ],
    fillers: [numCand(rest.div(n + 1), fr), numCand(rest.div(n - 1), fr)],
    short: `支払い済みは {{1/${a} + 1/${b} = ${fs(paid)}}}、残りは {{1 − ${fs(paid)} = ${fs(rest)}}}。\n{{${fs(rest)} ÷ ${n} = ${fs(ans)}}}\n答えは ${fs(ans)}。`,
    steps: [
      `総額を1とする。契約時と納品時に支払った分: {{1/${a} + 1/${b} = ${fs(paid)}}}`,
      `残り: {{1 − ${fs(paid)} = ${fs(rest)}}}`,
      `残りを${n}回に等分する: {{${fs(rest)} ÷ ${n} = ${fs(ans)}}}`,
    ],
    quick: ['先に支払った分を1つの分数にまとめてから、1から引く。', '通分は、分母どうしを掛けた数でもよい(最後に約分する)。'],
    ko: `총액을 1로 놓습니다.\n이미 낸 금액: 1/${a} + 1/${b} = ${fs(paid)}\n나머지: 1 − ${fs(paid)} = ${fs(rest)}\n${n}회로 나눔: ${fs(rest)} ÷ ${n} = ${fs(ans)}.\n함정: 두 번의 선지급 중 하나를 빼먹은 값, 나머지 전체(${fs(rest)})를 답한 값이 선택지에 있습니다.`,
    intuition: `総額を1とおく。先に2回支払っているので、まずその合計 ${fs(paid)} を出す。残りの ${fs(rest)} を${n}回に等しく分けたものが、1回分になる。`,
    cue: '「先に2回支払い、残りを n 回の均等払い」→ (1 − 支払い済みの合計) ÷ n',
    fast: [],
    tip: '支払い済みの分をすべて足してから、1から引く。',
    params: { template: 'twoDeposits' },
    // 総額を a × b 個の単位に分けて数える
    check: () => F(a * b - a - b, a * b * n),
  };
}

function paidSoFar(rng: Rng): Draft | null {
  const item = rng.pick(ITEMS);
  const a = rng.pick([3, 4, 5, 6, 8]);
  const n = rng.pick([5, 6, 8, 10, 12]);
  const k = rng.int(2, n - 2);
  const rest = F(a - 1, a);
  const per = rest.div(n);
  const kper = per.mul(k);
  const ans = F(1, a).add(kper);
  return {
    question_ja: `${item}を分割払いで購入した。購入時に頭金として総額の1/${a}を支払い、残りを${n}回の均等払いにする。分割手数料はかからないものとする。均等払いの${k}回目を支払い終えた時点で、支払い済みの額は総額のどれだけにあたるか。`,
    correct: { text: fs(ans), value: ans },
    wrong: [
      numCand(kper, fr, '頭金を足し忘れた'),
      numCand(F(1, a).add(F(k, n)), fr, '残りではなく、総額を等分した'),
      numCand(F(1).sub(ans), fr, 'まだ支払っていない分を答えた'),
      numCand(F(k, n), fr, '頭金を考えずに、回数だけで答えた'),
    ],
    fillers: [numCand(F(1, a).add(per.mul(k + 1)), fr), numCand(F(1, a).add(per.mul(k - 1)), fr)],
    short: `1回分は {{(1 − 1/${a}) ÷ ${n} = ${fs(per)}}}。頭金と${k}回分を足す。\n{{1/${a} + ${fs(per)} × ${k} = ${fs(ans)}}}\n答えは ${fs(ans)}。`,
    steps: [
      `総額を1とする。頭金を支払った残り: {{1 − 1/${a} = ${fs(rest)}}}`,
      `均等払いの1回分: {{${fs(rest)} ÷ ${n} = ${fs(per)}}}`,
      `${k}回分: {{${fs(per)} × ${k} = ${fs(kper)}}}`,
      `頭金と合わせる: {{1/${a} + ${fs(kper)} = ${fs(ans)}}}`,
    ],
    quick: [`残り ${fs(rest)} のうち ${k}/${n} を支払った、と考えてもよい: {{1/${a} + ${fs(rest)} × ${k}/${n} = ${fs(ans)}}}`, '「支払い済み」には頭金も入る。均等払いの分だけを答えない。'],
    ko: `총액을 1로 놓습니다.\n나머지: 1 − 1/${a} = ${fs(rest)} → 1회분: ${fs(rest)} ÷ ${n} = ${fs(per)}\n${k}회분: ${fs(per)} × ${k} = ${fs(kper)}\n계약금과 합침: 1/${a} + ${fs(kper)} = ${fs(ans)}.\n함정: "지불 완료 금액"에는 계약금도 포함됩니다. 균등 지불 ${k}회분(${fs(kper)})만 답하면 틀립니다.`,
    intuition: `支払い済みの額は「頭金」と「均等払いの${k}回分」の合計。均等払いは残り ${fs(rest)} を${n}回に分けたものなので、${k}回分は残りの ${k}/${n} にあたる。`,
    cue: '「k 回目まで支払った時点の支払い済みの額」→ 頭金 + (残り ÷ n) × k',
    fast: [],
    tip: '「支払い済み」を問われたら、頭金を足し忘れない。',
    params: { template: 'paidSoFar' },
    // 総額を a × n 個の単位に分ける。頭金は n 個、均等払いは1回 (a − 1) 個
    check: () => F(n + k * (a - 1), a * n),
  };
}

function withFee(rng: Rng): Draft | null {
  const item = rng.pick(ITEMS);
  const a = rng.pick([3, 4, 5, 6]);
  const n = rng.pick([4, 5, 6, 8, 10, 11, 12]);
  const f = rng.pick([5, 10, 20]);
  const rest = F(a - 1, a);
  const up = F(f + 1, f);
  const withF = rest.mul(up);
  const ans = withF.div(n);
  return {
    question_ja: `${item}を分割払いで購入した。購入時に頭金として総額の1/${a}を支払い、残額を${n}回の均等払いにする。ただし、残額の1/${f}にあたる分割手数料が残額に加算され、その合計を${n}回に等分して支払う。均等払いの1回分は、総額のどれだけにあたるか。`,
    correct: { text: fs(ans), value: ans },
    wrong: [
      numCand(rest.div(n), fr, '手数料を入れ忘れた'),
      numCand(rest.add(F(1, f)).div(n), fr, `手数料を「総額の1/${f}」として足した`),
      numCand(up.div(n), fr, '頭金を引き忘れた'),
      numCand(withF, fr, '回数で割り忘れた'),
    ],
    fillers: [numCand(withF.div(n + 1), fr), numCand(withF.div(n - 1), fr)],
    short: `残額は {{1 − 1/${a} = ${fs(rest)}}}。手数料を加えると、残額の {{1 + 1/${f} = ${fs(up)}}} 倍になる。\n{{${fs(rest)} × ${fs(up)} ÷ ${n} = ${fs(ans)}}}\n答えは ${fs(ans)}。`,
    steps: [
      `総額を1とする。頭金を支払った残額: {{1 − 1/${a} = ${fs(rest)}}}`,
      `手数料は「残額の1/${f}」なので、支払う合計は残額の {{1 + 1/${f} = ${fs(up)}}} 倍: {{${fs(rest)} × ${fs(up)} = ${fs(withF)}}}`,
      `${n}回に等分する: {{${fs(withF)} ÷ ${n} = ${fs(ans)}}}`,
    ],
    quick: [`手数料の基準は「残額」。総額の1/${f}を足す({{${fs(rest)} + 1/${f} = ${fs(rest.add(F(1, f)))}}})のは誤り。`, '「○の1/f を加える」は「○ × (1 + 1/f)」と、掛け算1回にまとめる。'],
    ko: `총액을 1로 놓습니다.\n계약금을 낸 잔액: 1 − 1/${a} = ${fs(rest)}\n수수료는 "잔액의 1/${f}"이므로, 낼 금액은 잔액의 (1 + 1/${f}) = ${fs(up)}배: ${fs(rest)} × ${fs(up)} = ${fs(withF)}\n${n}회로 나눔: ${fs(withF)} ÷ ${n} = ${fs(ans)}.\n가장 흔한 함정: 수수료를 총액 기준으로 착각해서 "${fs(rest)} + 1/${f}"처럼 더하는 것입니다. 수수료의 기준은 잔액입니다.`,
    intuition: `総額を1とおく。手数料は総額ではなく「残額 ${fs(rest)}」にかかるので、残額を ${fs(up)} 倍する。そのあとで${n}回に等しく分ける。順番は「残額 → 手数料を加える → 回数で割る」。`,
    cue: '「残額の1/f の手数料を加えて n 回の均等払い」→ (1 − 頭金の割合) × (1 + 1/f) ÷ n',
    fast: [],
    tip: '手数料が「何の」1/f なのか(総額か残額か)を確かめる。',
    params: { template: 'withFee' },
    check: () => F((a - 1) * (f + 1), a * f * n),
  };
}

export function genBunkatsu(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return afterDeposit(rng);
  if (diff === 2) return rng.chance(0.5) ? twoDeposits(rng) : paidSoFar(rng);
  return withFee(rng);
}
