import { F, Frac } from '../core/frac';
import { decStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Cand, type Draft } from './framework';

// SPI 非言語「資料解釈」。表から計算して比べる

const CITIES = ['A市', 'B市', 'C市', 'D市'];

function densityMax(rng: Rng): Draft | null {
  const pop = CITIES.map(() => rng.int(8, 95)); // 万人
  const area = CITIES.map(() => rng.int(40, 600)); // km²
  const dens = pop.map((p, i) => F(p * 10000, area[i]));
  let iMax = 0;
  for (let i = 1; i < 4; i++) if (dens[i].gt(dens[iMax])) iMax = i;
  if (dens.filter((x) => x.eq(dens[iMax])).length > 1) return null;
  const iPop = pop.indexOf(Math.max(...pop));
  const iArea = area.indexOf(Math.min(...area));
  if (iPop === iMax) return null; // 「人口が最大」と答えが同じにならないようにする
  const wrong: Cand[] = [iPop, iArea, 0, 1, 2, 3].filter((i) => i !== iMax).map((i) => ({ text: CITIES[i], why: i === iPop ? '人口が最大' : i === iArea ? '面積が最小' : '' }));
  return {
    question_ja: '表の4つの市のうち、人口密度(1km²あたりの人口)が最も高いのはどれか。',
    table: {
      caption: '4つの市の人口と面積',
      headers: ['市', '人口(万人)', '面積(km²)'],
      rows: CITIES.map((c, i) => [c, `${pop[i]}`, `${area[i]}`]),
    },
    correct: { text: CITIES[iMax] },
    wrong,
    short: `人口密度 = 人口 ÷ 面積。各市を比べると ${CITIES[iMax]} が最大(約${num(dens[iMax].round(0))}人/km²)。\n答えは ${CITIES[iMax]}。`,
    steps: CITIES.map((c, i) => `${c}: {{${pop[i]} × 10,000 ÷ ${area[i]} ≒ ${num(dens[i].round(0))}}}人/km²`).concat(`最大は ${CITIES[iMax]}`),
    quick: [
      '比べるだけなら単位(万人)はそろっているので、「人口 ÷ 面積」の大小だけ見ればよい。',
      `人口が最も多い ${CITIES[iPop]} が人口密度も最大とは限らない。面積で割ることを忘れない。`,
    ],
    ko: `인구밀도 = 인구 ÷ 면적. ${CITIES.map((c, i) => `${c} ≒ ${num(dens[i].round(0))}`).join(', ')}(명/km²) → ${CITIES[iMax]}가 최대. 인구가 가장 많은 ${CITIES[iPop]}가 답이 아닙니다.`,
    tip: '「〜あたり」は割り算。比べるだけなら単位をそろえる必要はない。',
    params: { template: 'densityMax', pop, area },
    check: () => {
      // 割り算を使わず、たすき掛けで比べる
      let best = 0;
      for (let i = 1; i < 4; i++) if (pop[i] * area[best] > pop[best] * area[i]) best = i;
      return CITIES[best];
    },
  };
}

