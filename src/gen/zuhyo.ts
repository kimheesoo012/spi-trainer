import { F, Frac } from '../core/frac';
import { decStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty, TableData } from '../core/types';
import { numCand, type Cand, type Draft } from './framework';

// 図表の読み取り(GAB 計数・玉手箱で知られる形式の類似練習)。四捨五入の規則は問題文に書く

const NAMES = ['P国', 'Q国', 'R国', 'S国', 'T国'];
const YEARS = ['2022年', '2023年', '2024年'];

interface Data {
  item: { title: string; unit: string };
  v: number[][]; // [国][年]
}

function makeData(rng: Rng): Data {
  const item = rng.pick([
    { title: '自動車生産台数', unit: '万台' },
    { title: '小麦の生産量', unit: '万トン' },
    { title: '訪日旅行者数', unit: '万人' },
  ]);
  const v = NAMES.map(() => {
    const base = rng.int(120, 900);
    return YEARS.map((_, j) => Math.max(50, base + (j === 0 ? 0 : rng.int(-90, 140) * j)));
  });
  return { item, v };
}

function table(d: Data): TableData {
  return {
    caption: `5か国の${d.item.title}(単位: ${d.item.unit})`,
    headers: ['国', ...YEARS],
    rows: NAMES.map((n, i) => [n, ...d.v[i].map((x) => num(x))]),
  };
}

const pctR = (v: Frac) => `${num(v)}%`;

function share(rng: Rng): Draft | null {
  const d = makeData(rng);
  const y = 2;
  const c = rng.int(0, 4);
  const tot = d.v.reduce((s, r) => s + r[y], 0);
  const exact = F(d.v[c][y] * 100, tot);
  const ans = exact.round(0);
  const totPrev = d.v.reduce((s, r) => s + r[1], 0);
  const approxTot = Math.round(tot / 100) * 100;
  const fmt = (v: Frac) => (v.isInt() && v.isPos() ? pctR(v) : null);
  return {
    question_ja: `表の${YEARS[y]}において、5か国の合計に占める${NAMES[c]}の割合はおよそ何%か(小数点以下を四捨五入)。`,
    table: table(d),
    correct: { text: pctR(ans), value: ans },
    wrong: [
      numCand(F(d.v[c][1] * 100, totPrev).round(0), fmt, '前年(2023年)の割合を出した'),
      numCand(F(d.v[c][y] * 100, totPrev).round(0), fmt, '分母に前年の合計を使った'),
      numCand(F(d.v[(c + 1) % 5][y] * 100, tot).round(0), fmt, '隣の行を読んだ'),
      numCand(F(d.v[c][y] * 100, tot - d.v[c][y]).round(0), fmt, '自国を除いた合計で割った'),
    ],
    fillers: [numCand(ans.add(2), fmt), numCand(ans.sub(2), fmt), numCand(ans.add(4), fmt)],
    short: `${YEARS[y]}の合計は ${num(tot)}${d.item.unit}。\n{{${num(d.v[c][y])} ÷ ${num(tot)} × 100 ≒ ${decStr(exact.round(2))}}} → 四捨五入して ${pctR(ans)}。\n答えは ${pctR(ans)}。`,
    steps: [
      `${YEARS[y]}の5か国合計: {{${d.v.map((r) => num(r[y])).join(' + ')} = ${num(tot)}}}`,
      `${NAMES[c]}の割合: {{${num(d.v[c][y])} ÷ ${num(tot)} × 100 ≒ ${decStr(exact.round(2))}}}%`,
      `小数点以下を四捨五入して ${pctR(ans)}`,
    ],
    quick: [
      `合計をざっくり ${num(approxTot)} とみて {{${num(d.v[c][y])} ÷ ${num(approxTot)} × 100 ≒ ${decStr(F(d.v[c][y] * 100, approxTot).round(1))}}}。これで選択肢の見当がつく。`,
      '選択肢の差が小さいときだけ、正確な合計で計算し直す。',
    ],
    ko: `${YEARS[y]} 합계 ${num(tot)}. ${NAMES[c]}의 비율 = ${num(d.v[c][y])} ÷ ${num(tot)} × 100 ≒ ${decStr(exact.round(2))} → 반올림 ${pctR(ans)}. 합계를 대략 ${num(approxTot)}로 어림하면 빨리 후보를 좁힐 수 있습니다.`,
    tip: '割合 = 部分 ÷ 全体。全体は概数にして見当をつける。',
    params: { template: 'share', v: d.v, y, c },
    check: () => {
      // 合計を別の順で足し直し、整数演算で四捨五入
      let t = 0;
      for (let i = 4; i >= 0; i--) t += d.v[i][y];
      return F(Math.floor((d.v[c][y] * 200 + t) / (2 * t)));
    },
  };
}

