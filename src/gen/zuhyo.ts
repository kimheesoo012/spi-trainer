import { F, Frac } from '../core/frac';
import { decStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty, TableData } from '../core/types';
import { numCand, type Cand, type Draft } from './framework';
import { barMaxRate, barTimes, densityMax, indexAmount, indexGrowth, lineMaxGap, lineRatio, pie2Change, pieAmount, pieDiff } from './zuhyoChart';

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
  const approx = F(d.v[c][y] * 100, approxTot);
  const approxOK = approx.round(0).eq(ans) && approxTot !== tot;
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
    intuition: `「合計に占める割合」は 部分 ÷ 全体。合計 ${num(tot)} を ${num(approxTot)} と丸めても割合はほとんど変わらないので、まず概数で見当をつけ、選択肢が近いときだけ正確に計算する。`,
    cue: '「合計に占める割合は何%」→ その国 ÷ 5か国の合計 × 100(合計は概数でよい)',
    fast: approxOK
      ? [`合計を ${num(approxTot)} と丸める: {{${num(d.v[c][y])} ÷ ${num(approxTot)} × 100 ≒ ${decStr(approx.round(1))}}} → 四捨五入して ${pctR(ans)}(選択肢が離れているので概算で十分)`]
      : [],
    fastCheck: () => approx.round(0),
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
    intuition: `「前年に比べて何%増」は、増えた量が前年の何%にあたるか。分母は比べる元の2023年の ${num(a)}。${num(a)} の10%は ${decStr(F(a, 10))} なので、増加量 ${num(b - a)} がその何個分かを見れば、桁を間違えずに見当がつく。`,
    cue: '「前年に比べて何%増加」→ (今年 − 前年) ÷ 前年 × 100(分母は前年)',
    fast: [],
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
    intuition: `問われているのは増加「量」= 2024年 − 2022年 の差そのもの。割り算はいらない。増加「率」(差 ÷ 元の値)が最大の ${NAMES[iRate]} とは別の問いなので、言葉に引きずられないこと。`,
    cue: '「増加量が最も大きい国」→ 各国の(あと − 前)を引き算して比べる(率ではない)',
    fast: [],
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
    intuition: `「AはBの何倍か」は A ÷ B で、「〜の」が付く ${NAMES[j]} が基準(割る数)。割り算を筆算するより、選択肢の倍率を基準の値に掛けて ${num(d.v[i][2])} に近いものを探す方が速い。`,
    cue: '「AはBの約何倍」→ A ÷ B。割り算が重ければ 選択肢 × B で確かめる',
    fast: [`選択肢を基準に掛けて確かめる: {{${num(d.v[j][2])} × ${decStr(ans)} = ${decStr(ans.mul(d.v[j][2]))}}} が ${num(d.v[i][2])} に最も近い → ${fmt(ans)}`],
    fastCheck: () => {
      // 選択肢の倍率 k(0.1刻み)のうち、基準 × k が比べられる量に最も近いもの
      const B = d.v[j][2];
      const A = d.v[i][2];
      let best = F(1, 10);
      for (let t = 1; t <= 2000; t++) {
        const k = F(t, 10);
        const diff = k.mul(B).sub(A);
        const bd = best.mul(B).sub(A);
        const ad = diff.isPos() ? diff : diff.neg();
        const abd = bd.isPos() ? bd : bd.neg();
        if (ad.lt(abd) || ad.eq(abd)) best = k; // 同じ近さなら大きい方(四捨五入と同じ向き)
      }
      return best;
    },
    tip: '割り算が重いときは、選択肢 × 基準の値 で確かめる。',
    params: { template: 'ratioTimes', v: d.v, i, j },
    check: () => F(Math.floor((d.v[i][2] * 20 + d.v[j][2]) / (2 * d.v[j][2])), 10),
  };
}

// ---- 構成比の表(本番でよく出る「合計 × 構成比」型)
const DIVS = ['A部門', 'B部門', 'C部門', 'D部門', 'E部門'];

interface Comp {
  s: number[][]; // [部門][年] 構成比(%)。各年の合計は100
  T: number[]; // [年] 売上高合計(億円)
}

function makeComp(rng: Rng): Comp | null {
  const cols = YEARS.map(() => {
    const w = DIVS.map(() => rng.int(8, 34));
    const sum = w.reduce((a, b) => a + b, 0);
    const p = w.map((x) => Math.floor((x * 100) / sum));
    p[0] += 100 - p.reduce((a, b) => a + b, 0);
    return p;
  });
  if (cols.some((p) => p.some((x) => x < 6))) return null;
  const base = rng.int(40, 220) * 10;
  const T = YEARS.map((_, j) => base + (j === 0 ? 0 : rng.int(-12, 30) * 10 * j));
  if (T.some((t) => t < 300)) return null;
  return { s: DIVS.map((_, i) => cols.map((p) => p[i])), T };
}

