import { F } from '../core/frac';
import { num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, tryF, type Draft } from './framework';
import { d, fYen, wari } from './fmt';

// SPI 非言語「損益算」。割(1割=0.1)を使う

function listPrice(rng: Rng): Draft | null {
  const C = 100 * rng.int(2, 50);
  const a = rng.int(1, 6);
  const P = F(C).mul(F(1).add(wari(a)));
  const g = F(C).mul(wari(a));
  return {
    question_ja: `原価${num(C)}円の商品に、原価の${a}割の利益を見込んで定価をつけた。定価はいくらか。`,
    correct: { text: `${num(P)}円`, value: P },
    wrong: [
      numCand(g, fYen, '利益だけを出した'),
      numCand(F(C).mul(F(100 + a, 100)), fYen, '割を%と取り違えた'),
      numCand(F(C).mul(F(1).sub(wari(a))), fYen, '利益を引いてしまった'),
    ],
    fillers: [numCand(P.add(100), fYen), numCand(P.sub(100), fYen)],
    short: `定価 = 原価 × (1 + 利益の割合)。${a}割 = ${d(wari(a))}。\n{{${num(C)} × (1 + ${d(wari(a))}) = ${num(P)}}}\n答えは ${num(P)}円。`,
    steps: [
      `「${a}割」は小数で ${d(wari(a))}(1割 = 0.1)。`,
      `利益 = {{${num(C)} × ${d(wari(a))} = ${num(g)}}}円`,
      `定価 = 原価 + 利益 = {{${num(C)} + ${num(g)} = ${num(P)}}}円`,
    ],
    quick: [
      `原価の1割は1桁ずらすだけ: {{${num(C)} ÷ 10 = ${num(F(C, 10))}}}円`,
      `${a}割の利益は {{${num(F(C, 10))} × ${a} = ${num(g)}}}円。足して ${num(P)}円。`,
      `まとめて {{${num(C)} × ${d(F(1).add(wari(a)))} = ${num(P)}}} と1回で掛けてもよい。`,
    ],
    ko: `정가 = 원가 × (1 + ${d(wari(a))}). ${num(C)} × ${d(F(1).add(wari(a)))} = ${num(P)}엔. "割(와리)"는 1할 = 10% = 0.1입니다. %(0.01)와 혼동하지 마세요.`,
    tip: '割は0.1、分は0.01。「3割」は0.3、「3%」は0.03。',
    params: { template: 'listPrice', C, a },
    check: () => F(C).add(F(C * a, 10)),
  };
}

function discountPrice(rng: Rng): Draft | null {
  const P = 100 * rng.int(3, 80);
  const b = rng.int(1, 5);
  const S = F(P).mul(F(1).sub(wari(b)));
  const cut = F(P).mul(wari(b));
  return {
    question_ja: `定価${num(P)}円の商品を、定価の${b}割引で売った。売値はいくらか。`,
    correct: { text: `${num(S)}円`, value: S },
    wrong: [
      numCand(cut, fYen, '値引き額を出した'),
      numCand(F(P).mul(F(1).add(wari(b))), fYen, '割増しにした'),
      numCand(F(P).mul(F(100 - b, 100)), fYen, '割を%と取り違えた'),
    ],
    fillers: [numCand(S.add(100), fYen), numCand(S.sub(100), fYen)],
    short: `${b}割引 = 定価の ${d(F(1).sub(wari(b)))} 倍で売るということ。\n{{${num(P)} × ${d(F(1).sub(wari(b)))} = ${num(S)}}}\n答えは ${num(S)}円。`,
    steps: [
      `値引き額: {{${num(P)} × ${d(wari(b))} = ${num(cut)}}}円`,
      `売値 = 定価 − 値引き額 = {{${num(P)} − ${num(cut)} = ${num(S)}}}円`,
    ],
    quick: [
      `「${b}割引」は「${10 - b}割で売る」と言い換えると1回の掛け算で済む。`,
      `定価の1割 {{${num(P)} ÷ 10 = ${num(F(P, 10))}}}円 × ${10 - b} = {{${num(F(P, 10))} × ${10 - b} = ${num(S)}}}円`,
    ],
    ko: `${b}할 할인 = 정가의 ${d(F(1).sub(wari(b)))}배. ${num(P)} × ${d(F(1).sub(wari(b)))} = ${num(S)}엔. 할인액(${num(cut)}엔)을 답으로 고르지 않도록 주의하세요.`,
    tip: '「b割引」=「(10−b)割で売る」。',
    params: { template: 'discountPrice', P, b },
    check: () => F(P).sub(F(P * b, 10)),
  };
}