function growth(rng: Rng): Draft | null {
  const d = makeData(rng);
  const c = rng.int(0, 4);
  const a = d.v[c][1];
  const b = d.v[c][2];
  if (b <= a) return null;
  const exact = F((b - a) * 100, a);
  const ans = exact.round(0);
  const fmt = (v: Frac) => (v.isInt() && v.isPos() ? pctR(v) : null);
  return {
    question_ja: `表で、${NAMES[c]}の2024年の${d.item.title}は、前年(2023年)に比べて約何%増加したか(小数点以下を四捨五入)。`,
    table: table(d),
    correct: { text: pctR(ans), value: ans },
    wrong: [
      numCand(F((b - a) * 100, b).round(0), fmt, '2024年を基準に割った'),
      numCand(F(b * 100, a).round(0), fmt, '増加率ではなく比率を出した'),
      numCand(F(b - a), fmt, '増加量をそのまま%にした'),
      numCand(F((d.v[c][2] - d.v[c][0]) * 100, d.v[c][0]).round(0), fmt, '2022年と比べた'),
    ],
    fillers: [numCand(ans.add(3), fmt), numCand(ans.add(1), fmt), numCand(ans.add(5), fmt)],
    short: `増加率 = 増加量 ÷ 前年の値。\n{{(${num(b)} − ${num(a)}) ÷ ${num(a)} × 100 ≒ ${decStr(exact.round(2))}}} → ${pctR(ans)}。\n答えは ${pctR(ans)}。`,
    steps: [
      `増加量: {{${num(b)} − ${num(a)} = ${num(b - a)}}}`,
      `基準は前年(2023年)の ${num(a)}: {{${num(b - a)} ÷ ${num(a)} × 100 ≒ ${decStr(exact.round(2))}}}%`,
      `小数点以下を四捨五入して ${pctR(ans)}`,
    ],
    quick: [
      `${num(a)} の10%は ${decStr(F(a, 10))}。増加量 ${num(b - a)} がその何個分かで見当をつける: {{${num(b - a)} ÷ ${decStr(F(a, 10))} ≒ ${decStr(F((b - a) * 10, a).round(3))}}}個分 → 10%の約${decStr(F((b - a) * 10, a).round(2))}倍 = 約${decStr(F((b - a) * 100, a).round(0))}%`,
      '分母は「比べられる側(前年)」。今年の値で割る選択肢はわな。',
    ],
    ko: `증가율 = 증가량 ÷ 전년도 값. (${num(b)} − ${num(a)}) ÷ ${num(a)} × 100 ≒ ${decStr(exact.round(2))} → 반올림 ${pctR(ans)}. 기준(분모)은 2023년 값입니다.`,
    tip: '「前年比○%増」の分母は前年の値。',
    params: { template: 'growth', v: d.v, c },
    check: () => F(Math.floor(((b - a) * 200 + a) / (2 * a))),
  };
}

