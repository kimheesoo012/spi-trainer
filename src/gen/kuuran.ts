import { F, Frac } from '../core/frac';
import { num } from '../core/format';
import type { Rng } from '../core/rng';
import type { Difficulty } from '../core/types';
import { numCand, type Draft } from './framework';
import { fInt } from './fmt';

// 表の空欄推測(玉手箱の計数として知られる形式の類似練習)。
// 表の各行は同じ一次式に従う。既知の行から係数が1通りに決まり、全行と矛盾しないことを check() で確かめる。

/** 連立一次方程式を有理数のガウス消去で解く。解が1つに決まらなければ null */
export function solveUnique(A: Frac[][], b: Frac[]): Frac[] | null {
  const n = A[0].length;
  const M = A.map((r, i) => [...r, b[i]]);
  let row = 0;
  const piv: number[] = [];
  for (let col = 0; col < n; col++) {
    let p = -1;
    for (let r = row; r < M.length; r++) if (!M[r][col].eq(0)) p = p < 0 ? r : p;
    if (p < 0) return null; // 階数不足 → 一意でない
    [M[row], M[p]] = [M[p], M[row]];
    const pv = M[row][col];
    M[row] = M[row].map((x) => x.div(pv));
    for (let r = 0; r < M.length; r++) {
      if (r === row || M[r][col].eq(0)) continue;
      const f = M[r][col];
      M[r] = M[r].map((x, k) => x.sub(f.mul(M[row][k])));
    }
    piv.push(col);
    row++;
  }
  // 余った行は 0 = 0 でなければ矛盾
  for (let r = row; r < M.length; r++) if (!M[r][n].eq(0)) return null;
  return piv.map((_, i) => M[i][n]);
}

const fy = fInt('円');

function linear1(rng: Rng): Draft | null {
  const a = 10 * rng.int(30, 90); // 基本料金
  const b = 10 * rng.int(5, 30); // 1kgあたり
  const xs = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 10, 12]).slice(0, 4);
  const qi = rng.int(0, 3);
  const ys = xs.map((x) => a + b * x);
  const xq = xs[qi];
  const known = xs.map((x, i) => [x, ys[i]] as const).filter((_, i) => i !== qi);
  const [p1, p2] = known.slice().sort((u, v) => u[0] - v[0]);
  const ans = F(ys[qi]);
  return {
    question_ja: `ある宅配便の料金は、荷物の重さに応じて一定の規則で決まる(料金 = 基本料金 + 1kgあたりの料金 × 重さ)。表の空欄(?)に当てはまる料金はいくらか。`,
    table: {
      caption: '重さと料金',
      headers: ['重さ', '料金'],
      rows: xs.map((x, i) => [`${x}kg`, i === qi ? '?' : `${num(ys[i])}円`]),
    },
    correct: { text: `${num(ans)}円`, value: ans },
    wrong: [
      numCand(F(p1[1] * xq, p1[0]), fy, '料金が重さに比例するとした'),
      numCand(F(b * xq), fy, '基本料金を忘れた'),
      numCand(F(a + b * (xq - 1)), fy, '1kg分ずれた'),
      numCand(F(p2[1] * xq, p2[0]), fy, '料金が重さに比例するとした'),
    ],
    fillers: [numCand(ans.add(b), fy), numCand(ans.sub(b), fy), numCand(ans.add(2 * b), fy)],
    short: `2つの行の差から1kgあたりの料金を出す: {{(${num(p2[1])} − ${num(p1[1])}) ÷ (${p2[0]} − ${p1[0]}) = ${b}}}円。\n基本料金 {{${num(p1[1])} − ${b} × ${p1[0]} = ${a}}}円 → {{${a} + ${b} × ${xq} = ${num(ans)}}}\n答えは ${num(ans)}円。`,
    steps: [
      `${p1[0]}kgと${p2[0]}kgの料金の差 {{${num(p2[1])} − ${num(p1[1])} = ${num(p2[1] - p1[1])}}}円は、${p2[0] - p1[0]}kg分の料金。`,
      `1kgあたり {{${num(p2[1] - p1[1])} ÷ ${p2[0] - p1[0]} = ${b}}}円`,
      `基本料金: {{${num(p1[1])} − ${b} × ${p1[0]} = ${a}}}円`,
      `${xq}kg: {{${a} + ${b} × ${xq} = ${num(ans)}}}円 (残りの行でも同じ規則になることを確かめる)`,
    ],
    quick: [
      `空欄の重さ ${xq}kg に一番近い行から、差の分だけ足し引きする。`,
      `例: ${p1[0]}kg → ${xq}kg は ${xq - p1[0]}kg の差なので {{${num(p1[1])} + ${b} × (${xq} − ${p1[0]}) = ${num(ans)}}}`,
      '比例(重さが2倍なら料金も2倍)と決めつけると、基本料金の分だけずれる。',
    ],
    ko: `두 행의 차이로 1kg당 요금: (${num(p2[1])} − ${num(p1[1])}) ÷ (${p2[0]} − ${p1[0]}) = ${b}엔. 기본요금 = ${num(p1[1])} − ${b} × ${p1[0]} = ${a}엔. 따라서 ${xq}kg은 ${a} + ${b} × ${xq} = ${num(ans)}엔. 단순 비례로 계산하면 기본요금만큼 틀립니다.`,
    tip: '「差」を取ると定数(基本料金)が消えて、1単位あたりの値が出る。',
    params: { template: 'linear1', a, b, xs, qi },
    check: () => {
      const sol = solveUnique(
        known.map(([x]) => [F(1), F(x)]),
        known.map(([, y]) => F(y)),
      );
      return sol ? sol[0].add(sol[1].mul(xq)) : F(-1);
    },
  };
}

