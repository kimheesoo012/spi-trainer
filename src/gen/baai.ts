import { F } from '../core/frac';
import { num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';
import { fInt } from './fmt';

// SPI 非言語「場合の数」。check() は実際に並べ方・選び方を列挙して数える

const ft = fInt('通り');

function C(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}
function P(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r *= n - i;
  return r;
}
const fact = (n: number) => P(n, n);

/** 0..n-1 から k 個の組合せをすべて列挙 */
function combos(n: number, k: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, cur: number[]) => {
    if (cur.length === k) {
      out.push(cur.slice());
      return;
    }
    for (let i = start; i < n; i++) {
      cur.push(i);
      rec(i + 1, cur);
      cur.pop();
    }
  };
  rec(0, []);
  return out;
}
/** 0..n-1 の順列(長さ k)をすべて列挙 */
function perms(n: number, k: number): number[][] {
  const out: number[][] = [];
  const used = Array(n).fill(false);
  const rec = (cur: number[]) => {
    if (cur.length === k) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      rec(cur);
      cur.pop();
      used[i] = false;
    }
  };
  rec([]);
  return out;
}

function chooseOrArrange(rng: Rng): Draft | null {
  const n = rng.int(5, 10);
  const ordered = rng.chance(0.5);
  const k = ordered ? 2 + (rng.chance(0.3) ? 1 : 0) : rng.int(2, 4);
  const ans = ordered ? P(n, k) : C(n, k);
  const roles = ['委員長', '副委員長', '書記'].slice(0, k);
  return {
    question_ja: ordered
      ? `${n}人の中から、${roles.join('・')}を1人ずつ選ぶ。選び方は何通りあるか(1人が2つの役を兼ねることはない)。`
      : `${n}人の中から、${k}人の代表を選ぶ。選び方は何通りあるか。`,
    correct: { text: `${num(ans)}通り`, value: F(ans) },
    wrong: [
      numCand(F(ordered ? C(n, k) : P(n, k)), ft, ordered ? '役の区別を無視した(組合せ)' : '順番を区別した(順列)'),
      numCand(F(n ** k), ft, '同じ人を何度も選べるとした'),
      numCand(F(n * k), ft, '人数と選ぶ数を掛けた'),
    ],
    fillers: [numCand(F(ans + n), ft), numCand(F(ans * 2), ft)],
    short: ordered
      ? `役が違うので順番を区別する(順列)。\n{{${n}P${k} = ${Array.from({ length: k }, (_, i) => n - i).join(' × ')} = ${ans}}}\n答えは ${num(ans)}通り。`
      : `代表は区別しないので組合せ。\n{{${n}C${k} = ${ans}}}\n答えは ${num(ans)}通り。`,
    steps: ordered
      ? [
          `${roles[0]}は${n}人から、次の${roles[1]}は残り${n - 1}人から${k === 3 ? `、${roles[2]}は残り${n - 2}人から` : ''}選ぶ。`,
          `{{${Array.from({ length: k }, (_, i) => n - i).join(' × ')} = ${ans}}}通り`,
        ]
      : [
          `まず順番を区別して並べると {{${n}P${k} = ${num(P(n, k))}}}通り。`,
          `同じ${k}人の並び替え {{${k}! = ${fact(k)}}}通り が同じ選び方なので割る: {{${num(P(n, k))} ÷ ${fact(k)} = ${num(ans)}}}`,
        ],
    quick: ordered
      ? ['「役割・順番がある」→ 順列 P、「ただ選ぶだけ」→ 組合せ C。']
      : [
          `直接計算するなら、分子に ${n} から ${k} 個を掛け、分母に ${k}! を置く: {{${Array.from({ length: k }, (_, i) => n - i).join(' × ')} ÷ (${Array.from({ length: k }, (_, i) => k - i).join(' × ')}) = ${num(ans)}}}`,
          `nCk = nC(n−k)。${n}C${k} は ${n}C${n - k} と同じなので、小さい方で計算すると速い。`,
        ],
    ko: ordered
      ? `역할이 다르므로 순서를 구별(순열): ${n}P${k} = ${ans}가지.`
      : `대표는 구별하지 않으므로 조합: ${n}C${k} = ${n}P${k} ÷ ${k}! = ${num(P(n, k))} ÷ ${fact(k)} = ${num(ans)}가지.`,
    tip: '役割があれば P、なければ C。',
    params: { template: ordered ? 'arrange' : 'choose', n, k },
    check: () => F(ordered ? perms(n, k).length : combos(n, k).length),
  };
}