function maxIncrease(rng: Rng): Draft | null {
  const d = makeData(rng);
  const inc = d.v.map((r) => r[2] - r[0]);
  const rate = d.v.map((r) => F(r[2] - r[0], r[0]));
  const maxInc = Math.max(...inc);
  const iMax = inc.indexOf(maxInc);
  if (inc.filter((x) => x === maxInc).length !== 1 || maxInc <= 0) return null;
  // 「増加率が最大の国」が別の国になるようにしてわなを作る
  let iRate = 0;
  for (let i = 1; i < 5; i++) if (rate[i].gt(rate[iRate])) iRate = i;
  if (iRate === iMax) return null;
  const big = d.v.map((r) => r[2]);
  const iBig = big.indexOf(Math.max(...big));
  const others: Cand[] = [iRate, iBig, 0, 1, 2, 3, 4].filter((i) => i !== iMax).map((i) => ({ text: NAMES[i], why: i === iRate ? '増加率が最大の国' : i === iBig ? '2024年の値が最大の国' : '' }));
  return {
    question_ja: `表で、2022年から2024年にかけての${d.item.title}の増加量が最も大きい国はどれか。`,
    table: table(d),
    correct: { text: NAMES[iMax] },
    wrong: others,
    short: `各国の「2024年 − 2022年」を比べる。\n${NAMES[iMax]}: {{${num(d.v[iMax][2])} − ${num(d.v[iMax][0])} = ${num(maxInc)}}} が最大。\n答えは ${NAMES[iMax]}。`,
    steps: [
      ...NAMES.map((n, i) => `${n}: {{${num(d.v[i][2])} − ${num(d.v[i][0])} = ${num(inc[i])}}}`),
      `最大は ${NAMES[iMax]}(${num(maxInc)}${d.item.unit})`,
    ],
    quick: [
      `問われているのは増加「量」。増加「率」が最大なのは ${NAMES[iRate]} なので混同しないこと。`,
      '値が小さく伸びが目立たない国は飛ばし、差が大きそうな国から引き算する。',
    ],
    ko: `증가"량"(2024년 − 2022년)을 비교합니다. ${NAMES[iMax]}가 ${num(maxInc)}로 최대. 증가"율"이 가장 큰 나라는 ${NAMES[iRate]}이므로 혼동하지 마세요.`,
    tip: '増加量(差)と増加率(差 ÷ 元)を区別する。',
    params: { template: 'maxIncrease', v: d.v },
    check: () => {
      let best = -1;
      let who = '';
      let tie = false;
      for (let i = 0; i < 5; i++) {
        const x = d.v[i][2] - d.v[i][0];
        if (x > best) {
          best = x;
          who = NAMES[i];
          tie = false;
        } else if (x === best) tie = true;
      }
      return tie ? '' : who;
    },
  };
}

function ratioTimes(rng: Rng): Draft | null {
  const d = makeData(rng);
  const i = rng.int(0, 4);
  let j = rng.int(0, 4);
  if (i === j) j = (j + 1) % 5;
  if (d.v[i][2] <= d.v[j][2]) return null;
  const exact = F(d.v[i][2], d.v[j][2]);
  const ans = exact.round(1);
  const fmt = (v: Frac) => (v.isPos() && v.mul(10).isInt() ? `約${decStr(v)}倍` : null);
  return {
    question_ja: `表で、2024年の${NAMES[i]}の${d.item.title}は、同じ年の${NAMES[j]}の約何倍か(小数第2位を四捨五入)。`,
    table: table(d),
    correct: { text: fmt(ans)!, value: ans },
    wrong: [
      numCand(F(d.v[j][2], d.v[i][2]).round(1), fmt, '割る順番が逆'),
      numCand(F(d.v[i][1], d.v[j][1]).round(1), fmt, '2023年の値で計算した'),
      numCand(F(d.v[i][2], d.v[j][1]).round(1), fmt, '年を取り違えた'),
    ],
    fillers: [numCand(ans.add(F(1, 10)), fmt), numCand(ans.sub(F(1, 10)), fmt), numCand(ans.add(F(2, 10)), fmt)],
    short: `「AはBの何倍か」は A ÷ B。\n{{${num(d.v[i][2])} ÷ ${num(d.v[j][2])} ≒ ${decStr(exact.round(3))}}} → 小数第2位を四捨五入して ${fmt(ans)}。\n答えは ${fmt(ans)}。`,
    steps: [
      `比べられる量(${NAMES[i]})÷ 基準の量(${NAMES[j]})`,
      `{{${num(d.v[i][2])} ÷ ${num(d.v[j][2])} ≒ ${decStr(exact.round(3))}}}`,
      `小数第2位を四捨五入して ${decStr(ans)}倍`,
    ],
    quick: [
      `${num(d.v[j][2])} × ${decStr(ans)} = ${decStr(ans.mul(d.v[j][2]))} が ${num(d.v[i][2])} に近いことを確かめる(掛け算の方が割り算より速い)。`,
    ],
    ko: `"A는 B의 몇 배"는 A ÷ B. ${num(d.v[i][2])} ÷ ${num(d.v[j][2])} ≒ ${decStr(exact.round(3))} → ${fmt(ans)}. 선택지 × ${num(d.v[j][2])}가 ${num(d.v[i][2])}에 가까운지 곱셈으로 확인하면 빠릅니다.`,
    tip: '割り算が重いときは、選択肢 × 基準の値 で確かめる。',
    params: { template: 'ratioTimes', v: d.v, i, j },
    check: () => F(Math.floor((d.v[i][2] * 20 + d.v[j][2]) / (2 * d.v[j][2])), 10),
  };
}

export function genZuhyo(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return share(rng);
  if (diff === 2) return rng.chance(0.5) ? growth(rng) : ratioTimes(rng);
  return rng.chance(0.5) ? maxIncrease(rng) : ratioTimes(rng);
}