function linear2(rng: Rng): Draft | null {
  const a = 100 * rng.int(8, 25); // 大人
  const b = 100 * rng.int(3, 12); // 子ども
  if (a <= b) return null;
  const rows = Array.from({ length: 4 }, () => [rng.int(1, 6), rng.int(0, 6)]);
  const keys = new Set(rows.map((r) => r.join(',')));
  if (keys.size < 4) return null;
  const qi = rng.int(0, 3);
  const ys = rows.map(([x1, x2]) => a * x1 + b * x2);
  const known = rows.map((r, i) => ({ r, y: ys[i] })).filter((_, i) => i !== qi);
  const sol = solveUnique(
    known.map(({ r }) => [F(r[0]), F(r[1])]),
    known.map(({ y }) => F(y)),
  );
  if (!sol) return null; // 既知の行から一意に決まらない表は使わない
  // 解き方の説明に使う2行を探す(子どもの人数が違う2行の差から子ども料金を出す)
  const [xq1, xq2] = rows[qi];
  const ans = F(ys[qi]);
  const k0 = known[0];
  const avg = F(k0.y, k0.r[0] + k0.r[1]);
  // 説明用: 大人の人数をそろえるため、2行の一次結合を作る
  let pair: [typeof k0, typeof k0] | null = null;
  for (const u of known) for (const v of known) if (u !== v && u.r[0] === v.r[0] && u.r[1] !== v.r[1]) pair = [u, v];
  return {
    question_ja: `ある施設の入場料は、大人1人あたり・子ども1人あたりの料金がそれぞれ一定で、合計金額は人数に応じて決まる。表の空欄(?)に当てはまる合計金額はいくらか。`,
    table: {
      caption: '人数と入場料の合計',
      headers: ['大人', '子ども', '合計'],
      rows: rows.map((r, i) => [`${r[0]}人`, `${r[1]}人`, i === qi ? '?' : `${num(ys[i])}円`]),
    },
    correct: { text: `${num(ans)}円`, value: ans },
    wrong: [
      numCand(F(b * xq1 + a * xq2), fy, '大人と子どもの料金を取り違えた'),
      numCand(avg.mul(xq1 + xq2), fy, '1人あたりの平均で計算した'),
      numCand(F(a * xq1), fy, '子どもの料金を忘れた'),
      numCand(F(a * (xq1 + xq2)), fy, '全員を大人料金にした'),
    ],
    fillers: [numCand(ans.add(b), fy), numCand(ans.sub(b), fy), numCand(ans.add(a), fy)],
    short: `表から大人 ${num(a)}円、子ども ${num(b)}円 と決まる。\n{{${num(a)} × ${xq1} + ${num(b)} × ${xq2} = ${num(ans)}}}\n答えは ${num(ans)}円。`,
    steps: [
      pair
        ? `大人の人数が同じ2行(大人${pair[0].r[0]}人)を比べる: 子ども${Math.abs(pair[0].r[1] - pair[1].r[1])}人の差で {{${num(Math.max(pair[0].y, pair[1].y))} − ${num(Math.min(pair[0].y, pair[1].y))} = ${num(Math.abs(pair[0].y - pair[1].y))}}}円、{{${num(Math.abs(pair[0].y - pair[1].y))} ÷ ${Math.abs(pair[0].r[1] - pair[1].r[1])} = ${num(b)}}} → 子ども1人 ${num(b)}円`
        : `大人1人を x 円、子ども1人を y 円として、2つの行から連立方程式を立てる(1行目: ${k0.r[0]}x + ${k0.r[1]}y = ${num(k0.y)})。`,
      `連立方程式を解くと 大人 ${num(a)}円、子ども ${num(b)}円。`,
      `残りの行でも合うことを確認: ${known.map(({ r, y }) => `{{${num(a)} × ${r[0]} + ${num(b)} × ${r[1]} = ${num(y)}}}`).join('、')}`,
      `空欄: {{${num(a)} × ${xq1} + ${num(b)} × ${xq2} = ${num(ans)}}}円`,
    ],
    quick: [
      '子ども0人の行があれば、そこから大人1人の料金がすぐ分かる。人数が1人だけ違う行の組を探すのが速い。',
      '選択肢が絞れないときは、1つの行で決めた料金が他の行にも合うか必ず確かめる。',
    ],
    ko: `표에서 어른 ${num(a)}엔, 어린이 ${num(b)}엔으로 정해집니다(인원이 하나만 다른 두 행을 비교하면 빠름). 빈칸 = ${num(a)} × ${xq1} + ${num(b)} × ${xq2} = ${num(ans)}엔.`,
    tip: '1か所だけ条件が違う2行を比べると、その1つの単価が出る。',
    params: { template: 'linear2', a, b, rows, qi },
    check: () => (sol ? sol[0].mul(xq1).add(sol[1].mul(xq2)) : F(-1)),
  };
}

