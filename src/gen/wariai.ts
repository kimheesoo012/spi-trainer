import { F, Frac } from '../core/frac';
import { fracStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';
import { d, fInt, fPct } from './fmt';

// SPI 非言語「割合」

function participation(rng: Rng): Draft | null {
  const N = rng.pick([20, 25, 40, 50, 80, 120, 150, 200, 250, 400]);
  const p = 5 * rng.int(1, 19);
  const M = F(N * p, 100);
  if (!M.isInt()) return null;
  const r = F(p, 100);
  const red = M.div(N); // 約分した分数
  const fp = fPct(1);
  return {
    question_ja: `ある講演会の定員は${N}人で、当日の参加者は${num(M)}人だった。参加者は定員の何%か。`,
    correct: { text: `${p}%`, value: r },
    wrong: [
      numCand(F(100 - p, 100), fp, '参加しなかった人の割合'),
      numCand(F(N).div(M), fp, '割る数と割られる数が逆'),
      numCand(F(p, 1000), fp, '位取りの誤り'),
    ],
    fillers: [numCand(F(p + 5, 100), fp), numCand(F(p - 5, 100), fp), numCand(F(p + 10, 100), fp)],
    short: `「参加者は定員の何%か」なので 参加者 ÷ 定員。\n{{${num(M)} ÷ ${N} = ${d(r)}}} → 100倍して ${p}%。\n答えは ${p}%。`,
    steps: [
      '「AはBの何%か」は A ÷ B で求める。「〜の」が付いた方(定員)が基準で、割る数になる。',
      `参加者 ÷ 定員 = {{${num(M)} ÷ ${N} = ${d(r)}}}`,
      `百分率にするため100倍する。{{${d(r)} × 100 = ${p}}} → ${p}%`,
    ],
    quick: [
      `分数のまま約分すると {{${num(M)}/${N} = ${fracStr(red)}}}。`,
      `分母を100にそろえる: {{${fracStr(red)} = ${p}/100}} → そのまま ${p}%。`,
      `先に「半分(${N / 2}人)より多いか少ないか」を見ると、50%より上か下かで選択肢を絞れる。`,
    ],
    ko: `"참가자는 정원의 몇 %인가"이므로 참가자 ÷ 정원 = ${num(M)} ÷ ${N} = ${d(r)} → ${p}%. "A는 B의 몇 %"는 항상 A ÷ B(기준이 되는 B로 나눔)입니다.`,
    tip: '「〜の何%」の「〜」が基準(割る数)。',
    params: { template: 'participation', N, p },
    check: () => F(N * p, 100).div(N),
  };
}

function percentOf(rng: Rng): Draft | null {
  const X = 100 * rng.int(4, 98);
  const p = rng.pick([2, 4, 5, 8, 10, 12, 15, 20, 25, 30]);
  const ans = F(X * p, 100);
  if (!ans.isInt()) return null;
  const ten = F(X, 10);
  const fy = fInt('円');
  return {
    question_ja: `ある店では、会員が買い物をすると代金の${p}%が次回以降に使える割引額として戻ってくる。${num(X)}円の買い物をしたとき、戻ってくる割引額は何円か。`,
    correct: { text: `${num(ans)}円`, value: ans },
    wrong: [
      numCand(F(X).mul(F(100 + p, 100)), fy, '代金に足してしまった'),
      numCand(F(X).mul(F(100 - p, 100)), fy, '残りの部分を出した'),
      numCand(F(X * p, 1000), fy, '位取りの誤り'),
    ],
    fillers: [numCand(ans.add(100), fy), numCand(ans.sub(100), fy), numCand(ans.add(50), fy)],
    short: `「${num(X)}円の${p}%」は ${num(X)} × ${p}/100。\n{{${num(X)} × ${p}% = ${num(ans)}}}\n答えは ${num(ans)}円。`,
    steps: [
      `${p}% は小数で ${d(F(p, 100))}。「〜の${p}%」は 〜 × ${d(F(p, 100))}。`,
      `{{${num(X)} × ${d(F(p, 100))} = ${num(ans)}}}`,
    ],
    quick: [
      `まず10%を出す(1桁ずらすだけ): {{${num(X)} ÷ 10 = ${num(ten)}}}`,
      `${p}% は10%の ${d(F(p, 10))} 倍: {{${num(ten)} × ${d(F(p, 10))} = ${num(ans)}}}`,
      '10%・5%・1% を足し合わせる方法は、電卓が使えない試験で特に速い。',
    ],
    ko: `"${num(X)}엔의 ${p}%" = ${num(X)} × ${d(F(p, 100))} = ${num(ans)}엔. 빠른 방법: 10%(${num(ten)}엔)를 먼저 구해서 ${d(F(p, 10))}배 합니다.`,
    tip: '10%は1桁ずらす。そこから5%(半分)、1%を組み合わせる。',
    params: { template: 'percentOf', X, p },
    check: () => F(X).div(100).mul(p),
  };
}

function successive(rng: Rng): Draft | null {
  const a = rng.pick([10, 20, 25, 30, 40, 50]);
  const b = rng.pick([10, 20, 25, 30, 40, 50]);
  if ((a * b) % 100 !== 0) return null;
  const k = F(100 + a, 100).mul(F(100 - b, 100)); // 最終 / 最初
  const change = k.sub(1);
  if (change.eq(0)) return null;
  const label = (v: Frac) => {
    if (v.eq(0)) return '増減なし';
    const s = fPct(1)(v.n > 0 ? v : v.neg());
    return s && `${s}${v.n > 0 ? '増' : '減'}`;
  };
  const up = F(100 + a, 100);
  const after1 = F(100 + a);
  const after2 = after1.mul(F(100 - b, 100));
  return {
    question_ja: `ある商品の価格を${a}%値上げした後、値上げ後の価格から${b}%値下げした。最初の価格と比べると、何%の増減になるか。`,
    correct: { text: label(change)!, value: change },
    wrong: [
      numCand(F(a - b, 100), label, '%をそのまま足し引きした'),
      numCand(change.neg(), label, '増と減を取り違えた'),
      numCand(F(a - b, 100).add(F(a * b, 10000)), label, '掛け合わせた部分の符号を誤った'),
    ],
    fillers: [numCand(change.add(F(1, 100)), label), numCand(change.sub(F(1, 100)), label), numCand(change.add(F(2, 100)), label)],
    positiveOnly: false,
    short: `元の価格を1とすると、最後は {{${d(up)} × ${d(F(100 - b, 100))} = ${d(k)}}}。\n1との差が増減なので、答えは ${label(change)}。`,
    steps: [
      '元の価格を1(=100%)とする。2回目の値下げは「値上げ後の価格」が基準になる点に注意。',
      `値上げ後: {{1 × (1 + ${a}%) = ${d(up)}}}`,
      `値下げ後: {{${d(up)} × (1 − ${b}%) = ${d(k)}}}`,
      change.isPos() ? `最初との差: {{${d(k)} − 1 = ${d(change)}}} → ${label(change)}` : `最初との差: {{1 − ${d(k)} = ${d(change.neg())}}} 減った → ${label(change)}`,
    ],
    quick: [
      '元の価格を100円と置くと、%がそのまま円で読める。',
      `{{100 × ${d(up)} = ${num(after1)}}}円 → {{${num(after1)} × ${d(F(100 - b, 100))} = ${num(after2)}}}円`,
      `100円から ${num(after2.sub(100).n < 0 ? after2.sub(100).neg() : after2.sub(100))}円の${after2.gt(100) ? '増加' : '減少'} = ${label(change)}。「${a}%上げて${b}%下げたから ${Math.abs(a - b)}%${a >= b ? '増' : '減'}」と単純に引くのは誤り(2回目の基準が最初の価格ではなく、値上げ後の価格だから)。`,
    ],
    ko: `처음 가격을 1로 두면 ${d(up)} × ${d(F(100 - b, 100))} = ${d(k)}. 1과의 차이 ${d(change)} → ${label(change)}. 두 번째 할인은 "인상된 가격"이 기준이므로 ${a}% − ${b}%로 단순히 빼면 틀립니다.`,
    tip: '連続する%の増減は掛け算。100円と置くと速い。',
    params: { template: 'successive', a, b },
    check: () => F(100).mul(F(100 + a, 100)).mul(F(100 - b, 100)).sub(100).div(100),
  };
}

function partOfPart(rng: Rng): Draft | null {
  const f1 = rng.pick([F(1, 2), F(1, 4), F(3, 4), F(2, 5), F(3, 5), F(4, 5), F(1, 5), F(3, 10), F(7, 10)]);
  const f2 = rng.pick([F(1, 2), F(1, 4), F(3, 4), F(1, 5), F(2, 5), F(3, 5), F(4, 5)]);
  const ans = f1.mul(f2);
  const fp = fPct(2);
  if (!fp(ans)) return null;
  const Nn = f1.d * f2.d;
  const k = F(Nn).mul(f1);
  const j = k.mul(f2);
  return {
    question_ja: `ある会社の社員のうち${fracStr(f1)}が営業部に所属し、営業部の社員のうち${fracStr(f2)}が女性である。営業部の女性社員は、社員全体の何%か。`,
    correct: { text: fp(ans)!, value: ans },
    wrong: [
      numCand(f2, fp, '基準(全体)を無視した'),
      numCand(f1.mul(F(1).sub(f2)), fp, '男性の割合を出した'),
      numCand(f1.sub(f2), fp, '割合どうしを引いた'),
    ],
    fillers: [numCand(f1, fp), numCand(f1.add(f2).div(2), fp), numCand(ans.mul(2), fp)],
    short: `「全体の${fracStr(f1)}」の「${fracStr(f2)}」なので掛け算。\n{{${fracStr(f1)} × ${fracStr(f2)} = ${fracStr(ans)}}} → 答えは ${fp(ans)}。`,
    steps: [
      '「AのうちのB」は、Aの割合 × Bの割合 で全体に対する割合になる。',
      `{{${fracStr(f1)} × ${fracStr(f2)} = ${fracStr(ans)}}}`,
      `百分率にする: {{${fracStr(ans)} × 100 = ${d(ans.mul(100))}}} → ${fp(ans)}`,
    ],
    quick: [
      `全体を分母の積 ${Nn}人 と置くと整数で考えられる。`,
      `営業部 {{${Nn} × ${fracStr(f1)} = ${num(k)}}}人、そのうち女性 {{${num(k)} × ${fracStr(f2)} = ${num(j)}}}人`,
      `{{${num(j)} ÷ ${Nn} × 100 = ${d(ans.mul(100))}}} → ${fp(ans)}`,
    ],
    ko: `"전체의 ${fracStr(f1)} 중 ${fracStr(f2)}"는 곱셈입니다. ${fracStr(f1)} × ${fracStr(f2)} = ${fracStr(ans)} → ${fp(ans)}. 전체를 ${Nn}명으로 두면 정수로 계산할 수 있습니다.`,
    tip: '「〜のうち〜」は掛け算。全体を分母の積で置くと分数が消える。',
    params: { template: 'partOfPart', f1: fracStr(f1), f2: fracStr(f2) },
    check: () => F(Nn).mul(f1).mul(f2).div(Nn),
  };
}

function reverseGrowth(rng: Rng): Draft | null {
  const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 60]);
  const L = rng.int(12, 96) * 10;
  const g = F(100 + p, 100);
  const N = g.mul(L);
  if (!N.isInt()) return null;
  const fy = fInt('人');
  return {
    question_ja: `ある大会の今年の参加者は${num(N)}人で、昨年より${p}%増えた。昨年の参加者は何人か。`,
    correct: { text: `${num(L)}人`, value: F(L) },
    wrong: [
      numCand(N.mul(F(100 - p, 100)), fy, '今年を基準に p% 減らした'),
      numCand(N.div(F(100 - p, 100)), fy, '1 − p% で割った'),
      numCand(N.mul(g), fy, '増やす向きに計算した'),
    ],
    fillers: [numCand(N.sub(p), fy, '%を人数として引いた'), numCand(F(L + 10), fy), numCand(F(L - 10), fy)],
    short: `昨年 × ${d(g)} = 今年 なので、昨年 = 今年 ÷ ${d(g)}。\n{{${num(N)} ÷ ${d(g)} = ${num(L)}}}\n答えは ${num(L)}人。`,
    steps: [
      `「昨年より${p}%増」は、昨年を基準(1)にして ${d(g)} 倍になったという意味。`,
      `昨年 × ${d(g)} = ${num(N)} → 昨年 = ${num(N)} ÷ ${d(g)}`,
      `{{${num(N)} ÷ ${d(g)} = ${num(L)}}}`,
      `検算: {{${num(L)} × ${d(g)} = ${num(N)}}}`,
    ],
    quick: [
      `${d(g)} を分数にすると ${fracStr(g)}。${fracStr(g)} で割る = ${fracStr(g.inv())} を掛ける。`,
      `{{${num(N)} × ${fracStr(g.inv())} = ${num(L)}}}`,
      `「${num(N)} × (1 − ${p}%)」は今年を基準にしてしまう典型的な誤り。選択肢を ×${d(g)} して${num(N)}になるか確かめると確実。`,
    ],
    ko: `"작년보다 ${p}% 증가"는 작년 × ${d(g)} = 올해라는 뜻입니다. 따라서 작년 = ${num(N)} ÷ ${d(g)} = ${num(L)}명. 올해에서 ${p}%를 빼면(${num(N)} × ${d(F(100 - p, 100))}) 기준이 달라져서 틀립니다.`,
    tip: '「前年比○%増」の逆算は割り算。分数にして逆数を掛ける。',
    params: { template: 'reverseGrowth', p, L },
    check: () => N.mul(100).div(100 + p),
  };
}

