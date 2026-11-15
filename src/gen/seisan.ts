import { F } from '../core/frac';
import { num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';
import { fYen } from './fmt';

// SPI 非言語「代金の精算」。立て替えた代金を、全員が同じ額ずつ負担するように精算する

function equalShare3(rng: Rng): Draft | null {
  const share = 100 * rng.int(8, 40);
  const u = 100 * rng.int(1, share / 100 - 1);
  if (u * 2 === share) return null;
  const a = share + u; // X が支払った額
  const b = 2 * share - u; // Y が支払った額
  const tot = a + b;
  return {
    question_ja: `X、Y、Zの3人で食事をした。代金は、Xが${num(a)}円、Yが${num(b)}円を支払い、Zは支払っていない。3人が同じ額ずつ負担するように精算するとき、Zは合わせていくら支払えばよいか。`,
    correct: { text: `${num(share)}円`, value: F(share) },
    wrong: [numCand(F(tot, 2), fYen, '合計を2人で割った'), numCand(F(u), fYen, 'Xに渡す額だけを答えた'), numCand(F(share - u), fYen, 'Yに渡す額だけを答えた')],
    fillers: [numCand(F(share + 100), fYen), numCand(F(share - 100), fYen), numCand(F(share + 200), fYen)],
    short: `1人あたりの負担額は、合計 ÷ 3。Zは何も支払っていないので、その額をそのまま支払う。\n{{(${num(a)} + ${num(b)}) ÷ 3 = ${num(share)}}}\n答えは ${num(share)}円。`,
    steps: [
      `代金の合計: {{${num(a)} + ${num(b)} = ${num(tot)}}}円`,
      `1人あたりの負担額: {{${num(tot)} ÷ 3 = ${num(share)}}}円`,
      `Zはまだ何も支払っていないので、${num(share)}円を支払う(Xに {{${num(a)} − ${num(share)} = ${num(u)}}}円、Yに {{${num(b)} − ${num(share)} = ${num(share - u)}}}円)`,
    ],
    quick: ['まず「1人あたりの負担額」を出す。精算の問題は、すべてここから始まる。', '各自の「支払った額 − 負担額」がプラスなら受け取る側、マイナスなら支払う側。'],
    ko: `정산 문제는 먼저 "1인당 부담액"을 구합니다.\n합계 ${num(a)} + ${num(b)} = ${num(tot)}엔 → 1인당 ${num(tot)} ÷ 3 = ${num(share)}엔.\nZ는 아직 한 푼도 내지 않았으므로 부담액 ${num(share)}엔을 그대로 냅니다(X에게 ${num(u)}엔, Y에게 ${num(share - u)}엔).\n함정: 합계를 2명으로 나눈 값, X에게 줄 금액만 답한 값이 선택지에 있습니다. "合わせて(합쳐서)"를 확인하세요.`,
    intuition: `3人が同じ額を負担するので、1人分は合計の3分の1。Zはまだ何も払っていないから、その1人分をそのまま払えばよい。誰にいくら渡すかは、XとYがそれぞれ払いすぎた額で決まる。`,
    cue: '「同じ額ずつ負担するように精算」→ 合計 ÷ 人数 で1人あたりの負担額を出し、支払った額との差を見る',
    fast: [],
    tip: '精算は「1人あたりの負担額」と「実際に支払った額」の差で考える。',
    params: { template: 'equalShare3' },
    check: () => {
      for (let s = 100; s <= 30000; s += 100) if (3 * s === a + b) return F(s);
      return '';
    },
  };
}

function payToX(rng: Rng): Draft | null {
  const share = 100 * rng.int(20, 90);
  const sb = 100 * rng.int(2, 15); // Y の不足額
  const sc = 100 * rng.int(2, 15); // Z の不足額
  if (sb === sc) return null;
  const a = share + sb + sc;
  const b = share - sb;
  const c = share - sc;
  const tot = a + b + c;
  return {
    question_ja: `X、Y、Zの3人で旅行をした。Xが宿泊費${num(a)}円、Yが交通費${num(b)}円、Zが食事代${num(c)}円を支払った。3人が同じ額ずつ負担するように精算するとき、ZはXにいくら支払えばよいか。`,
    correct: { text: `${num(sc)}円`, value: F(sc) },
    wrong: [
      numCand(F(sb), fYen, 'Yが支払う額を答えた'),
      numCand(F(sb + sc), fYen, 'Xが受け取る合計を答えた'),
      numCand(F(a - c), fYen, 'XとZが支払った額の差を答えた'),
      numCand(F(a - c, 2), fYen, 'XとZの2人だけで精算した'),
    ],
    fillers: [numCand(F(sc + 100), fYen), numCand(F(sc - 100), fYen), numCand(F(sc + 200), fYen)],
    short: `1人あたりの負担額は {{(${num(a)} + ${num(b)} + ${num(c)}) ÷ 3 = ${num(share)}}}円。\nZの不足分: {{${num(share)} − ${num(c)} = ${num(sc)}}}\n答えは ${num(sc)}円。`,
    steps: [
      `代金の合計: {{${num(a)} + ${num(b)} + ${num(c)} = ${num(tot)}}}円`,
      `1人あたりの負担額: {{${num(tot)} ÷ 3 = ${num(share)}}}円`,
      `Zが支払ったのは${num(c)}円なので、不足は {{${num(share)} − ${num(c)} = ${num(sc)}}}円。負担額より多く支払っているのはXだけなので、これをXに支払う`,
      `確認: Yの不足は {{${num(share)} − ${num(b)} = ${num(sb)}}}円。Xが多く支払った {{${num(a)} − ${num(share)} = ${num(sb + sc)}}}円 と、2人の不足の合計が一致する`,
    ],
    quick: ['XとZの2人だけを比べてはいけない。3人全体の「1人あたりの負担額」を基準にする。', '多く支払った人が1人だけなら、ほかの人は自分の不足分をその人に渡せば精算が終わる。'],
    ko: `X와 Z 두 사람만 비교하면 안 됩니다. 세 사람 전체의 "1인당 부담액"이 기준입니다.\n합계 ${num(tot)}엔 → 1인당 ${num(share)}엔.\nZ는 ${num(c)}엔을 냈으므로 ${num(share)} − ${num(c)} = ${num(sc)}엔이 부족합니다. 부담액보다 많이 낸 사람은 X뿐이므로 이 금액을 X에게 줍니다.\n검산: Y의 부족분 ${num(sb)}엔 + Z의 부족분 ${num(sc)}엔 = X가 더 낸 ${num(sb + sc)}엔.\n함정: X와 Z의 지불액 차이(${num(a - c)}엔)나 그 절반을 답하면 틀립니다.`,
    intuition: `3人それぞれについて「支払った額 − 1人あたりの負担額」を考える。Zはマイナス(不足)、Xはプラス(払いすぎ)。Zは自分の不足分だけを、払いすぎているXに渡せばよい。`,
    cue: '「ZはXにいくら支払うか」→ 1人あたりの負担額 − Zが支払った額(XとZの差ではない)',
    fast: [],
    tip: '基準は全員の「1人あたりの負担額」。2人だけの差で考えない。',
    params: { template: 'payToX' },
    check: () => {
      const t = a + b + c;
      if (t % 3 !== 0) return '';
      const s = t / 3;
      return b < s && c < s && a > s ? F(s - c) : '';
    },
  };
}

function withDebt(rng: Rng): Draft | null {
  const L = 100 * rng.int(5, 40);
  const a = 100 * rng.int(4, 60);
  const b = 100 * rng.int(4, 60);
  if (a === b || (a + b) % 200 !== 0) return null;
  const share = (a + b) / 2;
  const diff = Math.abs(share - a);
  const short = a < share; // X の支払いが負担額より少ない
  const pay = short ? L + diff : L - diff;
  if (pay <= 0) return null;
  return {
    question_ja: `XはYに${num(L)}円を借りている。ある日、2人で買い物をして、Xが${num(a)}円、Yが${num(b)}円を支払った。買い物の代金を2人が同じ額ずつ負担し、借金もあわせて精算するとき、XはYにいくら支払えばよいか。`,
    correct: { text: `${num(pay)}円`, value: F(pay) },
    wrong: [
      numCand(F(short ? L - diff : L + diff), fYen, '買い物の精算を逆向きに計算した'),
      numCand(F(L + (b - a)), fYen, '支払った額の差を2で割らなかった'),
      numCand(F(diff), fYen, '借金を入れ忘れた'),
      numCand(F(L), fYen, '買い物の精算を入れ忘れた'),
    ],
    fillers: [numCand(F(pay + 100), fYen), numCand(F(pay - 100), fYen), numCand(F(pay + 200), fYen)],
    short: `買い物の精算と借金を、1つにまとめる。\n{{${num(L)} + (${num(a)} + ${num(b)}) ÷ 2 − ${num(a)} = ${num(pay)}}}\n答えは ${num(pay)}円。`,
    steps: [
      `買い物の1人あたりの負担額: {{(${num(a)} + ${num(b)}) ÷ 2 = ${num(share)}}}円`,
      short
        ? `Xが支払ったのは${num(a)}円なので、{{${num(share)} − ${num(a)} = ${num(diff)}}}円 足りない → この分をYに支払う`
        : `Xが支払ったのは${num(a)}円なので、{{${num(a)} − ${num(share)} = ${num(diff)}}}円 多く支払っている → この分をYから受け取る`,
      short ? `借金と合わせる: {{${num(L)} + ${num(diff)} = ${num(pay)}}}円` : `借金から差し引く: {{${num(L)} − ${num(diff)} = ${num(pay)}}}円`,
    ],
    quick: [
      short ? 'Xは買い物でも足りていないので、答えは借金の額より多くなる。借金より少ない選択肢は消せる。' : 'Xは買い物で多く支払っているので、答えは借金の額より少なくなる。借金より多い選択肢は消せる。',
      `2人の精算では、差額は「支払った額の差 ÷ 2」: {{(${num(Math.max(a, b))} − ${num(Math.min(a, b))}) ÷ 2 = ${num(diff)}}}円`,
    ],
    ko: `쇼핑 정산과 빚을 따로 계산한 뒤 합칩니다.\n쇼핑 1인당 부담액: (${num(a)} + ${num(b)}) ÷ 2 = ${num(share)}엔.\nX는 ${num(a)}엔을 냈으므로 ${short ? `${num(diff)}엔 부족 → Y에게 줘야 합니다` : `${num(diff)}엔 더 냈음 → Y에게서 받아야 합니다`}.\n빚 ${num(L)}엔과 합치면: ${num(L)} ${short ? '+' : '−'} ${num(diff)} = ${num(pay)}엔.\n먼저 지울 수 있는 선택지: X가 쇼핑에서 ${short ? '덜 냈으므로 답은 빚(' + num(L) + '엔)보다 많아야 합니다' : '더 냈으므로 답은 빚(' + num(L) + '엔)보다 적어야 합니다'}.\n함정: 두 사람이 낸 금액의 차이(${num(Math.abs(b - a))}엔)를 2로 나누지 않고 그대로 쓰면 틀립니다.`,
    intuition: `お金の流れは2つある。借金(XからYへ${num(L)}円)と、買い物の精算。買い物でXが${short ? '負担額より少なくしか支払っていないので、XからYへの支払いが増える' : '負担額より多く支払っているので、その分を借金から差し引ける'}。向きをそろえてから足し引きする。`,
    cue: '「借金もあわせて精算」→ 買い物の精算額(支払った額の差 ÷ 2)を出し、借金と向きをそろえて足す・引く',
    fast: [],
    tip: 'お金の向き(誰から誰へ)を矢印で書いてから、同じ向きは足し、逆向きは引く。',
    params: { template: 'withDebt' },
    check: () => {
      // X が最終的に負担すべき額(買い物の半分 + 借金)から、すでに支払った額を引く
      const due = F(a + b, 2).add(L);
      return due.sub(a);
    },
  };
}

export function genSeisan(rng: Rng, diff: Difficulty): Draft | null {
  return diff === 1 ? equalShare3(rng) : diff === 2 ? payToX(rng) : withDebt(rng);
}