function linear3(rng: Rng): Draft | null {
  const c = 10 * rng.int(50, 150); // 基本料金
  const a = rng.int(20, 40); // 昼間 1kWhあたり
  const b = rng.int(8, 19); // 夜間 1kWhあたり
  const rows = Array.from({ length: 5 }, () => [10 * rng.int(5, 30), 10 * rng.int(3, 25)]);
  if (new Set(rows.map((r) => r.join(','))).size < 5) return null;
  const qi = rng.int(0, 4);
  const ys = rows.map(([x1, x2]) => c + a * x1 + b * x2);
  const known = rows.map((r, i) => ({ r, y: ys[i] })).filter((_, i) => i !== qi);
  const sol = solveUnique(
    known.map(({ r }) => [F(1), F(r[0]), F(r[1])]),
    known.map(({ y }) => F(y)),
  );
  if (!sol) return null;
  const [xq1, xq2] = rows[qi];
  const ans = F(ys[qi]);
  return {
    question_ja: `ある電力会社の月の電気料金は「基本料金 + 昼間の使用量 × 昼間単価 + 夜間の使用量 × 夜間単価」で計算される(基本料金と単価は一定)。表の空欄(?)に当てはまる料金はいくらか。`,
    table: {
      caption: '使用量と電気料金',
      headers: ['昼間(kWh)', '夜間(kWh)', '料金'],
      rows: rows.map((r, i) => [`${r[0]}`, `${r[1]}`, i === qi ? '?' : `${num(ys[i])}円`]),
    },
    correct: { text: `${num(ans)}円`, value: ans },
    wrong: [
      numCand(F(a * xq1 + b * xq2), fy, '基本料金を忘れた'),
      numCand(F(c + b * xq1 + a * xq2), fy, '昼と夜の単価を取り違えた'),
      numCand(F(c + a * (xq1 + xq2)), fy, '夜間も昼間単価にした'),
      numCand(F(2 * c + a * xq1 + b * xq2), fy, '基本料金を2回足した'),
    ],
    fillers: [numCand(ans.add(10 * b), fy), numCand(ans.sub(10 * a), fy), numCand(ans.add(10 * a), fy)],
    short: `表の行の差から単価と基本料金を求める: 基本料金 ${num(c)}円、昼間 ${a}円/kWh、夜間 ${b}円/kWh。\n{{${num(c)} + ${a} × ${xq1} + ${b} × ${xq2} = ${num(ans)}}}\n答えは ${num(ans)}円。`,
    steps: [
      '基本料金をC、昼間単価をa、夜間単価をbとすると、各行は C + a × 昼間 + b × 夜間 = 料金。',
      `2つの行の差を取ると C が消え、a と b だけの式になる(例: 1行目と2行目の差)。これを2組作って a と b を求める。`,
      `解くと a = ${a}、b = ${b}、C = ${num(c)}。`,
      `全行で確認: ${known.map(({ r, y }) => `{{${num(c)} + ${a} × ${r[0]} + ${b} × ${r[1]} = ${num(y)}}}`).join('、')}`,
      `空欄: {{${num(c)} + ${a} × ${xq1} + ${b} × ${xq2} = ${num(ans)}}}円`,
    ],
    quick: [
      '使用量の一方だけが違う2行があれば、その差 ÷ 使用量の差 で単価が1つ出る。',
      `時間がないときは、空欄の行に近い行との差だけで計算する: 昼 ${xq1}kWh・夜 ${xq2}kWh。`,
      '基本料金を忘れた選択肢(単価の部分だけ)がわなになりやすい。',
    ],
    ko: `행끼리 차이를 구하면 기본요금이 사라져 단가를 구할 수 있습니다. 기본요금 ${num(c)}엔, 낮 ${a}엔/kWh, 밤 ${b}엔/kWh. 빈칸 = ${num(c)} + ${a} × ${xq1} + ${b} × ${xq2} = ${num(ans)}엔.`,
    tip: '定数がある一次式は、行の「差」を取って定数を消す。',
    params: { template: 'linear3', a, b, c, rows, qi },
    check: () => (sol ? sol[0].add(sol[1].mul(xq1)).add(sol[2].mul(xq2)) : F(-1)),
  };
}

export function genKuuran(rng: Rng, diff: Difficulty): Draft | null {
  if (diff === 1) return linear1(rng);
  if (diff === 2) return linear2(rng);
  return linear3(rng);
}
