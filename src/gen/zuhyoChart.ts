import { F, Frac } from '../core/frac';
import { decStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { ChartData, Difficulty, TableData } from '../core/types';
import { numCand, type Cand, type Draft } from './framework';

// 図表の読み取り(本番形式)のうち、グラフ(棒・折れ線・円)と、人口密度・指数の表を使う問題。
// グラフの数値はすべて図の中に書いてあるので、読み取った数値で正確に計算できる。

const pctR = (v: Frac) => `${num(v)}%`;
const fPct = (v: Frac) => (v.isInt() && v.isPos() ? pctR(v) : null);
const fTimes = (v: Frac) => (v.isPos() && v.mul(10).isInt() ? `約${decStr(v)}倍` : null);
const fMan = (v: Frac) => (v.isInt() && v.isPos() ? `${num(v)}万円` : null);
const fDai = (v: Frac) => (v.isInt() && v.isPos() ? `${num(v)}台` : null);

// ---------------------------------------------------------------- 棒グラフ(年度別売上高)

const FY = ['2019', '2020', '2021', '2022', '2023', '2024'];
const fy = (i: number) => `${FY[i]}年度`;

function makeBars(rng: Rng): number[] {
  const out = [rng.int(20, 90) * 10];
  for (let i = 1; i < 6; i++) out.push(Math.max(120, out[i - 1] + rng.int(-5, 12) * 10));
  return out;
}

const barChart = (v: number[]): ChartData => ({ kind: 'bar', caption: 'ある会社の年度別売上高(単位: 億円)', labels: FY, series: [{ values: v }] });

export function barTimes(rng: Rng): Draft | null {
  const v = makeBars(rng);
  const b = rng.int(0, 3);
  const a = rng.int(b + 2, 5);
  if (v[a] <= v[b]) return null;
  const exact = F(v[a], v[b]);
  const ans = exact.round(1);
  return {
    question_ja: `グラフで、${fy(a)}の売上高は、${fy(b)}の売上高の約何倍か(小数第2位を四捨五入)。`,
    charts: [barChart(v)],
    correct: { text: fTimes(ans)!, value: ans },
    wrong: [
      numCand(F(v[b], v[a]).round(1), fTimes, '割る順番が逆'),
      numCand(F(v[a - 1], v[b]).round(1), fTimes, `${fy(a - 1)}の棒を読んだ`),
      numCand(F(v[a], v[b + 1]).round(1), fTimes, `${fy(b + 1)}の棒を基準にした`),
    ],
    fillers: [numCand(ans.add(F(1, 10)), fTimes), numCand(ans.sub(F(1, 10)), fTimes), numCand(ans.add(F(2, 10)), fTimes), numCand(ans.sub(F(2, 10)), fTimes)],
    short: `「AはBの何倍か」は A ÷ B。\n{{${num(v[a])} ÷ ${num(v[b])} ≒ ${decStr(exact.round(3))}}} → 小数第2位を四捨五入して ${fTimes(ans)}。\n答えは ${fTimes(ans)}。`,
    steps: [
      `グラフから読む: ${fy(a)}は ${num(v[a])}億円、${fy(b)}は ${num(v[b])}億円`,
      `比べられる量 ÷ 基準の量: {{${num(v[a])} ÷ ${num(v[b])} ≒ ${decStr(exact.round(3))}}}`,
      `小数第2位を四捨五入して ${decStr(ans)}倍`,
    ],
    quick: [
      `割り算より掛け算で確かめるほうが速い: {{${num(v[b])} × ${decStr(ans)} = ${decStr(ans.mul(v[b]))}}} が ${num(v[a])} に近い。`,
      '年度(横軸)を1つずらして読んだ選択肢が入っている。棒の上の数字と年度を確かめてから計算する。',
    ],
    ko: `"A는 B의 몇 배"는 A ÷ B입니다. "〜の"가 붙는 쪽(${fy(b)})이 기준(나누는 수)입니다.\n그래프에서 ${fy(a)} ${num(v[a])}억 엔, ${fy(b)} ${num(v[b])}억 엔을 읽고 ${num(v[a])} ÷ ${num(v[b])} ≒ ${decStr(exact.round(3))} → ${fTimes(ans)}.\n빨리 푸는 법: 나눗셈 대신 "기준 × 선택지"를 곱해서 ${num(v[a])}에 가까운 것을 찾습니다.\n함정: 연도를 한 칸 옆으로 읽은 값과, 나누는 순서를 반대로 한 값이 선택지에 있습니다.`,
    intuition: `「AはBの何倍か」は A ÷ B で、「〜の」が付く${fy(b)}が基準(割る数)。棒の高さを見比べると ${num(v[a])} は ${num(v[b])} の${ans.gt(F(3, 2)) ? '1.5倍を超えている' : '1.5倍に届かない'}ので、まず選択肢をしぼってから計算する。`,
    cue: '「AはBの約何倍」→ A ÷ B(「〜の」が付くほうが割る数)',
    fast: [],
    tip: 'グラフの問題は、先に年度と数値を2つ書き出してから計算する。',
    params: { template: 'barTimes', a, b },
    check: () => F(Math.floor((v[a] * 20 + v[b]) / (2 * v[b])), 10),
  };
}

export function barMaxRate(rng: Rng, diff: Difficulty): Draft | null {
  const v = makeBars(rng);
  const ks = [0, 1, 2, 3, 4]; // k 番目 = (k+1)年目の、前年度からの変化
  const inc = ks.map((k) => v[k + 1] - v[k]);
  const rate = ks.map((k) => F(v[k + 1] - v[k], v[k]));
  let best = 0;
  for (const k of ks) if (rate[k].gt(rate[best])) best = k;
  if (!rate[best].isPos() || rate.filter((r) => r.eq(rate[best])).length !== 1) return null;
  const maxInc = Math.max(...inc);
  const kAmt = inc.indexOf(maxInc);
  const top = Math.max(...v.slice(1));
  const kBig = v.slice(1).indexOf(top);
  // 難しい問題では、増加量が最大の年度と増加率が最大の年度を別にする
  if (diff === 3 && kAmt === best) return null;
  const names = ks.map((k) => fy(k + 1));
  const others: Cand[] = [kAmt, kBig, ...ks].filter((k) => k !== best).map((k) => ({ text: names[k], why: k === kAmt ? '増加量が最大の年度' : k === kBig ? '売上高が最大の年度' : '' }));
  const p2 = (k: number) => decStr(rate[k].mul(100).round(2));
  return {
    question_ja: 'グラフで、前年度と比べた売上高の増加率が最も大きいのは何年度か。',
    charts: [barChart(v)],
    correct: { text: names[best] },
    wrong: others,
    short: `前年度からの増加率 = 増加量 ÷ 前年度の売上高。\n${names[best]}: {{(${num(v[best + 1])} − ${num(v[best])}) ÷ ${num(v[best])} × 100 ≒ ${p2(best)}}}% が最大。\n答えは ${names[best]}。`,
    steps: [
      ...ks.map((k) => (inc[k] > 0 ? `${names[k]}: {{${num(inc[k])} ÷ ${num(v[k])} × 100 ≒ ${p2(k)}}}%` : `${names[k]}: 前年度より増えていない(対象外)`)),
      `最大は ${names[best]}`,
    ],
    quick: [
      kAmt === best ? `増加量が最大なのも ${names[best]}(${num(maxInc)}億円)。前年度の売上高も小さめなので、増加率も最大になる。` : `増加量が最大なのは ${names[kAmt]}(${num(maxInc)}億円)だが、前年度の売上高が大きいので、増加率は ${names[best]} のほうが大きい。`,
      '全部を計算しない。棒が大きく伸びた年度を2つほど選び、「増加量 ÷ 前年度」を比べる。',
    ],
    ko: `증가율 = 증가량 ÷ 전년도 매출입니다(분모는 전년도).\n${names[best]}: (${num(v[best + 1])} − ${num(v[best])}) ÷ ${num(v[best])} × 100 ≒ ${p2(best)}%로 최대입니다.\n${kAmt === best ? '증가"량"이 가장 큰 연도도 같은 연도입니다.' : `증가"량"이 가장 큰 것은 ${names[kAmt]}(${num(maxInc)}억 엔)이지만, 전년도 매출이 커서 증가"율"은 더 작습니다. 이 연도가 함정 선택지입니다.`}\n요령: 전부 계산하지 말고, 막대가 크게 늘어난 연도 두 개 정도만 골라 "증가량 ÷ 전년도"를 비교하세요. 증가량이 비슷하면 전년도 매출이 작은 쪽의 증가율이 큽니다.`,
    intuition: `増加率は「増加量 ÷ 前年度の売上高」。増加量が同じくらいなら、前年度の売上高が小さい年度ほど増加率は大きい。棒が大きく伸びていて、しかも前の棒が低い年度が候補になる。`,
    cue: '「前年度と比べた増加率が最も大きい年度」→ 各年度の(今年度 − 前年度)÷ 前年度 を比べる(増加量ではない)',
    fast: [],
    tip: '増加量(差)と増加率(差 ÷ 前の値)を区別する。',
    params: { template: 'barMaxRate' },
    check: () => {
      // 掛け算で分数の大小を比べる(inc_k / v_k と inc_b / v_b)
      let b = 0;
      for (let k = 1; k < 5; k++) if ((v[k + 1] - v[k]) * v[b] > (v[b + 1] - v[b]) * v[k]) b = k;
      for (let k = 0; k < 5; k++) if (k !== b && (v[k + 1] - v[k]) * v[b] === (v[b + 1] - v[b]) * v[k]) return '';
      return `${FY[b + 1]}年度`;
    },
  };
}

// ---------------------------------------------------------------- 円グラフ(構成比)

const DEPTS = ['食料品', '衣料品', '日用品', '家電', 'その他'];

function makeShares(rng: Rng): number[] | null {
  const w = DEPTS.map(() => rng.int(10, 36));
  const sum = w.reduce((a, b) => a + b, 0);
  const p = w.map((x) => Math.floor((x * 100) / sum));
  p[0] += 100 - p.reduce((a, b) => a + b, 0);
  return p.some((x) => x < 10) ? null : p;
}

const pieChart = (s: number[], T: number, year?: string): ChartData => ({
  kind: 'pie',
  caption: `あるスーパーの部門別売上高の構成比${year ? `(${year})` : ''}`,
  labels: DEPTS,
  series: [{ values: s }],
  note: `売上高合計 ${num(T)}万円`,
});

export function pieAmount(rng: Rng): Draft | null {
  const s = makeShares(rng);
  if (!s) return null;
  const T = rng.int(12, 96) * 100;
  const c = rng.int(0, 4);
  const ans = F(T * s[c], 100);
  const ten = F(T, 10);
  const [n1, n2] = [(c + 1) % 5, (c + 4) % 5];
  return {
    question_ja: `グラフで、${DEPTS[c]}の売上高はいくらか。`,
    charts: [pieChart(s, T)],
    correct: { text: fMan(ans)!, value: ans },
    wrong: [
      numCand(F(T * s[n1], 100), fMan, `${DEPTS[n1]}の構成比を読んだ`),
      numCand(F(T * (100 - s[c]), 100), fMan, `${DEPTS[c]}以外の合計を出した`),
      numCand(F(T * s[n2], 100), fMan, `${DEPTS[n2]}の構成比を読んだ`),
    ],
    fillers: [numCand(ans.add(F(T, 100)), fMan), numCand(ans.sub(F(T, 100)), fMan), numCand(ans.add(F(T, 50)), fMan), numCand(ans.sub(F(T, 50)), fMan)],
    short: `部門の売上高 = 売上高合計 × 構成比。\n{{${num(T)} × ${s[c]} ÷ 100 = ${num(ans)}}}\n答えは ${fMan(ans)}。`,
    steps: [
      `グラフから読む: 売上高合計は ${num(T)}万円、${DEPTS[c]}の構成比は ${s[c]}%`,
      `売上高合計 × 構成比: {{${num(T)} × ${s[c]} ÷ 100 = ${num(ans)}}}`,
      `答えは ${fMan(ans)}`,
    ],
    quick: [
      `10%は ${num(ten)}万円。${s[c]}% はその ${decStr(F(s[c], 10))}個分: {{${num(ten)} × ${decStr(F(s[c], 10))} = ${num(ans)}}}`,
      '隣の項目の構成比を読んだ選択肢が入っている。項目名と%の対応を確かめる。',
    ],
    ko: `원그래프(구성비)는 "합계 × 구성비 = 그 항목의 금액"입니다.\n매출 합계 ${num(T)}만 엔 × ${DEPTS[c]} ${s[c]}% = ${fMan(ans)}.\n빨리 푸는 법: 10%가 ${num(ten)}만 엔이므로 ${s[c]}%는 그 ${decStr(F(s[c], 10))}배입니다.\n함정: 옆 항목의 %를 읽은 값, "${DEPTS[c]} 이외 전부"의 금액이 선택지에 있습니다.`,
    intuition: `円グラフの%は「合計を100としたときの取り分」。合計 ${num(T)}万円 の10%が ${num(ten)}万円 なので、${s[c]}% はその約${decStr(F(s[c], 10))}個分と見当をつける。`,
    cue: '「円グラフで、ある項目の金額」→ 合計 × その項目の構成比',
    fast: [],
    tip: '構成比の問題は、まず10%の値を出すと速い。',
    params: { template: 'pieAmount', c },
    check: () => F((T / 100) * s[c]),
  };
}

export function pieDiff(rng: Rng): Draft | null {
  const s = makeShares(rng);
  if (!s) return null;
  const T = rng.int(12, 96) * 100;
  const i = rng.int(0, 4);
  let j = rng.int(0, 4);
  if (i === j) j = (j + 1) % 5;
  if (s[i] === s[j]) return null;
  const [hi, lo] = s[i] > s[j] ? [i, j] : [j, i];
  const dp = s[hi] - s[lo];
  const ans = F(T * dp, 100);
  const aHi = F(T * s[hi], 100);
  const aLo = F(T * s[lo], 100);
  return {
    question_ja: `グラフで、${DEPTS[hi]}と${DEPTS[lo]}の売上高の差はいくらか。`,
    charts: [pieChart(s, T)],
    correct: { text: fMan(ans)!, value: ans },
    wrong: [numCand(aHi.add(aLo), fMan, '差ではなく合計を出した'), numCand(aHi, fMan, `${DEPTS[hi]}の売上高だけを出した`), numCand(aLo, fMan, `${DEPTS[lo]}の売上高だけを出した`)],
    fillers: [numCand(ans.add(F(T, 100)), fMan), numCand(ans.sub(F(T, 100)), fMan), numCand(ans.add(F(T, 50)), fMan), numCand(ans.sub(F(T, 50)), fMan)],
    short: `構成比の差に、売上高合計を掛ける。\n{{(${s[hi]} − ${s[lo]}) × ${num(T)} ÷ 100 = ${num(ans)}}}\n答えは ${fMan(ans)}。`,
    steps: [
      `${DEPTS[hi]}の売上高: {{${num(T)} × ${s[hi]} ÷ 100 = ${num(aHi)}}}万円`,
      `${DEPTS[lo]}の売上高: {{${num(T)} × ${s[lo]} ÷ 100 = ${num(aLo)}}}万円`,
      `差: {{${num(aHi)} − ${num(aLo)} = ${num(ans)}}}万円`,
    ],
    quick: ['同じ合計に対する構成比どうしは、そのまま足したり引いたりできる。金額を2回出す必要はない。', '「差」を問われているのに、片方の金額や合計を答えてしまう選択肢が入っている。'],
    ko: `같은 합계에 대한 구성비끼리는 그대로 빼도 됩니다. 금액을 두 번 구할 필요가 없습니다.\n구성비 차이: ${s[hi]} − ${s[lo]} = ${dp}% → ${num(T)} × ${dp} ÷ 100 = ${fMan(ans)}.\n(정석: ${DEPTS[hi]} ${num(aHi)}만 엔 − ${DEPTS[lo]} ${num(aLo)}만 엔 = ${num(ans)}만 엔)\n함정: 차이가 아니라 합계(${num(aHi.add(aLo))}만 엔)나 한쪽 금액만 구한 값이 선택지에 있습니다.`,
    intuition: `2つの項目は同じ合計(${num(T)}万円)に対する割合なので、金額を別々に出さなくても、構成比の差 ${dp}% に合計を掛ければ差額になる。`,
    cue: '「同じ円グラフの2項目の差」→ 構成比を先に引いてから、合計を掛ける',
    fast: [`構成比の差を先に取る: {{${s[hi]} − ${s[lo]} = ${dp}}}%`, `{{${num(T)} × ${dp} ÷ 100 = ${num(ans)}}} → ${fMan(ans)}`],
    fastCheck: () => F(T, 100).mul(dp),
    tip: '同じ合計に対する%どうしは、先に足し引きしてよい。',
    params: { template: 'pieDiff', hi, lo },
    check: () => F((T / 100) * s[hi] - (T / 100) * s[lo]),
  };
}

export function pie2Change(rng: Rng): Draft | null {
  const s1 = makeShares(rng);
  const s2 = makeShares(rng);
  if (!s1 || !s2) return null;
  const T1 = rng.int(12, 80) * 100;
  const T2 = T1 + rng.int(-10, 25) * 100;
  if (T2 < 1000 || T2 === T1) return null;
  const c = rng.int(0, 4);
  const a1 = F(T1 * s1[c], 100);
  const a2 = F(T2 * s2[c], 100);
  if (!a2.gt(a1)) return null;
  const ans = a2.sub(a1);
  const dShare = s2[c] - s1[c];
  return {
    question_ja: `2つのグラフで、${DEPTS[c]}の売上高は、2023年から2024年にかけていくら増えたか。`,
    charts: [pieChart(s1, T1, '2023年'), pieChart(s2, T2, '2024年')],
    correct: { text: fMan(ans)!, value: ans },
    wrong: [
      numCand(F(T2 * dShare, 100), fMan, '構成比の差に2024年の合計を掛けた'),
      numCand(F(T1 * dShare, 100), fMan, '構成比の差に2023年の合計を掛けた'),
      numCand(F((T2 - T1) * s2[c], 100), fMan, '合計の増加額に2024年の構成比を掛けた'),
      numCand(F((T2 - T1) * s1[c], 100), fMan, '合計の増加額に2023年の構成比を掛けた'),
    ],
    fillers: [numCand(ans.add(F(T2, 100)), fMan), numCand(ans.sub(F(T2, 100)), fMan), numCand(ans.add(F(T2, 50)), fMan), numCand(ans.sub(F(T2, 50)), fMan)],
    short: `年ごとに「合計 × 構成比」で売上高を出してから引く。\n2023年: {{${num(T1)} × ${s1[c]} ÷ 100 = ${num(a1)}}}、2024年: {{${num(T2)} × ${s2[c]} ÷ 100 = ${num(a2)}}}\n{{${num(a2)} − ${num(a1)} = ${num(ans)}}}\n答えは ${fMan(ans)}。`,
    steps: [
      `2023年の${DEPTS[c]}: {{${num(T1)} × ${s1[c]} ÷ 100 = ${num(a1)}}}万円`,
      `2024年の${DEPTS[c]}: {{${num(T2)} × ${s2[c]} ÷ 100 = ${num(a2)}}}万円`,
      `増えた額: {{${num(a2)} − ${num(a1)} = ${num(ans)}}}万円`,
    ],
    quick: [
      `構成比は ${s1[c]}% → ${s2[c]}% だが、合計も ${num(T1)}万円 → ${num(T2)}万円 に変わっている。年が違う構成比どうしを引いても、金額の差にはならない。`,
      'それぞれの年の10%の値(合計 ÷ 10)を先に出しておくと、2回の掛け算が速くなる。',
    ],
    ko: `연도가 다르면 합계가 다르므로, 구성비(%)끼리 빼면 안 됩니다. 연도별로 "합계 × 구성비"로 금액을 구한 뒤에 뺍니다.\n2023년: ${num(T1)} × ${s1[c]}% = ${num(a1)}만 엔\n2024년: ${num(T2)} × ${s2[c]}% = ${num(a2)}만 엔\n증가액: ${num(a2)} − ${num(a1)} = ${fMan(ans)}.\n함정: "구성비 차이(${dShare}%p) × 합계"나 "합계 증가액 × 구성비"로 계산한 값이 선택지에 있습니다.${dShare < 0 ? ' 이 문제는 구성비는 줄었는데 금액은 늘어난 경우입니다.' : ''}`,
    intuition: `円グラフが2つあるときは、それぞれの「100%」にあたる合計が違う。${DEPTS[c]}の構成比は ${s1[c]}% から ${s2[c]}% に変わったが、比べるのは%ではなく金額。年ごとに金額に直してから引く。`,
    cue: '「2つの円グラフで、ある項目がいくら増えたか」→ 年ごとに 合計 × 構成比 を出してから引く(構成比どうしを引かない)',
    fast: [],
    tip: '合計が違うグラフの%どうしは、直接比べられない。必ず金額に直す。',
    params: { template: 'pie2Change', c },
    check: () => F((T2 / 100) * s2[c] - (T1 / 100) * s1[c]),
  };
}

// ---------------------------------------------------------------- 折れ線グラフ(輸出額と輸入額)

const YRS = ['2020年', '2021年', '2022年', '2023年', '2024年'];

function makeTrade(rng: Rng): { E: number[]; I: number[] } {
  const E = [rng.int(30, 90) * 10];
  const I = [Math.max(150, E[0] + rng.int(-12, 6) * 10)];
  for (let k = 1; k < 5; k++) {
    E.push(Math.max(150, E[k - 1] + rng.int(-6, 10) * 10));
    I.push(Math.max(150, I[k - 1] + rng.int(-6, 10) * 10));
  }
  return { E, I };
}

const lineChart = (t: { E: number[]; I: number[] }): ChartData => ({
  kind: 'line',
  caption: 'ある国の輸出額と輸入額の推移(単位: 億円)',
  labels: YRS,
  series: [
    { name: '輸出額', values: t.E },
    { name: '輸入額', values: t.I },
  ],
});

export function lineMaxGap(rng: Rng): Draft | null {
  const t = makeTrade(rng);
  const ks = [0, 1, 2, 3, 4];
  const gap = ks.map((k) => t.E[k] - t.I[k]);
  const mx = Math.max(...gap);
  if (mx <= 0 || gap.filter((g) => g === mx).length !== 1) return null;
  const best = gap.indexOf(mx);
  const kE = t.E.indexOf(Math.max(...t.E));
  const kI = t.I.indexOf(Math.min(...t.I));
  const others: Cand[] = [kE, kI, ...ks].filter((k) => k !== best).map((k) => ({ text: YRS[k], why: k === kE ? '輸出額が最大の年' : k === kI ? '輸入額が最小の年' : '' }));
  return {
    question_ja: 'グラフで、輸出額が輸入額を最も大きく上回った年はどれか。',
    charts: [lineChart(t)],
    correct: { text: YRS[best] },
    wrong: others,
    short: `各年の「輸出額 − 輸入額」を比べる。\n${YRS[best]}: {{${num(t.E[best])} − ${num(t.I[best])} = ${num(mx)}}} が最大。\n答えは ${YRS[best]}。`,
    steps: [...ks.map((k) => (gap[k] > 0 ? `${YRS[k]}: {{${num(t.E[k])} − ${num(t.I[k])} = ${num(gap[k])}}}` : `${YRS[k]}: 輸出額は輸入額を上回っていない`)), `最大は ${YRS[best]}(${num(mx)}億円)`],
    quick: [
      '2本の線の間がいちばん開いている年を目で探し、その年と次に開いている年だけ引き算する。',
      `輸出額が最大の年(${YRS[kE]})や、輸入額が最小の年(${YRS[kI]})が答えとは限らない。差を見る。`,
    ],
    ko: `연도별로 "수출액 − 수입액"을 비교합니다.\n${YRS[best]}: ${num(t.E[best])} − ${num(t.I[best])} = ${num(mx)}억 엔으로 최대입니다.\n요령: 두 선 사이가 가장 벌어진 연도를 눈으로 찾고, 후보 두 개만 뺄셈하세요.\n함정: "수출액이 가장 큰 해(${YRS[kE]})"나 "수입액이 가장 작은 해(${YRS[kI]})"가 답이라고 단정하면 안 됩니다. 물어보는 것은 차이입니다.`,
    intuition: `問われているのは2本の折れ線の「差」。輸出額(実線)が輸入額(点線)より上にあって、間がいちばん開いている年を探す。目で候補を2つにしぼってから引き算する。`,
    cue: '「AがBを最も大きく上回った年」→ 各年の A − B を比べる(Aが最大の年とは限らない)',
    fast: [],
    tip: '折れ線が2本あるときは、どちらの線の数値かを凡例で確かめる。',
    params: { template: 'lineMaxGap' },
    check: () => {
      let b = -1;
      let tie = false;
      for (let k = 4; k >= 0; k--) {
        const g = t.E[k] - t.I[k];
        if (b < 0 || g > t.E[b] - t.I[b]) {
          b = k;
          tie = false;
        } else if (g === t.E[b] - t.I[b]) tie = true;
      }
      return tie ? '' : YRS[b];
    },
  };
}

export function lineRatio(rng: Rng): Draft | null {
  const t = makeTrade(rng);
  const y = rng.int(0, 4);
  const [e, i] = [t.E[y], t.I[y]];
  if (e === i) return null;
  const exact = F(i * 100, e);
  const ans = exact.round(0);
  const y2 = (y + 1) % 5;
  return {
    question_ja: `グラフで、${YRS[y]}の輸入額は、同じ年の輸出額の約何%にあたるか(小数点以下を四捨五入)。`,
    charts: [lineChart(t)],
    correct: { text: pctR(ans), value: ans },
    wrong: [
      numCand(F(e * 100, i).round(0), fPct, '割る順番が逆(輸出額 ÷ 輸入額)'),
      numCand(F(Math.abs(e - i) * 100, e).round(0), fPct, '差が輸出額の何%かを出した'),
      numCand(F(t.I[y2] * 100, t.E[y2]).round(0), fPct, `${YRS[y2]}の値を読んだ`),
    ],
    fillers: [numCand(ans.add(2), fPct), numCand(ans.sub(2), fPct), numCand(ans.add(4), fPct), numCand(ans.sub(4), fPct)],
    short: `「AはBの何%か」は A ÷ B × 100。\n{{${num(i)} ÷ ${num(e)} × 100 ≒ ${decStr(exact.round(2))}}} → 四捨五入して ${pctR(ans)}。\n答えは ${pctR(ans)}。`,
    steps: [
      `グラフから読む: ${YRS[y]}の輸入額は ${num(i)}億円、輸出額は ${num(e)}億円`,
      `輸入額 ÷ 輸出額 × 100: {{${num(i)} ÷ ${num(e)} × 100 ≒ ${decStr(exact.round(2))}}}`,
      `小数点以下を四捨五入して ${pctR(ans)}`,
    ],
    quick: [
      i > e ? '輸入額のほうが大きいので、答えは100%を超える。100%未満の選択肢は消せる。' : '輸入額のほうが小さいので、答えは100%未満。100%を超える選択肢は消せる。',
      `輸出額の10%は ${decStr(F(e, 10))}億円。輸入額 ${num(i)}億円 がその何個分かで見当をつける。`,
    ],
    ko: `"A는 B의 몇 %"는 A ÷ B × 100입니다. "〜の"가 붙는 쪽(수출액)이 기준입니다.\n${YRS[y]}: 수입액 ${num(i)} ÷ 수출액 ${num(e)} × 100 ≒ ${decStr(exact.round(2))} → ${pctR(ans)}.\n먼저 지울 수 있는 선택지: 수입액이 수출액보다 ${i > e ? '크므로 100%를 넘습니다' : '작으므로 100% 미만입니다'}.\n함정: 나누는 순서를 반대로 한 값, 두 값의 차이가 몇 %인지 구한 값이 선택지에 있습니다.`,
    intuition: `「輸入額は輸出額の何%か」は、輸出額を100としたときの輸入額の大きさ。${i > e ? '輸入額のほうが大きいので、答えは100%より大きい' : '輸入額のほうが小さいので、答えは100%より小さい'}。これだけで選択肢の半分ほどが消える。`,
    cue: '「AはBの約何%にあたるか」→ A ÷ B × 100(先に100%より大きいか小さいかを判断する)',
    fast: [],
    tip: '割合は、まず「100%より大きいか小さいか」を決めてから計算する。',
    params: { template: 'lineRatio', y },
    check: () => F(Math.floor((i * 200 + e) / (2 * e))),
  };
}

// ---------------------------------------------------------------- 表(人口と面積 → 人口密度)

const CITIES = ['A市', 'B市', 'C市', 'D市', 'E市'];

export function densityMax(rng: Rng, diff: Difficulty): Draft | null {
  const pop = CITIES.map(() => rng.int(8, 96)); // 万人
  const area = CITIES.map(() => rng.int(4, 60) * 10); // km²
  const ks = [0, 1, 2, 3, 4];
  let best = 0;
  for (const k of ks) if (pop[k] * area[best] > pop[best] * area[k]) best = k;
  if (ks.some((k) => k !== best && pop[k] * area[best] === pop[best] * area[k])) return null;
  const kPop = pop.indexOf(Math.max(...pop));
  const kArea = area.indexOf(Math.min(...area));
  // 人口が最大で面積も最小の市が答え、という見ただけでわかる問題は出さない。難しい問題では両方とも別の市にする
  if (kPop === best && kArea === best) return null;
  if (diff === 3 && (kPop === best || kArea === best)) return null;
  const dens = ks.map((k) => F(pop[k] * 10000, area[k]));
  const others: Cand[] = [kPop, kArea, ...ks].filter((k) => k !== best).map((k) => ({ text: CITIES[k], why: k === kPop ? '人口が最も多い市' : k === kArea ? '面積が最も小さい市' : '' }));
  const table: TableData = { caption: '5つの市の人口と面積', headers: ['市', '人口(万人)', '面積(km²)'], rows: ks.map((k) => [CITIES[k], num(pop[k]), num(area[k])]) };
  const line = (k: number) => `{{${pop[k]} × 10,000 ÷ ${num(area[k])} ≒ ${num(dens[k].round(0))}}}`;
  return {
    question_ja: '表で、人口密度(面積1km²あたりの人口)が最も高い市はどれか。',
    table,
    correct: { text: CITIES[best] },
    wrong: others,
    short: `人口密度 = 人口 ÷ 面積。\n${CITIES[best]}: ${line(best)}人が最大。\n答えは ${CITIES[best]}。`,
    steps: [...ks.map((k) => `${CITIES[k]}: ${line(k)}人`), `最も高いのは ${CITIES[best]}`],
    quick: [
      '順位だけを比べるので、「人口(万人) ÷ 面積」のままでよい。10,000を掛ける必要はない。',
      `人口が最も多い ${CITIES[kPop]} や、面積が最も小さい ${CITIES[kArea]} が答えとは限らない。割り算の結果で比べる。`,
    ],
    ko: `인구밀도 = 인구 ÷ 면적입니다.\n${CITIES[best]}: ${pop[best]}만 명 ÷ ${num(area[best])}km² ≒ ${num(dens[best].round(0))}명/km²로 가장 높습니다.\n요령: 순위만 비교하면 되므로 "인구(만 명) ÷ 면적" 그대로 비교해도 됩니다. 인구가 많고 면적이 작은 시부터 후보로 삼으세요.\n함정: 인구가 가장 많은 ${CITIES[kPop]}나 면적이 가장 작은 ${CITIES[kArea]}를 바로 고르면 안 됩니다.`,
    intuition: `人口密度は「人口 ÷ 面積」なので、人口が多く、面積が小さい市ほど高い。人口だけ、面積だけでは決まらない。候補を2〜3市にしぼって、割り算の結果を比べる。`,
    cue: '「人口密度が最も高い」→ 各市の 人口 ÷ 面積 を比べる(人口が最大・面積が最小の市とは限らない)',
    fast: [],
    tip: '「1あたりの量」は割り算。割られる数(人口)が大きく、割る数(面積)が小さいほど大きくなる。',
    params: { template: 'densityMax' },
    check: () => {
      let b = 4;
      for (let k = 3; k >= 0; k--) if (pop[k] * area[b] > pop[b] * area[k]) b = k;
      for (let k = 0; k < 5; k++) if (k !== b && pop[k] * area[b] === pop[b] * area[k]) return '';
      return CITIES[b];
    },
  };
}

// ---------------------------------------------------------------- 表(指数)

const PRODS = ['製品P', '製品Q', '製品R', '製品S'];
const IY = ['2022年', '2024年'];

function makeIndex(rng: Rng): { base: number[]; idx: number[][] } {
  const base = PRODS.map(() => rng.int(8, 60) * 100);
  const idx = PRODS.map(() => {
    const a = rng.int(88, 125);
    return [a, Math.max(60, a + rng.int(-12, 26))];
  });
  return { base, idx };
}

const indexTable = (d: { base: number[]; idx: number[][] }): TableData => ({
  caption: '製品別の生産台数(2020年)と生産指数',
  headers: ['製品', '2020年(台)', ...IY],
  rows: PRODS.map((n, k) => [n, num(d.base[k]), ...d.idx[k].map(String)]),
  note: '「2020年(台)」は2020年の生産台数。2022年と2024年の数値は、2020年の生産台数を100とした生産指数。',
  dense: true,
});

export function indexAmount(rng: Rng): Draft | null {
  const d = makeIndex(rng);
  const c = rng.int(0, 3);
  const y = rng.int(0, 1);
  const base = d.base[c];
  const ix = d.idx[c][y];
  if (ix === 100) return null;
  const ans = F(base * ix, 100);
  const y2 = 1 - y;
  const one = F(base, 100);
  return {
    question_ja: `表で、${PRODS[c]}の${IY[y]}の生産台数は何台か。`,
    table: indexTable(d),
    correct: { text: fDai(ans)!, value: ans },
    wrong: [
      numCand(F(base * d.idx[c][y2], 100), fDai, `${IY[y2]}の指数を読んだ`),
      numCand(F(base * Math.abs(ix - 100), 100), fDai, '2020年から増減した分だけを出した'),
      numCand(F(d.base[(c + 1) % 4] * ix, 100), fDai, `${PRODS[(c + 1) % 4]}の生産台数を使った`),
    ],
    fillers: [numCand(ans.add(one), fDai), numCand(ans.sub(one), fDai), numCand(ans.add(one.mul(2)), fDai), numCand(ans.sub(one.mul(2)), fDai)],
    short: `生産台数 = 2020年の生産台数 × 指数 ÷ 100。\n{{${num(base)} × ${ix} ÷ 100 = ${num(ans)}}}\n答えは ${fDai(ans)}。`,
    steps: [
      `表から読む: ${PRODS[c]}の2020年の生産台数は ${num(base)}台、${IY[y]}の指数は ${ix}`,
      `指数 ${ix} は「2020年の ${ix}%」という意味: {{${num(base)} × ${ix} ÷ 100 = ${num(ans)}}}`,
      `答えは ${fDai(ans)}`,
    ],
    quick: [
      `指数1あたりの台数を先に出す: {{${num(base)} ÷ 100 = ${num(one)}}}台。これに指数を掛ける: {{${num(one)} × ${ix} = ${num(ans)}}}`,
      ix > 100 ? '指数が100より大きいので、答えは2020年の台数より多い。少ない選択肢は消せる。' : '指数が100より小さいので、答えは2020年の台数より少ない。多い選択肢は消せる。',
    ],
    ko: `지수는 "2020년을 100으로 봤을 때의 크기"입니다. 지수 ${ix} = 2020년의 ${ix}%.\n생산 대수 = 2020년 대수 × 지수 ÷ 100 = ${num(base)} × ${ix} ÷ 100 = ${fDai(ans)}.\n빨리 푸는 법: 지수 1당 ${num(one)}대이므로 ${num(one)} × ${ix}.\n먼저 지울 수 있는 선택지: 지수가 100보다 ${ix > 100 ? '크므로 2020년(' + num(base) + '대)보다 많아야 합니다' : '작으므로 2020년(' + num(base) + '대)보다 적어야 합니다'}.\n함정: 다른 해의 지수를 읽은 값, 늘거나 줄어든 분량(지수 − 100)만 계산한 값이 선택지에 있습니다.`,
    intuition: `指数は「基準の年を100としたときの大きさ」。指数 ${ix} なら、2020年の ${num(base)}台 の ${ix}% にあたる。${ix > 100 ? '100より大きいので、2020年より増えている' : '100より小さいので、2020年より減っている'}。`,
    cue: '「指数から実際の数量」→ 基準の年の数量 × 指数 ÷ 100',
    fast: [],
    tip: '指数は%と同じ。基準の年の数量の1%(÷100)を先に出すと速い。',
    params: { template: 'indexAmount', c, y },
    check: () => F((base / 100) * ix),
  };
}

export function indexGrowth(rng: Rng): Draft | null {
  const d = makeIndex(rng);
  const c = rng.int(0, 3);
  const [i1, i2] = [d.idx[c][0], d.idx[c][1]];
  if (i2 <= i1) return null;
  const exact = F((i2 - i1) * 100, i1);
  const ans = exact.round(0);
  // 「指数の差をそのまま%にした」誤答が、正解と同じ値にならないようにする
  if (ans.eq(i2 - i1)) return null;
  return {
    question_ja: `表で、${PRODS[c]}の2024年の生産台数は、2022年に比べて約何%増えたか(小数点以下を四捨五入)。`,
    table: indexTable(d),
    correct: { text: pctR(ans), value: ans },
    wrong: [
      numCand(F(i2 - i1), fPct, '指数の差(ポイント)をそのまま%にした'),
      numCand(F((i2 - i1) * 100, i2).round(0), fPct, '2024年の指数を基準に割った'),
      i2 > 100 ? numCand(F(i2 - 100), fPct, '2020年と比べた増加率を答えた') : null,
    ],
    fillers: [numCand(ans.add(2), fPct), numCand(ans.sub(2), fPct), numCand(ans.add(4), fPct), numCand(ans.add(6), fPct)],
    short: `同じ製品なら、指数どうしで増加率を計算できる。\n{{(${i2} − ${i1}) ÷ ${i1} × 100 ≒ ${decStr(exact.round(2))}}} → 四捨五入して ${pctR(ans)}。\n答えは ${pctR(ans)}。`,
    steps: [
      `表から読む: ${PRODS[c]}の指数は、2022年が ${i1}、2024年が ${i2}`,
      `増加率 = (2024年 − 2022年) ÷ 2022年 × 100: {{(${i2} − ${i1}) ÷ ${i1} × 100 ≒ ${decStr(exact.round(2))}}}`,
      `小数点以下を四捨五入して ${pctR(ans)}`,
    ],
    quick: [
      `指数の差 {{${i2} − ${i1} = ${i2 - i1}}} は「ポイント」であって、増加率(%)ではない。基準になる2022年の指数 ${i1} で割る。`,
      '同じ製品どうしの比較なので、2020年の生産台数を掛ける必要はない(掛けても、割り算で消える)。',
    ],
    ko: `같은 제품끼리라면 지수만으로 증가율을 구할 수 있습니다(2020년 대수를 곱할 필요가 없습니다).\n증가율 = (2024년 지수 − 2022년 지수) ÷ 2022년 지수 × 100 = (${i2} − ${i1}) ÷ ${i1} × 100 ≒ ${decStr(exact.round(2))} → ${pctR(ans)}.\n가장 흔한 함정: 지수의 차이(${i2 - i1})를 그대로 ${i2 - i1}%라고 답하는 것입니다. 지수의 차이는 "포인트"이고, 증가율은 기준(2022년 지수 ${i1})으로 나눠야 합니다.`,
    intuition: `指数は2020年を基準にした数なので、2022年と2024年を比べるときは、基準を2022年に取り直す必要がある。差の ${i2 - i1} ポイントを、2022年の指数 ${i1} で割る。${i1 > 100 ? '2022年の指数が100より大きいので、増加率は差のポイントより小さくなる。' : i1 < 100 ? '2022年の指数が100より小さいので、増加率は差のポイントより大きくなる。' : ''}`,
    cue: '「指数どうしで、何%増えたか」→ (あと − 前) ÷ 前 × 100(指数の差をそのまま%にしない)',
    fast: [],
    tip: '指数の差は「ポイント」。増加率は、比べる元の指数で割って出す。',
    params: { template: 'indexGrowth', c },
    check: () => F(Math.floor(((i2 - i1) * 200 + i1) / (2 * i1))),
  };
}
