import { F } from '../core/frac';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';
import { fInt } from './fmt';

// SPI 非言語「集合」。ベン図の各領域の人数から問題を作るので、条件と答えは必ず整合する

const fp = fInt('人');

function twoSetsBoth(rng: Rng): Draft | null {
  const onlyA = rng.int(5, 60);
  const onlyB = rng.int(5, 60);
  const both = rng.int(3, 40);
  const none = rng.int(2, 40);
  const N = onlyA + onlyB + both + none;
  const A = onlyA + both;
  const B = onlyB + both;
  const item = rng.pick([
    ['電車', 'バス', '通学に使っている'],
    ['英語', '中国語', '学んだことがある'],
    ['新聞', 'テレビのニュース', '毎日見ている'],
    ['犬', '猫', '飼ったことがある'],
  ]);
  return {
    question_ja: `${N}人に調査したところ、${item[0]}を${item[2]}人は${A}人、${item[1]}を${item[2]}人は${B}人、どちらも${item[2].replace('ている', 'ていない').replace('がある', 'がない')}人は${none}人だった。両方を${item[2]}人は何人か。`,
    correct: { text: `${both}人`, value: F(both) },
    wrong: [
      numCand(F(A + B - N), fp, '「どちらでもない人」を引き忘れた'),
      numCand(F(A + B - (N - none) + none), fp, '「どちらでもない人」を足した'),
      numCand(F(onlyA), fp, 'Aだけの人数'),
      numCand(F(onlyB), fp, 'Bだけの人数'),
    ],
    fillers: [numCand(F(both + 1), fp), numCand(F(both + 2), fp), numCand(F(both - 1), fp)],
    short: `少なくとも一方に当てはまる人は {{${N} − ${none} = ${N - none}}}人。\n両方 = A + B − 少なくとも一方 = {{${A} + ${B} − ${N - none} = ${both}}}\n答えは ${both}人。`,
    steps: [
      'ベン図を描き、全体・A・B・どちらでもない の4つを書き込む。',
      `少なくとも一方 = 全体 − どちらでもない = {{${N} − ${none} = ${N - none}}}人`,
      `A と B を足すと「両方」の部分を2回数えている: {{${A} + ${B} = ${A + B}}}`,
      `両方 = {{${A + B} − ${N - none} = ${both}}}人`,
    ],
    quick: [
      `一気に: 両方 = A + B + どちらでもない − 全体 = {{${A} + ${B} + ${none} − ${N} = ${both}}}`,
      '「どちらでもない」を引き忘れる誤りが多い。全体からまず外しておく。',
    ],
    ko: `적어도 하나에 해당하는 사람 = ${N} − ${none} = ${N - none}명. 둘 다 = ${A} + ${B} − ${N - none} = ${both}명. "둘 다 아닌 사람"을 빼는 것을 잊지 마세요.`,
    tip: '両方 = A + B + どちらでもない − 全体。',
    params: { template: 'twoSetsBoth', N, A, B, none },
    check: () => {
      // 「両方」の人数を総当たりして条件を満たすものが1つだけか
      const sols: number[] = [];
      for (let x = 0; x <= Math.min(A, B); x++) if (A - x + (B - x) + x + none === N) sols.push(x);
      return sols.length === 1 ? F(sols[0]) : F(-1);
    },
  };
}