function atLeastOneWoman(rng: Rng): Draft | null {
  const m = rng.int(3, 7);
  const f = rng.int(2, 6);
  const k = rng.int(2, 4);
  if (k > m) return null;
  const total = C(m + f, k);
  const noF = C(m, k);
  const ans = total - noF;
  return {
    question_ja: `男子${m}人、女子${f}人の中から${k}人を選ぶ。女子が少なくとも1人含まれる選び方は何通りあるか。`,
    correct: { text: `${num(ans)}通り`, value: F(ans) },
    wrong: [
      numCand(F(total), ft, '条件を無視した'),
      numCand(F(f * C(m, k - 1)), ft, '女子ちょうど1人だけを数えた'),
      numCand(F(f * C(m + f - 1, k - 1)), ft, '女子を1人決めてから残りを選んだ(重複して数える)'),
      numCand(F(noF), ft, '女子が0人の選び方'),
    ],
    fillers: [numCand(F(ans + 1), ft), numCand(F(ans - 1), ft)],
    short: `全体から「女子0人(男子だけ)」を引く。\n{{${m + f}C${k} − ${m}C${k} = ${total} − ${noF} = ${ans}}}\n答えは ${num(ans)}通り。`,
    steps: [
      `条件なしで${m + f}人から${k}人: {{${m + f}C${k} = ${total}}}通り`,
      `女子が1人もいない(男子${m}人から${k}人): {{${m}C${k} = ${noF}}}通り`,
      `少なくとも1人 = 全体 − 0人: {{${total} − ${noF} = ${ans}}}通り`,
    ],
    quick: [
      '「少なくとも1人」は余事象(1人もいない場合)を引くのが最速。',
      `女子を先に1人決めて残りを選ぶ方法(${f} × ${m + f - 1}C${k - 1})は、同じ組を何度も数えてしまうので誤り。`,
    ],
    ko: `전체 ${m + f}C${k} = ${total}가지에서 "여자 0명(남자만)" ${m}C${k} = ${noF}가지를 빼면 ${ans}가지. 여자 1명을 먼저 정하고 나머지를 고르면 중복해서 세게 됩니다.`,
    tip: '「少なくとも」→ 全体 −「1人もいない」。',
    params: { template: 'atLeastOneWoman', m, f, k },
    check: () => F(combos(m + f, k).filter((c) => c.some((i) => i >= m)).length),
  };
}

function digits(rng: Rng): Draft | null {
  const n = rng.int(4, 6); // 0〜n の n+1 枚
  const even = rng.chance(0.5);
  const cards = Array.from({ length: n + 1 }, (_, i) => i);
  // 総当たりで数える(答えもこれで決める)
  const all = perms(n + 1, 3).filter((p) => p[0] !== 0);
  const target = even ? all.filter((p) => p[2] % 2 === 0) : all;
  const ans = target.length;
  const naive = P(n + 1, 3);
  const evens = cards.filter((c) => c % 2 === 0).length;
  // 偶数: 一の位が0 → 残り n × (n−1)、一の位が0以外の偶数 → 百の位 (n−1) × 十の位 (n−1)
  const e0 = n * (n - 1);
  const eOther = (evens - 1) * (n - 1) * (n - 1);
  return {
    question_ja: `0から${n}までの数字が1つずつ書かれた${n + 1}枚のカードから3枚を選んで並べ、3桁の${even ? '偶数' : '整数'}をつくる。何通りできるか。`,
    correct: { text: `${num(ans)}通り`, value: F(ans) },
    wrong: even
      ? [
          numCand(F(naive / 2), ft, '全体を半分にした'),
          numCand(F(evens * n * (n - 1)), ft, '0を百の位に置く場合を除き忘れた'),
          numCand(F(all.length), ft, '偶数の条件を忘れた'),
        ]
      : [numCand(F(naive), ft, '0が百の位に来る場合を除き忘れた'), numCand(F(n * n * n), ft, '同じ数字を何度も使えるとした'), numCand(F(C(n + 1, 3)), ft, '並べ方を考えなかった')],
    fillers: [numCand(F(ans + n), ft), numCand(F(ans - n), ft)],
    short: even
      ? `一の位が0のときと、0以外の偶数のときに分ける。\n{{${n} × ${n - 1} + ${evens - 1} × ${n - 1} × ${n - 1} = ${ans}}}\n答えは ${num(ans)}通り。`
      : `百の位は0以外の${n}通り、十の位は残り${n}通り、一の位は残り${n - 1}通り。\n{{${n} × ${n} × ${n - 1} = ${ans}}}\n答えは ${num(ans)}通り。`,
    steps: even
      ? [
          `一の位が0: 百の位は残り${n}枚、十の位は${n - 1}枚 → {{${n} × ${n - 1} = ${e0}}}通り`,
          `一の位が0以外の偶数(${evens - 1}通り): 百の位は0と一の位を除く${n - 1}枚、十の位は残り${n - 1}枚 → {{${evens - 1} × ${n - 1} × ${n - 1} = ${eOther}}}通り`,
          `合計 {{${e0} + ${eOther} = ${ans}}}通り`,
        ]
      : [
          `百の位: 0は置けないので {{${n + 1} − 1 = ${n}}}通り`,
          `十の位: 百の位で使った数を除き、0を含めて ${n}通り。一の位: 残り${n - 1}通り`,
          `{{${n} × ${n} × ${n - 1} = ${ans}}}通り`,
        ],
    quick: even
      ? ['条件が厳しい位(一の位・百の位)から先に決める。0を含む問題は「一の位が0か」で場合分けすると漏れがない。']
      : [`全部の並べ方 {{${n + 1}P3 = ${naive}}} から、百の位が0のもの {{${n}P2 = ${P(n, 2)}}} を引いても同じ: {{${naive} − ${P(n, 2)} = ${ans}}}`],
    ko: even
      ? `일의 자리가 0인 경우 ${n} × ${n - 1} = ${e0}가지, 0이 아닌 짝수인 경우 ${evens - 1} × ${n - 1} × ${n - 1} = ${eOther}가지, 합계 ${ans}가지. 0은 백의 자리에 올 수 없으므로 경우를 나눕니다.`
      : `백의 자리에는 0이 올 수 없어 ${n}가지, 십의 자리 ${n}가지, 일의 자리 ${n - 1}가지 → ${n} × ${n} × ${n - 1} = ${ans}가지.`,
    tip: '0のカードは「先頭に置けない」。条件のある位から決める。',
    params: { template: even ? 'digitsEven' : 'digits', n },
    check: () => {
      // 3桁の数を直接数え直す
      let c = 0;
      for (let x = 100; x <= 999; x++) {
        const ds = [Math.floor(x / 100), Math.floor(x / 10) % 10, x % 10];
        if (ds.some((v) => v > n)) continue;
        if (new Set(ds).size < 3) continue;
        if (even && x % 2) continue;
        c++;
      }
      return F(c);
    },
  };
}