function mixedRate(rng: Rng): Draft | null {
  const x = rng.pick([20, 30, 40, 50, 60, 80, 100, 120, 150, 200]);
  const y = rng.pick([20, 30, 40, 50, 60, 80, 100, 120, 150, 200]);
  if (x === y) return null;
  const p = 5 * rng.int(2, 19);
  const q = 5 * rng.int(2, 19);
  if (p === q) return null;
  const a = F(x * p, 100);
  const b = F(y * q, 100);
  if (!a.isInt() || !b.isInt()) return null;
  const r = a.add(b).div(x + y); // 合格率(割合)
  const fp = fPct(1);
  if (!r.mul(100).isInt()) return null;
  const rp = r.mul(100);
  return {
    question_ja: `A組${x}人の合格率は${p}%、B組${y}人の合格率は${q}%だった。A組とB組を合わせた合格率は何%か。`,
    correct: { text: fp(r)!, value: r },
    wrong: [
      numCand(F(p + q, 200), fp, '人数を考えずに平均した'),
      numCand(F(x * q + y * p, 100 * (x + y)), fp, '人数と合格率の組を取り違えた'),
      numCand(F(Math.max(p, q), 100), fp, '一方の組の率をそのまま答えた'),
    ],
    fillers: [numCand(r.add(F(1, 100)), fp), numCand(r.sub(F(1, 100)), fp), numCand(r.add(F(2, 100)), fp)],
    short: `合格者数を出してから全体で割る。\n合格者 {{${num(a)} + ${num(b)} = ${num(a.add(b))}}}人、全体 ${x + y}人\n{{${num(a.add(b))} ÷ ${x + y} × 100 = ${num(rp)}}} → 答えは ${fp(r)}。`,
    steps: [
      `A組の合格者: {{${x} × ${p}% = ${num(a)}}}人`,
      `B組の合格者: {{${y} × ${q}% = ${num(b)}}}人`,
      `合計: {{${num(a)} + ${num(b)} = ${num(a.add(b))}}}人 / 全体 {{${x} + ${y} = ${x + y}}}人`,
      `{{${num(a.add(b))} ÷ ${x + y} × 100 = ${num(rp)}}} → ${fp(r)}`,
    ],
    quick: [
      `人数が違うので単純平均 {{(${p} + ${q}) ÷ 2 = ${d(F(p + q, 2))}}} は誤り。人数の多い組の率に引き寄せられる。`,
      `人数の多い${x > y ? 'A' : 'B'}組の${x > y ? p : q}%に近い側の選択肢に絞り、合格者数で確かめる。`,
    ],
    ko: `합격자 수를 먼저 구합니다: A반 ${x} × ${p}% = ${num(a)}명, B반 ${y} × ${q}% = ${num(b)}명. 합계 ${num(a.add(b))}명 ÷ 전체 ${x + y}명 = ${fp(r)}. 인원이 다르므로 (${p}+${q})÷2 같은 단순 평균은 틀립니다.`,
    tip: '人数が違う集団の率は「中身の人数」に戻して合計する(加重平均)。',
    params: { template: 'mixedRate', x, y, p, q },
    check: () => F(x).mul(F(p, 100)).add(F(y).mul(F(q, 100))).div(F(x + y)),
  };
}

export function genWariai(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return rng.chance(0.5) ? participation(rng) : percentOf(rng);
  if (diff === 2) return rng.chance(0.5) ? successive(rng) : partOfPart(rng);
  return rng.chance(0.5) ? reverseGrowth(rng) : mixedRate(rng);
}
