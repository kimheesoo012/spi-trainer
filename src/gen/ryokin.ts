import { F } from '../core/frac';
import { num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';
import { d, fYen, wari } from './fmt';

// SPI 非言語「料金の割引」。「○人を超えた分が割引」という団体割引

const PLACES = ['美術館', '水族館', '博物館', '植物園'];

interface Rule {
  place: string;
  P: number; // 1人の定価
  N: number; // この人数を超えた分が割引
  r: number; // 割引(割)
}

function makeRule(rng: Rng): Rule {
  return { place: rng.pick(PLACES), P: 100 * rng.int(5, 20), N: rng.pick([10, 20, 30]), r: rng.int(1, 4) };
}

const ruleText = (x: Rule) => `ある${x.place}の入場料は1人${num(x.P)}円である。${x.N}人を超える団体は、${x.N}人を超えた分の人数について、入場料が${x.r}割引になる。`;

/** 1人ずつ足して総額を出す(検算用) */
function costOf(x: Rule, n: number) {
  let t = F(0);
  for (let i = 1; i <= n; i++) t = t.add(i <= x.N ? F(x.P) : F(x.P * (10 - x.r), 10));
  return t;
}

function groupTotal(rng: Rng): Draft | null {
  const x = makeRule(rng);
  const M = x.N + rng.int(3, 20);
  const k = M - x.N;
  const Pd = F(x.P).mul(F(1).sub(wari(x.r)));
  const cut = F(x.P).mul(wari(x.r));
  const full = F(x.P * x.N);
  const disc = Pd.mul(k);
  const total = full.add(disc);
  const allFull = F(x.P * M);
  return {
    question_ja: `${ruleText(x)}${M}人の団体で入場するとき、入場料の総額はいくらか。`,
    correct: { text: `${num(total)}円`, value: total },
    wrong: [numCand(Pd.mul(M), fYen, '全員を割引料金で計算した'), numCand(allFull, fYen, '割引を入れ忘れた'), numCand(Pd.mul(x.N).add(F(x.P * k)), fYen, '定価の人数と割引の人数を逆にした')],
    fillers: [numCand(total.add(cut), fYen), numCand(total.sub(cut), fYen), numCand(total.add(cut.mul(2)), fYen)],
    short: `定価で入る${x.N}人と、割引になる${k}人に分けて計算する。\n{{${num(x.P)} × ${x.N} + ${num(Pd)} × ${k} = ${num(total)}}}\n答えは ${num(total)}円。`,
    steps: [
      `定価で入るのは${x.N}人: {{${num(x.P)} × ${x.N} = ${num(full)}}}円`,
      `割引になるのは {{${M} − ${x.N} = ${k}}}人。1人あたり {{${num(x.P)} × (1 − ${d(wari(x.r))}) = ${num(Pd)}}}円 なので {{${num(Pd)} × ${k} = ${num(disc)}}}円`,
      `合計: {{${num(full)} + ${num(disc)} = ${num(total)}}}円`,
    ],
    quick: ['割引になるのは「超えた分」の人数だけ。全員が割引になるわけではない。', `${x.r}割引は、定価の ${d(F(1).sub(wari(x.r)))} 倍。`],
    ko: `"${x.N}명을 넘은 인원만" 할인됩니다. 전원이 할인되는 것이 아닙니다.\n정가 ${x.N}명: ${num(x.P)} × ${x.N} = ${num(full)}엔\n할인 ${k}명(${M} − ${x.N}): 1명 ${num(x.P)} × ${d(F(1).sub(wari(x.r)))} = ${num(Pd)}엔 → ${num(Pd)} × ${k} = ${num(disc)}엔\n합계 ${num(total)}엔.\n빨리 푸는 법: 전원 정가(${num(allFull)}엔)에서 할인액(1명 ${num(cut)}엔 × ${k}명)을 뺍니다.\n함정: 전원을 할인 요금으로 계산한 값(${num(Pd.mul(M))}엔)이 선택지에 있습니다.`,
    intuition: `団体を「定価の${x.N}人」と「割引の${k}人」に分けて考える。全員が定価だったとして計算し、割引になる${k}人分の割引額だけを後から引くと、掛け算が簡単になる。`,
    cue: '「○人を超えた分が割引」→ 定価の人数と割引の人数に分ける(割引は超えた分だけ)',
    fast: [`全員が定価なら {{${num(x.P)} × ${M} = ${num(allFull)}}}円`, `割引額は1人 {{${num(x.P)} × ${d(wari(x.r))} = ${num(cut)}}}円 で${k}人分: {{${num(allFull)} − ${num(cut)} × ${k} = ${num(total)}}}円`],
    fastCheck: () => allFull.sub(cut.mul(k)),
    tip: '「超えた分」だけが割引。何人が定価で、何人が割引かを先に書く。',
    params: { template: 'groupTotal' },
    check: () => costOf(x, M),
  };
}

function groupAverage(rng: Rng): Draft | null {
  const x = makeRule(rng);
  const M = x.N + rng.int(2, 20);
  const k = M - x.N;
  const Pd = F(x.P).mul(F(1).sub(wari(x.r)));
  const full = F(x.P * x.N);
  const disc = Pd.mul(k);
  const total = full.add(disc);
  const avg = total.div(M);
  if (!avg.isInt()) return null;
  return {
    question_ja: `${ruleText(x)}${M}人の団体で入場するとき、1人あたりの入場料は平均いくらか。`,
    correct: { text: `${num(avg)}円`, value: avg },
    wrong: [numCand(F(x.P).add(Pd).div(2), fYen, '定価と割引料金を足して2で割った'), numCand(Pd, fYen, '割引料金をそのまま答えた'), numCand(total.div(x.N), fYen, `総額を${x.N}人で割った`)],
    fillers: [numCand(avg.add(10), fYen), numCand(avg.sub(10), fYen), numCand(avg.add(20), fYen), numCand(avg.sub(20), fYen)],
    short: `総額を出してから、人数で割る。\n{{(${num(x.P)} × ${x.N} + ${num(Pd)} × ${k}) ÷ ${M} = ${num(avg)}}}\n答えは ${num(avg)}円。`,
    steps: [
      `定価で入る${x.N}人: {{${num(x.P)} × ${x.N} = ${num(full)}}}円`,
      `割引になる {{${M} − ${x.N} = ${k}}}人: 1人 {{${num(x.P)} × (1 − ${d(wari(x.r))}) = ${num(Pd)}}}円 なので {{${num(Pd)} × ${k} = ${num(disc)}}}円`,
      `総額: {{${num(full)} + ${num(disc)} = ${num(total)}}}円`,
      `1人あたり: {{${num(total)} ÷ ${M} = ${num(avg)}}}円`,
    ],
    quick: [
      `答えは、定価 ${num(x.P)}円 と割引料金 ${num(Pd)}円 の間になる。この範囲にない選択肢は消せる。`,
      `定価の人(${x.N}人)と割引の人(${k}人)は人数が違うので、2つの料金を足して2で割っても平均にはならない。`,
    ],
    ko: `평균 = 총액 ÷ 인원입니다. 정가(${num(x.P)}엔)와 할인 요금(${num(Pd)}엔)을 더해서 2로 나누면 안 됩니다. 인원수가 다르기 때문입니다(정가 ${x.N}명, 할인 ${k}명).\n총액: ${num(x.P)} × ${x.N} + ${num(Pd)} × ${k} = ${num(total)}엔\n1인당: ${num(total)} ÷ ${M} = ${num(avg)}엔.\n먼저 지울 수 있는 선택지: 답은 반드시 ${num(Pd)}엔과 ${num(x.P)}엔 사이에 있습니다.`,
    intuition: `平均は「総額 ÷ 人数」。定価の人が${x.N}人、割引の人が${k}人いるので、平均は定価 ${num(x.P)}円 と割引料金 ${num(Pd)}円 の間になり、人数の多いほうの料金に近くなる。`,
    cue: '「1人あたりの平均」→ 総額を出して人数で割る(料金どうしを足して2で割らない)',
    fast: [],
    tip: '人数が違うグループの平均は、必ず総額に戻してから割る。',
    params: { template: 'groupAverage' },
    check: () => costOf(x, M).div(M),
  };
}

function splitVsTogether(rng: Rng): Draft | null {
  const x = makeRule(rng);
  const kind = rng.int(0, 2);
  let A: number;
  let B: number;
  if (kind === 0) {
    // どちらの団体も N 人を超える
    A = x.N + rng.int(2, 12);
    B = x.N + rng.int(2, 12);
  } else if (kind === 1) {
    // 片方だけが N 人を超える
    A = rng.int(Math.max(3, x.N - 8), x.N);
    B = x.N + rng.int(2, 15);
  } else {
    // どちらも超えないが、合わせると超える
    A = rng.int(Math.ceil(x.N / 2) + 1, x.N);
    B = rng.int(Math.ceil(x.N / 2) + 1, x.N);
  }
  if (A === B) return null;
  const over = (n: number) => Math.max(0, n - x.N);
  const d1 = over(A) + over(B);
  const d2 = over(A + B);
  const cut = F(x.P).mul(wari(x.r));
  const ans = cut.mul(d2 - d1);
  if (!ans.isPos()) return null;
  const note =
    kind === 0
      ? `どちらの団体も${x.N}人を超えているとき、別々なら定価で入る人は ${x.N}人 × 2、まとめると${x.N}人だけになる。差はちょうど${x.N}人分の割引額。`
      : kind === 1
        ? `${A}人の団体は、別々だと全員が定価。まとめると、この${A}人分がすべて割引になる。`
        : `別々だと、どちらの団体も割引なし。まとめたときに${x.N}人を超える${d2}人分だけ安くなる。`;
  return {
    question_ja: `${ruleText(x)}${A}人の団体と${B}人の団体が、別々に入場する場合と、まとめて1つの団体として入場する場合とでは、入場料の総額はいくら違うか。`,
    correct: { text: `${num(ans)}円`, value: ans },
    wrong: [
      numCand(cut.mul(d2), fYen, 'まとめた場合の割引額をそのまま答えた'),
      numCand(cut.mul(x.N), fYen, `差はいつも${x.N}人分だと考えた`),
      numCand(cut.mul(A + B), fYen, '全員分の割引額を答えた'),
      d1 > 0 ? numCand(cut.mul(d1), fYen, '別々の場合の割引額を答えた') : null,
    ],
    fillers: [numCand(ans.add(cut), fYen), numCand(ans.sub(cut), fYen), numCand(ans.add(cut.mul(2)), fYen), numCand(ans.sub(cut.mul(2)), fYen)],
    short: `総額の差 = 割引になる人数の差 × 1人分の割引額。\n別々なら${d1}人、まとめると${d2}人が割引になる: {{(${d2} − ${d1}) × ${num(cut)} = ${num(ans)}}}\n答えは ${num(ans)}円。`,
    steps: [
      `1人分の割引額: {{${num(x.P)} × ${d(wari(x.r))} = ${num(cut)}}}円。総額の差は、割引になる人数の差で決まる`,
      `別々に入場: 割引になるのは、${A}人の団体で${over(A)}人、${B}人の団体で${over(B)}人 → 合わせて${d1}人`,
      `まとめて入場: {{${A} + ${B} = ${A + B}}}人の団体になり、割引になるのは {{${A + B} − ${x.N} = ${d2}}}人`,
      `差: {{(${d2} − ${d1}) × ${num(cut)} = ${num(ans)}}}円`,
    ],
    quick: [note, '定価の部分は2つの場合で打ち消し合うので、総額を2回計算する必要はない。'],
    ko: `총액의 차이는 "할인되는 인원수의 차이 × 1인당 할인액"으로 정해집니다. 총액을 두 번 계산할 필요가 없습니다.\n1인당 할인액: ${num(x.P)} × ${d(wari(x.r))} = ${num(cut)}엔\n따로 입장: 할인 인원 ${over(A)}명 + ${over(B)}명 = ${d1}명\n함께 입장: ${A + B}명 단체 → 할인 인원 ${A + B} − ${x.N} = ${d2}명\n차이: (${d2} − ${d1}) × ${num(cut)} = ${num(ans)}엔.\n${kind === 0 ? `두 단체 모두 ${x.N}명을 넘으면, 차이는 항상 ${x.N}명분의 할인액입니다(정가로 들어가는 인원이 ${x.N}명 × 2에서 ${x.N}명으로 줄기 때문).` : kind === 1 ? `${A}명 단체는 따로 가면 전원 정가이고, 합치면 그 ${A}명이 모두 할인됩니다.` : `따로 가면 둘 다 할인이 없고, 합쳤을 때 ${x.N}명을 넘는 ${d2}명만 할인됩니다.`}`,
    intuition: `2つの場合で変わるのは「何人が割引になるか」だけ。定価で入る人の分は計算しなくてよい。別々のときとまとめたときで、割引になる人数がそれぞれ何人かを数える。`,
    cue: '「別々とまとめてで、総額はいくら違うか」→ 割引になる人数の差 × 1人分の割引額',
    fast: [],
    tip: '総額の差を問われたら、変わる部分(割引になる人数)だけを比べる。',
    params: { template: 'splitVsTogether', kind },
    check: () => costOf(x, A).add(costOf(x, B)).sub(costOf(x, A + B)),
  };
}

export function genRyokin(rng: Rng, diff: Difficulty): Draft | null {
  return diff === 1 ? groupTotal(rng) : diff === 2 ? groupAverage(rng) : splitVsTogether(rng);
}