function compTable(d: Comp): TableData {
  return {
    caption: 'ある会社の部門別売上高の構成比と、売上高の合計',
    headers: ['部門', ...YEARS],
    rows: [...DIVS.map((n, i) => [n, ...d.s[i].map((x) => `${x}%`)]), ['合計(億円)', ...d.T.map((t) => num(t))]],
    note: '「合計(億円)」は、その年の全部門の売上高の合計。',
    dense: true,
  };
}

const oku = (v: Frac) => (v.isInt() && v.isPos() ? `約${num(v)}億円` : null);

function compAmount(rng: Rng): Draft | null {
  const d = makeComp(rng);
  if (!d) return null;
  const y = rng.int(1, 2);
  const c = rng.int(0, 4);
  const T = d.T[y];
  const s = d.s[c][y];
  const exact = F(T * s, 100);
  const ans = exact.round(0);
  const ten = F(T, 10);
  return {
    question_ja: `表で、${YEARS[y]}の${DIVS[c]}の売上高はおよそいくらか(億円未満を四捨五入)。`,
    table: compTable(d),
    correct: { text: oku(ans)!, value: ans },
    wrong: [
      numCand(F(T * d.s[c][y - 1], 100).round(0), oku, '前年の構成比を使った'),
      numCand(F(d.T[y - 1] * s, 100).round(0), oku, '前年の売上高合計を使った'),
      numCand(F(T * d.s[(c + 1) % 5][y], 100).round(0), oku, '隣の部門の構成比を読んだ'),
    ],
    fillers: [numCand(ans.add(F(Math.max(5, Math.round(T / 100)))), oku), numCand(ans.sub(F(Math.max(5, Math.round(T / 100)))), oku), numCand(ans.add(F(Math.max(10, Math.round(T / 50)))), oku)],
    short: `部門の売上高 = 売上高合計 × 構成比。\n{{${num(T)} × ${s} ÷ 100 = ${decStr(exact)}}} → ${oku(ans)}。\n答えは ${oku(ans)}。`,
    steps: [
      `${YEARS[y]}の列を読む: 売上高合計は ${num(T)}億円、${DIVS[c]}の構成比は ${s}%`,
      `売上高合計 × 構成比: {{${num(T)} × ${s} ÷ 100 = ${decStr(exact)}}}`,
      `億円未満を四捨五入して ${oku(ans)}`,
    ],
    quick: [
      `10%は ${decStr(ten)}億円。${s}% はその ${decStr(F(s, 10))}個分: {{${decStr(ten)} × ${decStr(F(s, 10))} = ${decStr(exact)}}}`,
      '年(列)と部門(行)を指でたどってから計算する。読み違いの選択肢が必ず入っている。',
    ],
    ko: `구성비 표는 "전체 × 구성비 = 그 부문의 금액"입니다.\n${YEARS[y]} 매출 합계 ${num(T)}억 엔 × ${DIVS[c]} 구성비 ${s}% = ${decStr(exact)} → ${oku(ans)}.\n빨리 푸는 법: 10%가 ${decStr(ten)}억 엔이므로 ${s}%는 그 ${decStr(F(s, 10))}배.\n함정: 전년도 구성비나 전년도 합계를 쓰면 다른 선택지가 나옵니다. 연도(열)와 부문(행)을 먼저 확인하세요.`,
    intuition: `構成比の表は「全体 × 割合 = その部門の量」。${YEARS[y]}の合計 ${num(T)}億円 の10%は ${decStr(ten)}億円 なので、${s}% はその約${decStr(F(s, 10))}個分と見当をつける。`,
    cue: '「構成比の表で、ある部門の売上高」→ その年の売上高合計 × その部門の構成比',
    fast: [],
    tip: '構成比の表は 合計 × 構成比。まず10%の値を出すと速い。',
    params: { template: 'compAmount', c, y },
    check: () => F(Math.floor((T * s * 2 + 100) / 200)),
  };
}