function profitAfterDiscount(rng: Rng): Draft | null {
  const C = 100 * rng.int(5, 60);
  const a = rng.int(2, 6);
  const b = rng.int(1, 3);
  const P = F(C).mul(F(1).add(wari(a)));
  const S = P.mul(F(1).sub(wari(b)));
  const G = S.sub(C);
  if (!G.isPos() || !G.isInt() || !S.isInt()) return null;
  const k = F(1).add(wari(a)).mul(F(1).sub(wari(b)));
  return {
    question_ja: `原価${num(C)}円の商品に原価の${a}割増しの定価をつけたが、売れなかったので定価の${b}割引で売った。利益はいくらか。`,
    correct: { text: `${num(G)}円`, value: G },
    wrong: [
      numCand(F(C).mul(wari(a - b)), fYen, '割をそのまま引いた'),
      numCand(P.mul(wari(b)), fYen, '値引き額を出した'),
      numCand(F(C).mul(wari(a)), fYen, '定価で売ったときの利益'),
      numCand(S, fYen, '売値を出した'),
    ],
    fillers: [numCand(G.add(10), fYen), numCand(G.add(100), fYen)],
    short: `定価 {{${num(C)} × ${d(F(1).add(wari(a)))} = ${num(P)}}}円、売値 {{${num(P)} × ${d(F(1).sub(wari(b)))} = ${num(S)}}}円。\n利益 = 売値 − 原価 = ${num(G)}円。答えは ${num(G)}円。`,
    steps: [
      `定価: {{${num(C)} × (1 + ${d(wari(a))}) = ${num(P)}}}円`,
      `売値: {{${num(P)} × (1 − ${d(wari(b))}) = ${num(S)}}}円 (割引の基準は原価ではなく定価)`,
      `利益: {{${num(S)} − ${num(C)} = ${num(G)}}}円`,
    ],
    quick: [
      `原価を1とすると、売値は {{${d(F(1).add(wari(a)))} × ${d(F(1).sub(wari(b)))} = ${d(k)}}}。`,
      `利益は原価の ${d(k.sub(1))} 倍: {{${num(C)} × ${d(k.sub(1))} = ${num(G)}}}円`,
      `「${a}割 − ${b}割 = ${a - b}割の利益」とするのは誤り。割引は定価を基準にするので、掛け算でつなぐ。`,
    ],
    ko: `정가 ${num(C)} × ${d(F(1).add(wari(a)))} = ${num(P)}엔, 판매가 ${num(P)} × ${d(F(1).sub(wari(b)))} = ${num(S)}엔, 이익 = ${num(S)} − ${num(C)} = ${num(G)}엔. 할인은 원가가 아니라 정가 기준이므로 ${a}할 − ${b}할로 빼면 안 됩니다.`,
    tip: '原価を1と置き、倍率を掛け算でつなぐ(1.3 × 0.8 = 1.04 なら利益は4%)。',
    params: { template: 'profitAfterDiscount', C, a, b },
    check: () => F(C * (10 + a) * (10 - b), 100).sub(C),
  };
}

function costFromProfit(rng: Rng): Draft | null {
  const C = 100 * rng.int(5, 60);
  const a = rng.int(2, 6);
  const b = rng.int(1, 3);
  const k = F(1).add(wari(a)).mul(F(1).sub(wari(b)));
  const r = k.sub(1);
  if (!r.isPos()) return null;
  const G = F(C).mul(r);
  if (!G.isInt()) return null;
  return {
    question_ja: `ある商品に原価の${a}割増しの定価をつけ、定価の${b}割引で売ったところ、${num(G)}円の利益が出た。この商品の原価はいくらか。`,
    correct: { text: `${num(C)}円`, value: F(C) },
    wrong: [
      numCand(tryF(() => G.div(wari(a - b))), fYen, '割の差で割った'),
      numCand(F(C).mul(F(1).add(wari(a))), fYen, '定価を出した'),
      numCand(tryF(() => G.div(wari(a))), fYen, '値引きを考えなかった'),
      numCand(F(C).mul(k), fYen, '売値を出した'),
    ],
    fillers: [numCand(F(C + 100), fYen), numCand(F(C - 100), fYen)],
    short: `原価を1とすると売値は {{${d(F(1).add(wari(a)))} × ${d(F(1).sub(wari(b)))} = ${d(k)}}}、利益は原価の ${d(r)}。\n{{${num(G)} ÷ ${d(r)} = ${num(C)}}}\n答えは ${num(C)}円。`,
    steps: [
      `原価を1とする。定価は ${d(F(1).add(wari(a)))}、売値は {{${d(F(1).add(wari(a)))} × ${d(F(1).sub(wari(b)))} = ${d(k)}}}`,
      `利益の割合: {{${d(k)} − 1 = ${d(r)}}} (原価の${d(r)}倍が利益)`,
      `原価 × ${d(r)} = ${num(G)} なので 原価 = {{${num(G)} ÷ ${d(r)} = ${num(C)}}}円`,
    ],
    quick: [
      `選択肢から逆算する: 答えの候補 × ${d(r)} が ${num(G)} になるものを探す。`,
      `{{${num(C)} × ${d(r)} = ${num(G)}}} で一致する。`,
      `「利益 ÷ (${a}割 − ${b}割)」は割引の基準(定価)を無視した誤り。`,
    ],
    ko: `원가를 1로 두면 판매가 = ${d(F(1).add(wari(a)))} × ${d(F(1).sub(wari(b)))} = ${d(k)}, 이익 = 원가의 ${d(r)}배. 따라서 원가 = ${num(G)} ÷ ${d(r)} = ${num(C)}엔. 선택지에 ${d(r)}를 곱해 ${num(G)}이 되는지 확인하면 빠릅니다.`,
    tip: '原価が分からないときは原価を1と置き、利益の倍率を出してから割る。',
    params: { template: 'costFromProfit', C, a, b },
    check: () => G.mul(100).div((10 + a) * (10 - b) - 100),
  };
}

