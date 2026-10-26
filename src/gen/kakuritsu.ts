import { F, Frac } from '../core/frac';
import { fracStr } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';

// SPI 非言語「確率」。答えは既約分数。check() は全通りを数え上げて確かめる

const ff = (v: Frac) => (v.d <= 1296 && !v.isInt() ? fracStr(v) : null);

function C(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return Math.round(r);
}

function diceSum(rng: Rng): Draft | null {
  const atLeast = rng.chance(0.4);
  const s = atLeast ? rng.int(8, 11) : rng.int(4, 10);
  let cnt = 0;
  const pairs: string[] = [];
  let unordered = 0;
  for (let a = 1; a <= 6; a++)
    for (let b = 1; b <= 6; b++) {
      const ok = atLeast ? a + b >= s : a + b === s;
      if (ok) {
        cnt++;
        if (pairs.length < 12) pairs.push(`(${a},${b})`);
        if (a <= b) unordered++;
      }
    }
  const p = F(cnt, 36);
  const cond = atLeast ? `${s}以上` : `${s}`;
  return {
    question_ja: `大小2つのサイコロを同時に投げるとき、出た目の和が${cond}になる確率はいくらか。`,
    correct: { text: fracStr(p), value: p },
    wrong: [
      numCand(F(unordered, 36), ff, '大小を区別せずに数えた'),
      numCand(F(cnt, 21), ff, '目の組を21通りと数えた'),
      numCand(F(1).sub(p), ff, '余事象を答えた'),
      numCand(F(cnt, 12), ff, '全体を12通りとした'),
    ],
    fillers: [numCand(F(cnt + 1, 36), ff), numCand(F(cnt - 1, 36), ff), numCand(F(cnt + 2, 36), ff)],
    short: `目の出方は全部で {{6 × 6 = 36}} 通り。和が${cond}になるのは ${cnt}通り。\n{{${cnt} ÷ 36 = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`,
    steps: [
      '大小のサイコロは区別するので、目の出方は 6 × 6 = 36 通り(すべて同じ確からしさ)。',
      `和が${cond}になる組(大,小): ${pairs.join(' ')}${cnt > 12 ? ' …' : ''} → ${cnt}通り`,
      `確率 = {{${cnt}/36 = ${fracStr(p)}}}`,
    ],
    quick: [
      '和ごとの通り数は 2〜12 で 1,2,3,4,5,6,5,4,3,2,1 通り(7が最多の6通り)。この並びを覚えておくと表を書かずに済む。',
      atLeast ? `和が${s}以上 = 各和の通り数の合計 = ${cnt}通り。` : `和が${s}は ${cnt}通り。`,
    ],
    ko: `주사위 두 개(크고 작은 것 구별)의 경우의 수는 36가지. 합이 ${cond}인 경우 ${cnt}가지 → ${fracStr(p)}. (1,2)와 (2,1)은 다른 경우로 셉니다.`,
    tip: '2つのサイコロは必ず区別して36通りで考える。',
    params: { template: 'diceSum', s, atLeast },
    check: () => {
      let c = 0;
      for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (atLeast ? a + b >= s : a + b === s) c++;
      return F(c, 36);
    },
  };
}