function compTimes(rng: Rng): Draft | null {
  const d = makeComp(rng);
  if (!d) return null;
  const c = rng.int(0, 4);
  const [T1, T2] = [d.T[1], d.T[2]];
  const [s1, s2] = [d.s[c][1], d.s[c][2]];
  if (T1 === T2 || s1 === s2) return null;
  const a1 = F(T1 * s1, 100);
  const a2 = F(T2 * s2, 100);
  const exact = a2.div(a1);
  const ans = exact.round(1);
  const fmt = (v: Frac) => (v.isPos() && v.mul(10).isInt() ? `約${decStr(v)}倍` : null);
  const onlyS = F(s2, s1).round(1);
  const onlyT = F(T2, T1).round(1);
  if (onlyS.eq(ans) || onlyT.eq(ans)) return null; // 構成比だけ・合計だけで答えが出る問題は出さない
  return {
    question_ja: `表で、2024年の${DIVS[c]}の売上高は、2023年の${DIVS[c]}の売上高の約何倍か(小数第2位を四捨五入)。`,
    table: compTable(d),
    correct: { text: fmt(ans)!, value: ans },
    wrong: [numCand(onlyS, fmt, '構成比だけを比べた(売上高合計の変化を忘れた)'), numCand(onlyT, fmt, '売上高合計だけを比べた'), numCand(a1.div(a2).round(1), fmt, '割る順番が逆')],
    fillers: [numCand(ans.add(F(1, 10)), fmt), numCand(ans.sub(F(1, 10)), fmt), numCand(ans.add(F(2, 10)), fmt)],
    short: `構成比ではなく、売上高(合計 × 構成比)どうしを比べる。\n2023年: {{${num(T1)} × ${s1} ÷ 100 = ${decStr(a1)}}}、2024年: {{${num(T2)} × ${s2} ÷ 100 = ${decStr(a2)}}}\n{{${decStr(a2)} ÷ ${decStr(a1)} ≒ ${decStr(exact.round(3))}}} → ${fmt(ans)}。\n答えは ${fmt(ans)}。`,
    steps: [
      `2023年の${DIVS[c]}: {{${num(T1)} × ${s1} ÷ 100 = ${decStr(a1)}}}億円`,
      `2024年の${DIVS[c]}: {{${num(T2)} × ${s2} ÷ 100 = ${decStr(a2)}}}億円`,
      `{{${decStr(a2)} ÷ ${decStr(a1)} ≒ ${decStr(exact.round(3))}}}`,
      `小数第2位を四捨五入して ${decStr(ans)}倍`,
    ],
    quick: [
      `÷100 は両方にあるので省ける: {{(${num(T2)} × ${s2}) ÷ (${num(T1)} × ${s1}) ≒ ${decStr(exact.round(3))}}}`,
      `構成比だけの比({{${s2} ÷ ${s1} ≒ ${decStr(F(s2, s1).round(2))}}})は、売上高合計が変わっているので答えにならない。`,
    ],
    ko: `구성비(%)끼리 비교하면 안 되고, 금액(합계 × 구성비)끼리 비교해야 합니다. 합계가 해마다 다르기 때문입니다.\n2023년: ${num(T1)} × ${s1}% = ${decStr(a1)}억 엔\n2024년: ${num(T2)} × ${s2}% = ${decStr(a2)}억 엔\n${decStr(a2)} ÷ ${decStr(a1)} ≒ ${decStr(exact.round(3))} → ${fmt(ans)}.\n함정: 구성비만 나누면 ${fmt(onlyS)}, 합계만 나누면 ${fmt(onlyT)}가 나옵니다. 둘 다 선택지에 있을 수 있습니다.`,
    intuition: `構成比は「その年の合計に対する割合」なので、年が違えば元になる合計も違う。部門の売上高そのもの(合計 × 構成比)を2年分出してから割る。`,
    cue: '「構成比の表で、ある部門が前年の何倍か」→ (合計 × 構成比) を2年分出して割る(構成比どうしを割らない)',
    fast: [],
    tip: '年が違う構成比どうしは直接比べられない。必ず実額に直す。',
    params: { template: 'compTimes', c },
    check: () => F(Math.floor((T2 * s2 * 20 + T1 * s1) / (2 * T1 * s1)), 10),
  };
}

// ---- 対前年増加率から前年の値に戻す(本番の定番)
const SHOPS = ['駅前店', '中央店', '港店', '北口店', '公園店'];

