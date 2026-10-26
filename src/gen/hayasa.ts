import { F } from '../core/frac';
import { fracStr, num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, tryF, type Draft } from './framework';
import { d, fDec, fInt } from './fmt';

// SPI 非言語「速さ」

function distanceKm(rng: Rng): Draft | null {
  const v = rng.pick([3, 4, 5, 6, 12, 15, 18, 36, 40, 45, 48, 60, 72]);
  const t = rng.pick([10, 12, 15, 20, 24, 25, 30, 36, 40, 45, 48, 50, 54, 75, 80, 90]);
  const D = F(v * t, 60);
  const fk = fDec('km', 2);
  if (!fk(D)) return null;
  const h = F(t, 60);
  return {
    question_ja: `時速${v}kmで${t}分間進んだ。進んだ道のりは何kmか。`,
    correct: { text: fk(D)!, value: D },
    wrong: [
      numCand(F(v * t), fk, '分を時間に直さなかった'),
      numCand(F(v * t, 100), fk, '1時間を100分として計算した'),
      numCand(F(v * 60, t), fk, '時間を割り算にした'),
    ],
    fillers: [numCand(D.mul(2), fk), numCand(D.div(2), fk), numCand(D.add(1), fk)],
    short: `道のり = 速さ × 時間。時間を「時間」単位にそろえる: ${t}分 = ${fracStr(h)}時間。\n{{${v} × ${fracStr(h)} = ${d(D)}}}\n答えは ${fk(D)}。`,
    steps: [
      `時速は「1時間あたり」なので、${t}分を時間に直す: {{${t} ÷ 60 = ${fracStr(h)}}}時間`,
      `道のり = 速さ × 時間 = {{${v} × ${fracStr(h)} = ${d(D)}}}km`,
    ],
    quick: [
      `時速${v}km = 1分あたり {{${v} ÷ 60 = ${num(F(v, 60))}}}km。`,
      `${t}分なら {{${num(F(v, 60))} × ${t} = ${d(D)}}}km。`,
      `目安: ${t}分は1時間の${t < 30 ? '半分未満' : t === 30 ? 'ちょうど半分' : '半分より長い'}なので、答えは ${v} の半分(${d(F(v, 2))}km)${t < 30 ? 'より小さい' : t === 30 ? 'と同じ' : 'より大きい'}。`,
    ],
    ko: `거리 = 속력 × 시간. ${t}분 = ${fracStr(h)}시간으로 바꿔서 ${v} × ${fracStr(h)} = ${d(D)}km. 분을 시간으로 바꾸지 않고 ${v} × ${t}로 계산하는 실수가 많습니다.`,
    tip: '「時速」なら時間、「分速」なら分に単位をそろえてから掛ける。',
    params: { template: 'distanceKm', v, t },
    check: () => F(v).div(60).mul(t),
  };
}

function minutesWalk(rng: Rng): Draft | null {
  const v = rng.pick([50, 60, 70, 75, 80, 90, 100, 120, 150, 200, 240, 250]);
  const D = F(rng.int(6, 90), 10); // km
  const T = D.mul(1000).div(v);
  if (!T.isInt()) return null;
  const fm = fInt('分');
  return {
    question_ja: `分速${v}mで歩くと、${d(D)}kmの道のりを進むのに何分かかるか。`,
    correct: { text: `${num(T)}分`, value: T },
    wrong: [
      numCand(D.mul(100).div(v), fm, 'kmをmに直すとき100倍にした'),
      numCand(D.mul(10000).div(v), fm, 'kmをmに直すとき10000倍にした'),
      numCand(tryF(() => D.mul(1000).div(v).div(60)), fm, '分を時間に直してしまった'),
    ],
    fillers: [numCand(T.add(5), fm), numCand(T.sub(5), fm), numCand(T.add(10), fm)],
    short: `単位をmにそろえる: ${d(D)}km = ${num(D.mul(1000))}m。\n時間 = 道のり ÷ 速さ = {{${num(D.mul(1000))} ÷ ${v} = ${num(T)}}}\n答えは ${num(T)}分。`,
    steps: [
      `速さが「分速○m」なので道のりもmにする: {{${d(D)} × 1,000 = ${num(D.mul(1000))}}}m`,
      `時間 = 道のり ÷ 速さ: {{${num(D.mul(1000))} ÷ ${v} = ${num(T)}}}分`,
    ],
    quick: [`「は・じ・き」(速さ・時間・距離)の関係: 時間 = 距離 ÷ 速さ。`, `検算: {{${v} × ${num(T)} = ${num(D.mul(1000))}}}m = ${d(D)}km`],
    ko: `분속 m 단위이므로 거리도 m로: ${d(D)}km = ${num(D.mul(1000))}m. 시간 = 거리 ÷ 속력 = ${num(D.mul(1000))} ÷ ${v} = ${num(T)}분.`,
    tip: '1km = 1,000m。単位をそろえてから割る。',
    params: { template: 'minutesWalk', v, D: d(D) },
    check: () => F(D.n * 1000, D.d * v),
  };
}