function twoSetsOnly(rng: Rng): Draft | null {
  const onlyA = rng.int(5, 60);
  const onlyB = rng.int(5, 60);
  const both = rng.int(3, 40);
  const none = rng.int(2, 40);
  const N = onlyA + onlyB + both + none;
  const A = onlyA + both;
  const B = onlyB + both;
  const askNone = rng.chance(0.5);
  const ans = askNone ? none : onlyA;
  return {
    question_ja: askNone
      ? `ある会社の社員${N}人のうち、資格Pを持つ人は${A}人、資格Qを持つ人は${B}人、PとQの両方を持つ人は${both}人である。どちらの資格も持っていない人は何人か。`
      : `ある会社の社員${N}人のうち、資格Pを持つ人は${A}人、資格Qを持つ人は${B}人、どちらも持っていない人は${none}人である。資格Pだけを持つ人は何人か。`,
    correct: { text: `${ans}人`, value: F(ans) },
    wrong: askNone
      ? [numCand(F(N - A - B), fp, '両方を足し戻し忘れた'), numCand(F(N - (A + B) + 2 * both), fp, '両方を2回足した'), numCand(F(both), fp, '両方の人数')]
      : [numCand(F(A), fp, 'Pを持つ人全員'), numCand(F(N - none - B + both), fp, '両方を足し戻した'), numCand(F(N - B), fp, 'どちらでもない人を引き忘れた')],
    fillers: [numCand(F(ans + 1), fp), numCand(F(ans + 2), fp), numCand(F(ans - 1), fp)],
    short: askNone
      ? `少なくとも一方 = {{${A} + ${B} − ${both} = ${A + B - both}}}人。\nどちらもない = {{${N} − ${A + B - both} = ${none}}}\n答えは ${none}人。`
      : `少なくとも一方 = {{${N} − ${none} = ${N - none}}}人。Qを持つ人を除くと Pだけ。\n{{${N - none} − ${B} = ${onlyA}}}\n答えは ${onlyA}人。`,
    steps: askNone
      ? [`P と Q を足すと両方の${both}人を2回数えるので1回分引く: {{${A} + ${B} − ${both} = ${A + B - both}}}人`, `どちらも持たない = {{${N} − ${A + B - both} = ${none}}}人`]
      : [
          `少なくとも一方を持つ人: {{${N} − ${none} = ${N - none}}}人`,
          `そこから Q を持つ人(両方を含む)を除くと「Pだけ」: {{${N - none} − ${B} = ${onlyA}}}人`,
          `確認: 両方 = {{${A} − ${onlyA} = ${both}}}人`,
        ],
    quick: askNone
      ? [`全体から P・Q を引き、引きすぎた両方を戻す: {{${N} − ${A} − ${B} + ${both} = ${none}}}`]
      : [`ベン図で「Pだけ」= 少なくとも一方 − Q。{{${N} − ${none} − ${B} = ${onlyA}}}`],
    ko: askNone
      ? `P + Q − 둘 다 = ${A} + ${B} − ${both} = ${A + B - both}명(적어도 하나). 둘 다 없는 사람 = ${N} − ${A + B - both} = ${none}명.`
      : `적어도 하나 = ${N} − ${none} = ${N - none}명. 여기서 Q를 가진 사람(둘 다 포함)을 빼면 P만 = ${N - none} − ${B} = ${onlyA}명.`,
    tip: 'ベン図の4つの部分(Aだけ・Bだけ・両方・どちらでもない)を全部埋めると間違えない。',
    params: { template: askNone ? 'twoSetsNone' : 'twoSetsOnlyA', N, A, B },
    check: () => F(askNone ? N - (A + B - both) : N - none - B),
  };
}