function adjacent(rng: Rng): Draft | null {
  const n = rng.int(4, 7);
  const circle = rng.chance(0.4);
  const ans = circle ? fact(n - 1) : 2 * fact(n - 1);
  return {
    question_ja: circle
      ? `${n}人が円形のテーブルの周りに等間隔に座る。座り方は何通りあるか(回転して同じになる座り方は1通りと数える)。`
      : `A、Bを含む${n}人が横一列に並ぶ。AとBが隣り合う並び方は何通りあるか。`,
    correct: { text: `${num(ans)}通り`, value: F(ans) },
    wrong: circle
      ? [numCand(F(fact(n)), ft, '回転を区別した'), numCand(F(fact(n - 1) / 2), ft, '裏返しも同じとした'), numCand(F(fact(n - 2)), ft, '固定する人数を誤った')]
      : [numCand(F(fact(n - 1)), ft, 'AとBの入れ替えを忘れた'), numCand(F(fact(n)), ft, '条件を無視した'), numCand(F(2 * fact(n - 2)), ft, '固まりを数えずに並べた')],
    fillers: [numCand(F(ans + 2), ft), numCand(F(ans * 3), ft)],
    short: circle
      ? `円順列は1人を固定して残りを並べる: {{(${n} − 1)! = ${ans}}}\n答えは ${num(ans)}通り。`
      : `AとBを1つの固まりとみなして ${n - 1} 個を並べ、固まりの中の入れ替え2通りを掛ける。\n{{${n - 1}! × 2 = ${num(ans)}}}\n答えは ${num(ans)}通り。`,
    steps: circle
      ? [`回転すると同じになるので、1人の席を固定する。`, `残り${n - 1}人を並べる: {{${n - 1}! = ${ans}}}通り`]
      : [
          `AとBを1つの固まり[AB]とみなすと、並べるのは {{${n} − 1 = ${n - 1}}}個。`,
          `${n - 1}個の並べ方: {{${n - 1}! = ${num(fact(n - 1))}}}通り`,
          `固まりの中で AB と BA の2通り: {{${num(fact(n - 1))} × 2 = ${num(ans)}}}通り`,
        ],
    quick: circle ? [`一列なら ${n}! = ${num(fact(n))} 通り。円では${n}通りの回転が同じなので {{${num(fact(n))} ÷ ${n} = ${num(ans)}}}`] : ['「隣り合う」は固まりにまとめる、「隣り合わない」は全体から隣り合うを引く。'],
    ko: circle
      ? `원순열은 한 사람을 고정하고 나머지 ${n - 1}명을 배열: (${n} − 1)! = ${ans}가지.`
      : `A와 B를 한 묶음으로 보고 ${n - 1}개를 배열(${n - 1}! = ${num(fact(n - 1))}), 묶음 안의 AB·BA 2가지를 곱해 ${num(ans)}가지.`,
    tip: circle ? '円順列 = (n − 1)!' : '隣り合う → まとめて並べ、中の並びを掛ける。',
    params: { template: circle ? 'circle' : 'adjacent', n },
    check: () => {
      const ps = perms(n, n);
      if (!circle) return F(ps.filter((p) => Math.abs(p.indexOf(0) - p.indexOf(1)) === 1).length);
      // 回転で同じものを1つにまとめる(人0が先頭になるよう回転した形で代表させる)
      const keys = new Set(
        ps.map((p) => {
          const i = p.indexOf(0);
          return [...p.slice(i), ...p.slice(0, i)].join(',');
        }),
      );
      return F(keys.size);
    },
  };
}

export function genBaai(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return chooseOrArrange(rng);
  if (diff === 2) return atLeastOneWoman(rng);
  return rng.chance(0.5) ? digits(rng) : adjacent(rng);
}