function prevFromRate(rng: Rng): Draft | null {
  const v = SHOPS.map(() => rng.int(90, 480) * 10);
  const r = SHOPS.map(() => rng.int(4, 28));
  const c = rng.int(0, 4);
  const exact = F(v[c] * 100, 100 + r[c]);
  const ans = exact.round(0);
  const man = (x: Frac) => (x.isInt() && x.isPos() ? `約${num(x)}万円` : null);
  const sub = F(v[c] * (100 - r[c]), 100).round(0);
  if (sub.eq(ans)) return null;
  const k = F(100 + r[c], 100);
  return {
    question_ja: `表で、${SHOPS[c]}の2023年の売上高はおよそいくらか(万円未満を四捨五入)。`,
    table: {
      caption: 'あるチェーンの店舗別売上高(2024年)と対前年増加率',
      headers: ['店舗', '売上高(万円)', '対前年増加率'],
      rows: SHOPS.map((n, i) => [n, num(v[i]), `${r[i]}%`]),
      note: '売上高は2024年の金額。対前年増加率は、2023年と比べた増加率。',
      dense: true,
    },
    correct: { text: man(ans)!, value: ans },
    wrong: [
      numCand(sub, man, '2024年の値から増加率の分を引いた(基準が違う)'),
      numCand(F(v[c] * (100 + r[c]), 100).round(0), man, '増加率を掛けた(2025年を求める計算)'),
      numCand(F(v[c] * 100, 100 + r[(c + 1) % 5]).round(0), man, '隣の店の増加率を読んだ'),
    ],
    fillers: [numCand(ans.add(F(20)), man), numCand(ans.sub(F(20)), man), numCand(ans.add(F(40)), man)],
    short: `2024年 = 2023年 × ${decStr(k)} なので、2023年 = 2024年 ÷ ${decStr(k)}。\n{{${num(v[c])} ÷ ${decStr(k)} ≒ ${decStr(exact.round(1))}}} → ${man(ans)}。\n答えは ${man(ans)}。`,
    steps: [
      `対前年増加率 ${r[c]}% は「2023年を100としたとき、2024年が ${100 + r[c]}」という意味`,
      `2024年 = 2023年 × ${decStr(k)} → 2023年 = 2024年 ÷ ${decStr(k)}`,
      `{{${num(v[c])} ÷ ${decStr(k)} ≒ ${decStr(exact.round(1))}}}`,
      `万円未満を四捨五入して ${man(ans)}`,
    ],
    quick: [
      `検算は掛け算で: {{${num(ans)} × ${decStr(k)} ≒ ${num(v[c])}}}`,
      `2024年の値から ${r[c]}% を引く({{${num(v[c])} × ${decStr(F(100 - r[c], 100))} ≒ ${num(sub)}}})のは誤り。${r[c]}% の基準は2023年の値。`,
    ],
    ko: `"対前年増加率 ${r[c]}%"는 2023년을 100으로 봤을 때 2024년이 ${100 + r[c]}라는 뜻입니다.\n따라서 2023년 = 2024년 ÷ ${decStr(k)} = ${num(v[c])} ÷ ${decStr(k)} ≒ ${decStr(exact.round(1))} → ${man(ans)}.\n가장 흔한 함정: 2024년 값에서 ${r[c]}%를 빼는 것(${num(v[c])} × ${decStr(F(100 - r[c], 100))} ≒ ${num(sub)}). 증가율의 기준은 2023년 값이므로 틀립니다. 반드시 나눗셈으로 되돌립니다.\n검산: ${num(ans)} × ${decStr(k)} ≒ ${num(v[c])}.`,
    intuition: `増加率の基準(100%)は前年の値。2024年の値は「前年の ${100 + r[c]}%」なので、前年に戻すには ${decStr(k)} で割る。2024年の値から ${r[c]}% を引くと、基準が違うのでずれる。`,
    cue: '「対前年増加率から前年の値」→ 今年の値 ÷ (1 + 増加率)(引き算で戻さない)',
    fast: [],
    tip: '前年に戻すときは ÷(1 + 増加率)。今年の値から%を引かない。',
    params: { template: 'prevFromRate', c },
    check: () => F(Math.floor((v[c] * 200 + (100 + r[c])) / (2 * (100 + r[c])))),
  };
}

export function genZuhyo(rng: Rng, diff: Difficulty): Draft | null {
  type T = (r: Rng) => Draft | null;
  // 先に型を1つ決め、その型で作れるまで数値を引き直す(条件の厳しい型が出にくくならないようにする)
  const pick = (a: T[]) => {
    const t = a[rng.int(0, a.length - 1)];
    for (let i = 0; i < 60; i++) {
      const d = t(rng);
      if (d) return d;
    }
    return null;
  };
  if (diff === 1) return pick([share, compAmount, barTimes, pieAmount]);
  if (diff === 2) return pick([growth, ratioTimes, prevFromRate, compAmount, (r) => barMaxRate(r, 2), pieDiff, lineMaxGap, lineRatio, (r) => densityMax(r, 2)]);
  return pick([maxIncrease, ratioTimes, compTimes, prevFromRate, (r) => barMaxRate(r, 3), pie2Change, (r) => densityMax(r, 3), indexAmount, indexGrowth]);
}