function threeSets(rng: Rng): Draft | null {
  // 7つの領域 + どれでもない
  const r = {
    a: rng.int(2, 25),
    b: rng.int(2, 25),
    c: rng.int(2, 25),
    ab: rng.int(1, 12),
    bc: rng.int(1, 12),
    ac: rng.int(1, 12),
    abc: rng.int(1, 8),
    none: rng.int(1, 30),
  };
  const N = Object.values(r).reduce((s, v) => s + v, 0);
  const A = r.a + r.ab + r.ac + r.abc;
  const B = r.b + r.ab + r.bc + r.abc;
  const C = r.c + r.bc + r.ac + r.abc;
  const AB = r.ab + r.abc;
  const BC = r.bc + r.abc;
  const AC = r.ac + r.abc;
  const union = A + B + C - AB - BC - AC + r.abc;
  const ans = N - union;
  return {
    question_ja: `学生${N}人に、X・Y・Zの3つの講座のうち受講したものを聞いた。Xは${A}人、Yは${B}人、Zは${C}人、XとYの両方は${AB}人、YとZの両方は${BC}人、XとZの両方は${AC}人、3つすべては${r.abc}人だった。どの講座も受講していない学生は何人か。`,
    correct: { text: `${ans}人`, value: F(ans) },
    wrong: [
      numCand(F(N - (A + B + C - AB - BC - AC)), fp, '3つすべてを足し戻し忘れた'),
      numCand(F(N - (A + B + C - AB - BC - AC - r.abc)), fp, '3つすべての符号を誤った'),
      numCand(F(N - (A + B + C) + AB + BC + AC), fp, '同上'),
      numCand(F(N - (A + B + C - AB - BC - AC + 2 * r.abc)), fp, '3つすべてを2回足した'),
    ],
    fillers: [numCand(F(ans + 1), fp), numCand(F(ans + 2), fp), numCand(F(ans + 3), fp)],
    short: `少なくとも1つ = X + Y + Z − (2つずつの重なり) + 3つすべて\n{{${A} + ${B} + ${C} − ${AB} − ${BC} − ${AC} + ${r.abc} = ${union}}}人\nどれもない = {{${N} − ${union} = ${ans}}}。答えは ${ans}人。`,
    steps: [
      `X・Y・Z を足すと、2つの重なりは2回、3つの重なりは3回数えている: {{${A} + ${B} + ${C} = ${A + B + C}}}`,
      `2つずつの重なりを引く: {{${A + B + C} − ${AB} − ${BC} − ${AC} = ${A + B + C - AB - BC - AC}}} (3つの重なりは 3回 − 3回 = 0回 になってしまう)`,
      `3つすべてを1回足し戻す: {{${A + B + C - AB - BC - AC} + ${r.abc} = ${union}}}人`,
      `どれも受講していない: {{${N} − ${union} = ${ans}}}人`,
    ],
    quick: [
      'ベン図の中心(3つすべて)から外側へ順に埋めると、検算もできる。',
      `2つだけの部分: XYだけ {{${AB} − ${r.abc} = ${r.ab}}}、YZだけ {{${BC} − ${r.abc} = ${r.bc}}}、XZだけ {{${AC} − ${r.abc} = ${r.ac}}}`,
      `1つだけ: Xだけ {{${A} − ${r.ab} − ${r.ac} − ${r.abc} = ${r.a}}}、Yだけ ${r.b}、Zだけ ${r.c}`,
      `合計 {{${r.a} + ${r.b} + ${r.c} + ${r.ab} + ${r.bc} + ${r.ac} + ${r.abc} = ${union}}} → {{${N} − ${union} = ${ans}}}`,
    ],
    ko: `적어도 하나 = X + Y + Z − (두 개씩 겹침) + 셋 다 = ${A} + ${B} + ${C} − ${AB} − ${BC} − ${AC} + ${r.abc} = ${union}명. 아무것도 안 들은 학생 = ${N} − ${union} = ${ans}명. "셋 다"를 다시 더하는 것을 잊기 쉽습니다.`,
    tip: '3つの集合: 足す → 2つの重なりを引く → 3つの重なりを足し戻す。',
    params: { template: 'threeSets', ...r },
    check: () => {
      // 領域を1人ずつ並べて数え直す(包除原理とは別の方法)
      let cnt = 0;
      const people: [boolean, boolean, boolean][] = [];
      const push = (n: number, x: boolean, y: boolean, z: boolean) => {
        for (let i = 0; i < n; i++) people.push([x, y, z]);
      };
      push(r.a, true, false, false);
      push(r.b, false, true, false);
      push(r.c, false, false, true);
      push(r.ab, true, true, false);
      push(r.bc, false, true, true);
      push(r.ac, true, false, true);
      push(r.abc, true, true, true);
      push(r.none, false, false, false);
      for (const p of people) if (!p[0] && !p[1] && !p[2]) cnt++;
      const okA = people.filter((p) => p[0]).length === A;
      const okAB = people.filter((p) => p[0] && p[1]).length === AB;
      return okA && okAB && people.length === N ? F(cnt) : F(-1);
    },
  };
}

export function genShugo(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return twoSetsBoth(rng);
  if (diff === 2) return twoSetsOnly(rng);
  return threeSets(rng);
}