function lossAndGain(rng: Rng): Draft | null {
  const T = 100 * rng.int(8, 60);
  const b = rng.int(1, 4);
  const D = F(T).mul(wari(b)); // 定価と割引後の差
  if (!D.isInt()) return null;
  const G = 10 * rng.int(1, Math.floor(D.n / 10) - 1);
  const L = D.sub(G);
  if (!L.isPos()) return null;
  const C = F(T - G);
  const S = F(T).mul(F(1).sub(wari(b)));
  return {
    question_ja: `ある商品を定価で売ると${num(G)}円の利益、定価の${b}割引で売ると${num(L)}円の損失になる。この商品の原価はいくらか。`,
    correct: { text: `${num(C)}円`, value: C },
    wrong: [
      numCand(F(T), fYen, '定価を出した'),
      numCand(S, fYen, '割引後の売値を出した'),
      numCand(F(T).sub(L), fYen, '利益と損失を取り違えた'),
      numCand(C.add(L), fYen, '損失を足した'),
    ],
    fillers: [numCand(C.add(100), fYen), numCand(C.sub(100), fYen)],
    short: `定価と割引後の売値の差 = 利益 + 損失 = ${num(D)}円。これが定価の${b}割。\n定価 {{${num(D)} ÷ ${d(wari(b))} = ${num(T)}}}円、原価 {{${num(T)} − ${num(G)} = ${num(C)}}}円。\n答えは ${num(C)}円。`,
    steps: [
      `定価で売ると原価より${num(G)}円高く、割引後は原価より${num(L)}円安い。`,
      `よって 定価 − 割引後の売値 = {{${num(G)} + ${num(L)} = ${num(D)}}}円`,
      `この差は定価の${b}割(値引き額)なので、定価 = {{${num(D)} ÷ ${d(wari(b))} = ${num(T)}}}円`,
      `原価 = 定価 − 利益 = {{${num(T)} − ${num(G)} = ${num(C)}}}円`,
    ],
    quick: [
      '数直線で「原価」を真ん中に置き、上に利益、下に損失を描くと、差が値引き額だと一目で分かる。',
      `検算: 割引後の売値 {{${num(T)} × ${d(F(1).sub(wari(b)))} = ${num(S)}}}円、{{${num(C)} − ${num(S)} = ${num(L)}}}円の損失で一致。`,
    ],
    ko: `정가로 팔 때와 할인해서 팔 때의 차이 = 이익 + 손실 = ${num(D)}엔 = 정가의 ${b}할. 정가 = ${num(D)} ÷ ${d(wari(b))} = ${num(T)}엔, 원가 = ${num(T)} − ${num(G)} = ${num(C)}엔.`,
    tip: '「利益」と「損失」の両方が出たら、その合計が売値の差になる。',
    params: { template: 'lossAndGain', T, b, G },
    check: () => {
      // 原価 x として x + G = 定価、定価×(1−b割) = x − L を解く
      // (x + G)(10 − b)/10 = x − L → x(10 − b) + G(10 − b) = 10x − 10L → x·b = G(10 − b) + 10L
      return F(G * (10 - b)).add(L.mul(10)).div(b);
    },
  };
}

export function genSoneki(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return rng.chance(0.5) ? listPrice(rng) : discountPrice(rng);
  if (diff === 2) return profitAfterDiscount(rng);
  return rng.chance(0.5) ? costFromProfit(rng) : lossAndGain(rng);
}