function densityRatio(rng: Rng): Draft | null {
  const pop = CITIES.map(() => rng.int(8, 95));
  const area = CITIES.map(() => rng.int(40, 600));
  const i = rng.int(0, 3);
  let j = rng.int(0, 3);
  if (i === j) j = (j + 1) % 4;
  const di = F(pop[i], area[i]);
  const dj = F(pop[j], area[j]);
  if (!di.gt(dj)) return null;
  const exact = di.div(dj);
  const ans = exact.round(1);
  if (ans.gt(9)) return null;
  const fmt = (v: Frac) => (v.isPos() && v.mul(10).isInt() ? `約${decStr(v)}倍` : null);
  return {
    question_ja: `表で、${CITIES[i]}の人口密度は${CITIES[j]}の人口密度の約何倍か(小数第2位を四捨五入)。`,
    table: {
      caption: '4つの市の人口と面積',
      headers: ['市', '人口(万人)', '面積(km²)'],
      rows: CITIES.map((c, k) => [c, `${pop[k]}`, `${area[k]}`]),
    },
    correct: { text: fmt(ans)!, value: ans },
    wrong: [
      numCand(F(pop[i], pop[j]).round(1), fmt, '人口だけを比べた'),
      numCand(F(area[j], area[i]).round(1), fmt, '面積だけを比べた'),
      numCand(dj.div(di).round(1), fmt, '割る順番が逆'),
      numCand(F(pop[i] * area[i], pop[j] * area[j]).round(1), fmt, '人口×面積で比べた'),
    ],
    fillers: [numCand(ans.add(F(1, 10)), fmt), numCand(ans.sub(F(1, 10)), fmt), numCand(ans.add(F(2, 10)), fmt)],
    short: `(${CITIES[i]}の人口 ÷ 面積)÷(${CITIES[j]}の人口 ÷ 面積)。\n{{(${pop[i]} ÷ ${area[i]}) ÷ (${pop[j]} ÷ ${area[j]}) ≒ ${decStr(exact.round(3))}}} → ${fmt(ans)}。\n答えは ${fmt(ans)}。`,
    steps: [
      `${CITIES[i]}の人口密度: {{${pop[i]} ÷ ${area[i]} ≒ ${decStr(di.round(4))}}}(万人/km²)`,
      `${CITIES[j]}の人口密度: {{${pop[j]} ÷ ${area[j]} ≒ ${decStr(dj.round(4))}}}(万人/km²)`,
      `{{${decStr(di.round(4))} ÷ ${decStr(dj.round(4))} ≒ ${decStr(exact.round(3))}}} → 小数第2位を四捨五入して ${decStr(ans)}倍`,
    ],
    quick: [
      `割り算を1回にまとめる: {{${pop[i]} × ${area[j]} ÷ (${area[i]} × ${pop[j]}) ≒ ${decStr(exact.round(3))}}}`,
      '「人口の比」と「面積の逆比」を掛けたもの、と考えてもよい。',
    ],
    ko: `인구밀도의 비 = (${pop[i]} ÷ ${area[i]}) ÷ (${pop[j]} ÷ ${area[j]}) = ${pop[i]} × ${area[j]} ÷ (${area[i]} × ${pop[j]}) ≒ ${decStr(exact.round(3))} → ${fmt(ans)}. 나눗셈을 한 번으로 묶으면 계산이 줄어듭니다.`,
    tip: '比の比は、分数のまま掛け算1回にまとめる。',
    params: { template: 'densityRatio', pop, area, i, j },
    check: () => F(Math.floor((pop[i] * area[j] * 20 + area[i] * pop[j]) / (2 * area[i] * pop[j])), 10),
  };
}

function elderlyMax(rng: Rng): Draft | null {
  const pop = CITIES.map(() => rng.int(10, 90)); // 万人
  const rate = CITIES.map(() => rng.int(18, 38)); // %
  const old = pop.map((p, i) => F(p * rate[i], 100)); // 万人
  let iMax = 0;
  for (let i = 1; i < 4; i++) if (old[i].gt(old[iMax])) iMax = i;
  if (old.filter((x) => x.eq(old[iMax])).length > 1) return null;
  const iRate = rate.indexOf(Math.max(...rate));
  const iPop = pop.indexOf(Math.max(...pop));
  if (iRate === iMax || rate.filter((r) => r === rate[iRate]).length > 1) return null;
  const wrong: Cand[] = [iRate, iPop, 0, 1, 2, 3].filter((i) => i !== iMax).map((i) => ({ text: CITIES[i], why: i === iRate ? '割合が最大' : i === iPop ? '人口が最大' : '' }));
  return {
    question_ja: '表の4つの市のうち、65歳以上の人口(人数)が最も多いのはどれか。',
    table: {
      caption: '4つの市の人口と65歳以上の割合',
      headers: ['市', '人口(万人)', '65歳以上の割合(%)'],
      rows: CITIES.map((c, i) => [c, `${pop[i]}`, `${rate[i]}`]),
    },
    correct: { text: CITIES[iMax] },
    wrong,
    short: `人数 = 人口 × 割合。${CITIES[iMax]}: {{${pop[iMax]} × ${rate[iMax]}% = ${decStr(old[iMax])}}}万人が最大。\n答えは ${CITIES[iMax]}。`,
    steps: CITIES.map((c, i) => `${c}: {{${pop[i]} × ${rate[i]}% = ${decStr(old[i])}}}万人`).concat(`最大は ${CITIES[iMax]}`),
    quick: [
      `割合が最大の ${CITIES[iRate]} が人数でも最大とは限らない。人数を比べるときは必ず人口を掛ける。`,
      '比べるだけなら「人口 × 割合の数字」の大小を見ればよい(÷100 は全部同じなので省略できる)。',
    ],
    ko: `인원 = 인구 × 비율. ${CITIES.map((c, i) => `${c} ${decStr(old[i])}만 명`).join(', ')} → ${CITIES[iMax]}가 최대. 비율이 가장 높은 ${CITIES[iRate]}가 인원도 최대인 것은 아닙니다.`,
    tip: '割合の大小と、実数(人数)の大小を区別する。',
    params: { template: 'elderlyMax', pop, rate },
    check: () => {
      let best = 0;
      for (let i = 1; i < 4; i++) if (pop[i] * rate[i] > pop[best] * rate[best]) best = i;
      return CITIES[best];
    },
  };
}

export function genShiryo(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return densityMax(rng);
  if (diff === 2) return elderlyMax(rng);
  return densityRatio(rng);
}