function cardMultiple(rng: Rng): Draft | null {
  const N = rng.pick([20, 24, 30, 36, 40, 50, 60]);
  const k = rng.pick([3, 4, 6, 7, 8, 9]);
  const m = rng.pick([2, 3, 5]);
  if (k === m || k % m === 0 || m % k === 0) return null;
  const lcm = (k * m) / gcd(k, m);
  const ck = Math.floor(N / k);
  const cm = Math.floor(N / m);
  const cb = Math.floor(N / lcm);
  const cnt = ck + cm - cb;
  const p = F(cnt, N);
  return {
    question_ja: `1から${N}までの数字が1つずつ書かれた${N}枚のカードから1枚を引く。引いたカードの数が${k}の倍数または${m}の倍数である確率はいくらか。`,
    correct: { text: fracStr(p), value: p },
    wrong: [
      numCand(F(ck + cm, N), ff, '両方の倍数を2回数えた'),
      numCand(F(1, k).add(F(1, m)), ff, '1/k + 1/m とした'),
      numCand(F(1).sub(p), ff, '余事象を答えた'),
      numCand(F(cb, N), ff, '両方の倍数だけを数えた'),
    ],
    fillers: [numCand(F(cnt + 1, N), ff), numCand(F(cnt - 1, N), ff)],
    short: `${k}の倍数 ${ck}枚 + ${m}の倍数 ${cm}枚 − 両方(${lcm}の倍数) ${cb}枚 = ${cnt}枚。\n{{${cnt} ÷ ${N} = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`,
    steps: [
      `${k}の倍数: ${N} ÷ ${k} の整数部分 → ${ck}枚`,
      `${m}の倍数: ${N} ÷ ${m} の整数部分 → ${cm}枚`,
      `両方の倍数(${lcm}の倍数)は2回数えているので引く: ${cb}枚`,
      `{{${ck} + ${cm} − ${cb} = ${cnt}}}枚 → 確率 {{${cnt}/${N} = ${fracStr(p)}}}`,
    ],
    quick: ['「AまたはB」は集合の和。重なり(最小公倍数の倍数)を引くのを忘れない。', `確率が1/2を超えるかは、${cnt}が${N}の半分(${N / 2})より大きいかで判断できる。`],
    ko: `${k}의 배수 ${ck}장 + ${m}의 배수 ${cm}장 − 공배수(${lcm}의 배수) ${cb}장 = ${cnt}장. 확률 = ${cnt}/${N} = ${fracStr(p)}.`,
    tip: '「または」は足して重なりを引く。',
    params: { template: 'cardMultiple', N, k, m },
    check: () => {
      let c = 0;
      for (let i = 1; i <= N; i++) if (i % k === 0 || i % m === 0) c++;
      return F(c, N);
    },
  };
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function drawTwo(rng: Rng): Draft | null {
  const r = rng.int(2, 7);
  const w = rng.int(2, 7);
  const n = r + w;
  const mode = rng.pick(['bothRed', 'oneEach'] as const);
  const total = C(n, 2);
  const fav = mode === 'bothRed' ? C(r, 2) : r * w;
  const p = F(fav, total);
  const withRep = mode === 'bothRed' ? F(r * r, n * n) : F(2 * r * w, n * n);
  return {
    question_ja: `袋の中に赤玉が${r}個、白玉が${w}個入っている。この袋から同時に2個の玉を取り出すとき、${mode === 'bothRed' ? '2個とも赤玉' : '赤玉と白玉が1個ずつ'}である確率はいくらか。`,
    correct: { text: fracStr(p), value: p },
    wrong: [
      numCand(withRep, ff, '取り出した玉を戻す場合で計算した'),
      numCand(mode === 'bothRed' ? F(r, n) : F(r * w, n * n), ff, mode === 'bothRed' ? '1個目だけを考えた' : '2倍し忘れ・戻す場合'),
      numCand(mode === 'bothRed' ? F(C(r, 2), n * (n - 1)) : F(r * w, n * (n - 1)), ff, '順番を区別した数と区別しない数を混ぜた'),
      numCand(F(1).sub(p), ff, '余事象を答えた'),
    ],
    fillers: [numCand(F(fav + 1, total), ff), numCand(F(fav, total + 1), ff)],
    short:
      mode === 'bothRed'
        ? `全体 {{${n}C2 = ${total}}}通り、赤2個 {{${r}C2 = ${fav}}}通り。\n{{${fav} ÷ ${total} = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`
        : `全体 {{${n}C2 = ${total}}}通り、赤1白1 {{${r} × ${w} = ${fav}}}通り。\n{{${fav} ÷ ${total} = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`,
    steps: [
      `玉はすべて区別して考える。${n}個から2個を選ぶ組合せは {{${n}C2 = ${n} × ${n - 1} ÷ 2 = ${total}}}通り。`,
      mode === 'bothRed' ? `赤${r}個から2個: {{${r}C2 = ${fav}}}通り` : `赤${r}個から1個、白${w}個から1個: {{${r} × ${w} = ${fav}}}通り`,
      `確率 = {{${fav}/${total} = ${fracStr(p)}}}`,
    ],
    quick:
      mode === 'bothRed'
        ? [`1個ずつ順に取り出すと考えても同じ: {{${r}/${n} × ${r - 1}/${n - 1} = ${fracStr(p)}}}`, '2個目は1個減った状態から取るので、分母も分子も1減る。']
        : [`順に取り出すと「赤→白」と「白→赤」の2通りがある: {{${r}/${n} × ${w}/${n - 1} × 2 = ${fracStr(p)}}}`, '×2 を忘れると答えが半分になる。'],
    ko:
      mode === 'bothRed'
        ? `전체 ${n}C2 = ${total}가지, 빨강 2개 ${r}C2 = ${fav}가지 → ${fracStr(p)}. 하나씩 꺼낸다고 생각해도 ${r}/${n} × ${r - 1}/${n - 1} = ${fracStr(p)}.`
        : `전체 ${n}C2 = ${total}가지, 빨강1·흰색1 = ${r} × ${w} = ${fav}가지 → ${fracStr(p)}. 순서대로 꺼낸다면 "빨→흰", "흰→빨" 두 경우라 ×2가 필요합니다.`,
    tip: '「同時に取り出す」は「1個ずつ戻さずに取り出す」と同じ確率になる。',
    params: { template: 'drawTwo', r, w, mode },
    check: () => {
      // 玉に番号を付けて全ペアを数える
      const balls = [...Array(r).fill('R'), ...Array(w).fill('W')];
      let t = 0;
      let f = 0;
      for (let i = 0; i < n; i++)
        for (let j = i + 1; j < n; j++) {
          t++;
          const ok = mode === 'bothRed' ? balls[i] === 'R' && balls[j] === 'R' : balls[i] !== balls[j];
          if (ok) f++;
        }
      return F(f, t);
    },
  };
}

function atLeastOne(rng: Rng): Draft | null {
  const kind = rng.int(0, 2);
  if (kind === 0) {
    // サイコロ n 回、少なくとも1回 6
    const n = rng.int(2, 4);
    const p = F(1).sub(F(5 ** n, 6 ** n));
    return {
      question_ja: `1個のサイコロを${n}回投げるとき、少なくとも1回は6の目が出る確率はいくらか。`,
      correct: { text: fracStr(p), value: p },
      wrong: [
        numCand(F(n, 6), ff, '1/6 を回数分足した'),
        numCand(F(1, 6 ** n), ff, '毎回6が出る確率'),
        numCand(F(5 ** n, 6 ** n), ff, '1回も出ない確率(余事象)'),
        numCand(F(1).sub(F(1, 6 ** n)), ff, '余事象を取り違えた'),
      ],
      short: `「少なくとも1回」は「1回も出ない」の反対。\n{{1 − (5/6)×${Array(n - 1).fill('(5/6)').join('×')} = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`,
      steps: [
        `1回も6が出ない確率: 毎回 5/6 なので {{${Array(n).fill('5/6').join(' × ')} = ${fracStr(F(5 ** n, 6 ** n))}}}`,
        `少なくとも1回出る = 1 − 1回も出ない = {{1 − ${fracStr(F(5 ** n, 6 ** n))} = ${fracStr(p)}}}`,
      ],
      quick: [`1/6 を${n}回足して ${fracStr(F(n, 6))} とするのは誤り(重なりを数えすぎる)。「少なくとも」は余事象を使うのが最速。`],
      ko: `"적어도 한 번"은 "한 번도 안 나옴"의 반대. 한 번도 6이 안 나올 확률 (5/6)^${n} = ${fracStr(F(5 ** n, 6 ** n))}, 따라서 1 − ${fracStr(F(5 ** n, 6 ** n))} = ${fracStr(p)}.`,
      tip: '「少なくとも1回」= 1 −「1回もない」。',
      params: { template: 'dice6', n },
      check: () => {
        let t = 0;
        let f = 0;
        const rec = (k: number, has: boolean) => {
          if (k === n) {
            t++;
            if (has) f++;
            return;
          }
          for (let face = 1; face <= 6; face++) rec(k + 1, has || face === 6);
        };
        rec(0, false);
        return F(f, t);
      },
    };
  }
  if (kind === 1) {
    // コイン n 枚、ちょうど k 枚表
    const n = rng.int(3, 6);
    const k = rng.int(1, n - 1);
    const p = F(C(n, k), 2 ** n);
    return {
      question_ja: `${n}枚の硬貨を同時に投げるとき、ちょうど${k}枚が表になる確率はいくらか。`,
      correct: { text: fracStr(p), value: p },
      wrong: [
        numCand(F(1, n + 1), ff, '表の枚数(0〜n)を同じ確からしさとした'),
        numCand(F(1, 2 ** n), ff, '並び方を1通りとした'),
        numCand(F(k, n), ff, '枚数の割合とした'),
        numCand(F(C(n, k), 2 ** (n - 1)), ff, '全体を数え間違えた'),
      ],
      short: `表裏の出方は全部で ${2 ** n}通り。どの${k}枚が表かは {{${n}C${k} = ${C(n, k)}}}通り。\n{{${C(n, k)} ÷ ${2 ** n} = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`,
      steps: [
        `硬貨を区別すると、表裏の出方は全部で ${n}回2を掛けて {{${Array(n).fill('2').join(' × ')} = ${2 ** n}}}通り。`,
        `${n}枚のうちどの${k}枚が表になるか: {{${n}C${k} = ${C(n, k)}}}通り`,
        `{{${C(n, k)}/${2 ** n} = ${fracStr(p)}}}`,
      ],
      quick: ['「表の枚数」は0〜n枚の n+1 通りだが、同じ確からしさではない点に注意。', `${n}C${k} は ${n}C${n - k} と同じなので、小さい方で計算する。`],
      ko: `동전을 구별하면 전체 ${2 ** n}가지. 어느 ${k}개가 앞면인지 ${n}C${k} = ${C(n, k)}가지 → ${fracStr(p)}. "앞면 개수 0~${n}개"는 확률이 같지 않으므로 1/${n + 1}은 틀립니다.`,
      tip: 'ちょうどk回 = nCk ×(1回の確率の積)。',
      params: { template: 'coinsExact', n, k },
      check: () => {
        let f = 0;
        for (let m = 0; m < 2 ** n; m++) {
          let c = 0;
          for (let i = 0; i < n; i++) if (m & (1 << i)) c++;
          if (c === k) f++;
        }
        return F(f, 2 ** n);
      },
    };
  }
  // くじ: n 本中 a 本当たり、2人が順に引く(戻さない)、少なくとも1人当たり
  const n = rng.int(5, 12);
  const a = rng.int(1, Math.min(4, n - 2));
  const none = F((n - a) * (n - a - 1), n * (n - 1));
  const p = F(1).sub(none);
  return {
    question_ja: `${n}本のうち${a}本が当たりのくじがある。AとBがこの順に1本ずつ引く(引いたくじは戻さない)。少なくとも1人が当たる確率はいくらか。`,
    correct: { text: fracStr(p), value: p },
    wrong: [
      numCand(F(2 * a, n), ff, 'それぞれの確率を足した'),
      numCand(F(1).sub(F((n - a) * (n - a), n * n)), ff, 'くじを戻す場合で計算した'),
      numCand(none, ff, '2人ともはずれる確率(余事象)'),
      numCand(F(a * (a - 1), n * (n - 1)), ff, '2人とも当たる確率'),
    ],
    fillers: [numCand(F(a, n), ff)],
    short: `2人ともはずれる確率は {{${n - a}/${n} × ${n - a - 1}/${n - 1} = ${fracStr(none)}}}。\n{{1 − ${fracStr(none)} = ${fracStr(p)}}}\n答えは ${fracStr(p)}。`,
    steps: [
      `A がはずれる確率 ${n - a}/${n}。残りは${n - 1}本ではずれは${n - a - 1}本なので、続いて B もはずれる確率は ${n - a - 1}/${n - 1}。`,
      `2人ともはずれ: {{${n - a}/${n} × ${n - a - 1}/${n - 1} = ${fracStr(none)}}}`,
      `少なくとも1人当たり: {{1 − ${fracStr(none)} = ${fracStr(p)}}}`,
    ],
    quick: ['「少なくとも」は余事象。2人の確率をそのまま足すと「2人とも当たり」を2回数えてしまう。'],
    ko: `둘 다 꽝일 확률 = ${n - a}/${n} × ${n - a - 1}/${n - 1} = ${fracStr(none)}. 적어도 한 명 당첨 = 1 − ${fracStr(none)} = ${fracStr(p)}. 뽑은 제비는 돌려놓지 않으므로 분모가 하나 줄어듭니다.`,
    tip: '戻さない場合は、2回目の分母・分子が1ずつ減る。',
    params: { template: 'lottery', n, a },
    check: () => {
      let t = 0;
      let f = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          t++;
          if (i < a || j < a) f++;
        }
      return F(f, t);
    },
  };
}

export function genKakuritsu(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return rng.chance(0.6) ? diceSum(rng) : cardMultiple(rng);
  if (diff === 2) return drawTwo(rng);
  return atLeastOne(rng);
}