function roundTrip(rng: Rng): Draft | null {
  const a = rng.int(2, 40) * rng.pick([1, 2, 3]);
  const b = rng.int(2, 40) * rng.pick([1, 2, 3]);
  if (a === b || a > 90 || b > 90) return null;
  const avg = F(2 * a * b, a + b);
  if (!avg.isInt()) return null;
  const D = (a * b) / gcd(a, b); // 片道を a,b の最小公倍数にすると時間が整数
  const ta = F(D, a);
  const tb = F(D, b);
  const fk = (x: ReturnType<typeof F>) => (x.isInt() ? `時速${num(x)}km` : null);
  return {
    question_ja: `ある道のりを、行きは時速${a}km、帰りは時速${b}kmで往復した。往復の平均の速さは時速何kmか。`,
    correct: { text: `時速${num(avg)}km`, value: avg },
    wrong: [
      numCand(F(a + b, 2), fk, '速さをそのまま平均した'),
      numCand(F(a * b, a + b), fk, '往復の2倍を忘れた'),
      numCand(F(Math.abs(a - b)), fk, '速さの差を出した'),
    ],
    fillers: [numCand(avg.add(1), fk), numCand(avg.sub(1), fk), numCand(avg.add(2), fk)],
    short: `平均の速さ = 往復の道のり ÷ 往復の時間。片道を${D}kmと置くと時間は ${num(ta)}時間と${num(tb)}時間。\n{{${2 * D} ÷ (${num(ta)} + ${num(tb)}) = ${num(avg)}}}\n答えは 時速${num(avg)}km。`,
    steps: [
      `片道の道のりは分からないので、${a}と${b}の公倍数 ${D}km と置く(どんな値でも答えは同じ)。`,
      `行きの時間 {{${D} ÷ ${a} = ${num(ta)}}}時間、帰りの時間 {{${D} ÷ ${b} = ${num(tb)}}}時間`,
      `往復 {{${D} × 2 = ${2 * D}}}km を {{${num(ta)} + ${num(tb)} = ${num(ta.add(tb))}}}時間 で進んだので`,
      `{{${2 * D} ÷ ${num(ta.add(tb))} = ${num(avg)}}} → 時速${num(avg)}km`,
    ],
    quick: [
      `公式: 平均の速さ = 2 × 行き × 帰り ÷ (行き + 帰り) = {{2 × ${a} × ${b} ÷ (${a} + ${b}) = ${num(avg)}}}`,
      `遅い方の速さで長い時間進むので、答えは単純平均 ${d(F(a + b, 2))} より必ず小さい。これだけで選択肢を減らせる。`,
    ],
    ko: `평균 속력 = 왕복 거리 ÷ 왕복 시간. 편도를 ${D}km로 두면 ${num(ta)}시간 + ${num(tb)}시간 = ${num(ta.add(tb))}시간, ${2 * D} ÷ ${num(ta.add(tb))} = 시속 ${num(avg)}km. 단순 평균((${a}+${b})÷2)은 틀립니다.`,
    tip: '道のりが分からないときは、速さの公倍数を道のりに置く。',
    params: { template: 'roundTrip', a, b },
    check: () => F(2 * D).div(F(D, a).add(F(D, b))),
  };
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function meetOrChase(rng: Rng): Draft | null {
  const a = rng.pick([50, 60, 70, 75, 80, 90, 100, 120]);
  const b = rng.pick([50, 60, 70, 75, 80, 90, 100, 120, 150]);
  if (a === b) return null;
  const L = rng.pick([600, 720, 840, 900, 1000, 1200, 1500, 1800, 2000, 2400, 3000]);
  const opposite = rng.chance(0.5);
  const rel = opposite ? a + b : Math.abs(a - b);
  const T = F(L, rel);
  if (!T.isInt()) return null;
  const fm = fInt('分後');
  const other = F(L, opposite ? Math.abs(a - b) : a + b);
  return {
    question_ja: `1周${num(L)}mの池の周りを、Aは分速${a}m、Bは分速${b}mで、同じ地点から${opposite ? '反対方向' : '同じ方向'}に同時に歩き始めた。2人が${opposite ? '初めて出会う' : '初めて追いつく(速い方が1周多く歩いて並ぶ)'}のは何分後か。`,
    correct: { text: `${num(T)}分後`, value: T },
    wrong: [
      numCand(other, fm, opposite ? '速さの差で割った' : '速さの和で割った'),
      numCand(F(L, Math.max(a, b)), fm, '1人の速さだけで割った'),
      numCand(F(L, Math.min(a, b)), fm, '1人の速さだけで割った'),
    ],
    fillers: [numCand(T.add(1), fm), numCand(T.mul(2), fm), numCand(T.add(2), fm)],
    short: `${opposite ? '反対方向なら2人の距離は「速さの和」' : '同じ方向なら2人の差は「速さの差」'}ずつ縮まる。\n{{${num(L)} ÷ ${rel} = ${num(T)}}}\n答えは ${num(T)}分後。`,
    steps: [
      opposite
        ? `反対方向に歩くと、1分間に2人で {{${a} + ${b} = ${rel}}}m ずつ近づく(合わせて1周分歩けば出会う)。`
        : `同じ方向に歩くと、1分間に {{${Math.max(a, b)} − ${Math.min(a, b)} = ${rel}}}m ずつ差が開く(差が1周分になれば追いつく)。`,
      `{{${num(L)} ÷ ${rel} = ${num(T)}}}分後`,
    ],
    quick: [
      '出会い算は「和」、追いかけ算は「差」で割る、と覚える。',
      `検算: ${num(T)}分で A は {{${a} × ${num(T)} = ${num(a * T.n)}}}m、B は {{${b} × ${num(T)} = ${num(b * T.n)}}}m。${opposite ? `合計 ${num(a * T.n + b * T.n)}m = 1周` : `差 ${num(Math.abs(a - b) * T.n)}m = 1周`}。`,
    ],
    ko: `${opposite ? '반대 방향이면 두 사람의 속력의 합' : '같은 방향이면 속력의 차'}만큼 거리가 줄어듭니다(늘어납니다). ${num(L)} ÷ ${rel} = ${num(T)}분 후.`,
    tip: '向かい合う・反対方向 →「和」、同じ方向で追いかける →「差」。',
    params: { template: 'meetOrChase', a, b, L, opposite },
    check: () => {
      // 1分ごとにシミュレーションして初めて条件を満たす時刻を探す
      for (let m = 1; m <= 10000; m++) {
        const da = a * m;
        const db = b * m;
        if (opposite ? da + db === L : Math.abs(da - db) === L) return F(m);
        if (opposite ? da + db > L : Math.abs(da - db) > L) return F(-1);
      }
      return F(-1);
    },
  };
}

function chaseLater(rng: Rng): Draft | null {
  const a = rng.pick([50, 60, 70, 75, 80]);
  const b = rng.pick([90, 100, 120, 150, 160, 200]);
  const t = rng.pick([4, 5, 6, 8, 9, 10, 12, 15, 18, 20]);
  const T = F(a * t, b - a);
  if (!T.isInt()) return null;
  const fm = fInt('分後');
  return {
    question_ja: `弟が家を出て分速${a}mで駅に向かった。その${t}分後に、兄が同じ道を分速${b}mで追いかけた。兄が弟に追いつくのは、兄が家を出てから何分後か(駅に着く前に追いつくものとする)。`,
    correct: { text: `${num(T)}分後`, value: T },
    wrong: [
      numCand(T.add(t), fm, '弟が出発してからの時間'),
      numCand(F(a * t, a + b), fm, '速さの和で割った'),
      numCand(F(b * t, b - a), fm, '兄の速さで先行距離を出した'),
    ],
    fillers: [numCand(T.add(1), fm), numCand(T.sub(1), fm), numCand(T.add(2), fm)],
    short: `兄が出るまでに弟は {{${a} × ${t} = ${num(a * t)}}}m 先にいる。差は毎分 {{${b} − ${a} = ${b - a}}}m 縮む。\n{{${a * t} ÷ ${b - a} = ${num(T)}}}\n答えは ${num(T)}分後。`,
    steps: [
      `兄が出発する時点で、弟は {{${a} × ${t} = ${a * t}}}m 先にいる。`,
      `兄は弟より毎分 {{${b} − ${a} = ${b - a}}}m 速いので、その分ずつ差が縮まる。`,
      `追いつくまで {{${a * t} ÷ ${b - a} = ${num(T)}}}分`,
    ],
    quick: [
      `検算: ${num(T)}分後、兄は {{${b} × ${num(T)} = ${num(b * T.n)}}}m、弟は {{${a} × (${num(T)} + ${t}) = ${num(a * (T.n + t))}}}m で同じ位置。`,
      `問われているのは「兄が出てから」の時間。弟の出発から数えた ${num(T.add(t))}分 と取り違えないこと。`,
    ],
    ko: `형이 출발할 때 동생은 ${a} × ${t} = ${a * t}m 앞에 있습니다. 매분 ${b} − ${a} = ${b - a}m씩 좁혀지므로 ${a * t} ÷ ${b - a} = ${num(T)}분 후. "형이 출발한 뒤" 시간을 묻는다는 점에 주의하세요.`,
    tip: '追いかけ算: 先行した距離 ÷ 速さの差。',
    params: { template: 'chaseLater', a, b, t },
    check: () => {
      for (let m = 1; m <= 5000; m++) if (b * m === a * (m + t)) return F(m);
      return F(-1);
    },
  };
}

export function genHayasa(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return rng.chance(0.5) ? distanceKm(rng) : minutesWalk(rng);
  if (diff === 2) return rng.chance(0.5) ? roundTrip(rng) : meetOrChase(rng);
  return rng.chance(0.4) ? meetOrChase(rng) : chaseLater(rng);
}
