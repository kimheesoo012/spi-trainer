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

/** 2元連立一次方程式 a1x + b1y = c1, a2x + b2y = c2 を加減法で解く手順(文章)。解は呼び出し側で分かっている */
function elimSteps(xName: string, yName: string, eq: [number, number, number][], x: number, y: number): string[] {
  const [[a1, b1, c1], [a2, b2, c2]] = eq;
  const coef = (k: number) => (Math.abs(k) === 1 ? '' : num(Math.abs(k)));
  // 「30a − 70b = 1,310」のように符号をつなぐ
  const line = (a: number, b: number, c: number) => {
    let t = a === 0 ? '' : `${a < 0 ? '−' : ''}${coef(a)}${xName}`;
    if (b !== 0) t += t ? ` ${b < 0 ? '−' : '+'} ${coef(b)}${yName}` : `${b < 0 ? '−' : ''}${coef(b)}${yName}`;
    return `${t} = ${num(c)}`;
  };
  const gcd = (u: number, v: number): number => (v ? gcd(v, u % v) : Math.abs(u));
  // y の係数の絶対値をそろえる倍率(最小に約分)
  const g = gcd(b1, b2) || 1;
  const m1 = Math.abs(b2) / g;
  const m2 = Math.abs(b1) / g;
  const sameSign = b1 * b2 > 0; // 同符号なら引く、異符号なら足す
  const op = sameSign ? '−' : '+';
  let A = sameSign ? a1 * m1 - a2 * m2 : a1 * m1 + a2 * m2;
  let Cc = sameSign ? c1 * m1 - c2 * m2 : c1 * m1 + c2 * m2;
  const mul = (m: number) => (m === 1 ? '' : `×${num(m)}`);
  const out = [`式①: ${line(a1, b1, c1)}　式②: ${line(a2, b2, c2)}`];
  // 係数が負にならない向きで引く
  let how: string;
  if (sameSign && A < 0) {
    A = -A;
    Cc = -Cc;
    how = `②${mul(m2)} − ①${mul(m1)} → ${xName} の係数 {{${num(a2)} × ${m2} − ${num(a1)} × ${m1} = ${num(A)}}}、右辺 {{${num(c2)} × ${m2} − ${num(c1)} × ${m1} = ${num(Cc)}}}`;
  } else {
    how = `①${mul(m1)} ${op} ②${mul(m2)} → ${xName} の係数 {{${num(a1)} × ${m1} ${op} ${num(a2)} × ${m2} = ${num(A)}}}、右辺 {{${num(c1)} × ${m1} ${op} ${num(c2)} × ${m2} = ${num(Cc)}}}`;
    if (A < 0) {
      A = -A;
      Cc = -Cc;
      how += `(両辺に −1 を掛けて ${num(A)}${xName} = ${num(Cc)})`;
    }
  }
  out.push(`${yName} の係数をそろえて消す: ${how}`);
  out.push(`${num(A)}${xName} = ${num(Cc)} → ${xName} = {{${num(Cc)} ÷ ${num(A)} = ${num(x)}}}`);
  const [ba, bb, bc, label] = b1 !== 0 ? [a1, b1, c1, '①'] : [a2, b2, c2, '②'];
  const div = (k: number) => (k === 1 ? '' : ` ÷ ${num(k)}`);
  out.push(
    bb > 0
      ? `${label}に戻して ${yName} = {{(${num(bc)} − ${num(ba)} × ${num(x)})${div(bb)} = ${num(y)}}}`
      : `${label}に戻して ${yName} = {{(${num(ba)} × ${num(x)} − ${num(bc)})${div(-bb)} = ${num(y)}}}`,
  );
  return out;
}


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
      xq > p1[0]
        ? `例: ${xq}kg は ${p1[0]}kg より ${xq - p1[0]}kg 重いので {{${num(p1[1])} + ${b} × ${xq - p1[0]} = ${num(ans)}}}`
        : `例: ${xq}kg は ${p1[0]}kg より ${p1[0] - xq}kg 軽いので {{${num(p1[1])} − ${b} × ${p1[0] - xq} = ${num(ans)}}}`,
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
  if (known[0].r[0] * known[1].r[1] - known[1].r[0] * known[0].r[1] === 0) return null; // 説明に使う2行が比例していると消去法で示せない
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
      ...(pair
        ? [
            `大人の人数が同じ2行(大人${pair[0].r[0]}人)を比べる。違いは子ども${Math.abs(pair[0].r[1] - pair[1].r[1])}人分なので、合計の差 {{${num(Math.max(pair[0].y, pair[1].y))} − ${num(Math.min(pair[0].y, pair[1].y))} = ${num(Math.abs(pair[0].y - pair[1].y))}}}円 が子ども${Math.abs(pair[0].r[1] - pair[1].r[1])}人分。`,
            `子ども1人: {{${num(Math.abs(pair[0].y - pair[1].y))} ÷ ${Math.abs(pair[0].r[1] - pair[1].r[1])} = ${num(b)}}}円`,
            `その行から大人1人: {{(${num(pair[0].y)} − ${num(b)} × ${pair[0].r[1]}) ÷ ${pair[0].r[0]} = ${num(a)}}}円`,
          ]
        : [
            `大人1人を x 円、子ども1人を y 円とし、2つの行から連立方程式を立てる。`,
            ...elimSteps('x', 'y', [[k0.r[0], k0.r[1], k0.y], [known[1].r[0], known[1].r[1], known[1].y]], a, b),
            `よって 大人 ${num(a)}円、子ども ${num(b)}円。`,
          ]),
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
  {
    const d1 = [known[1].r[0] - known[0].r[0], known[1].r[1] - known[0].r[1]];
    const d2 = [known[2].r[0] - known[0].r[0], known[2].r[1] - known[0].r[1]];
    if (d1[0] * d2[1] - d2[0] * d1[1] === 0) return null; // 説明に使う差の2式が比例していると消去法で示せない
  }
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
      `2つの行の差を取ると C が消える。行②−行①: {{${num(known[1].y)} − ${num(known[0].y)} = ${num(known[1].y - known[0].y)}}} = a × (${known[1].r[0]} − ${known[0].r[0]}) + b × (${known[1].r[1]} − ${known[0].r[1]})`,
      `行③−行①: {{${num(known[2].y)} − ${num(known[0].y)} = ${num(known[2].y - known[0].y)}}} = a × (${known[2].r[0]} − ${known[0].r[0]}) + b × (${known[2].r[1]} − ${known[0].r[1]})`,
      ...elimSteps(
        'a',
        'b',
        [
          [known[1].r[0] - known[0].r[0], known[1].r[1] - known[0].r[1], known[1].y - known[0].y],
          [known[2].r[0] - known[0].r[0], known[2].r[1] - known[0].r[1], known[2].y - known[0].y],
        ],
        a,
        b,
      ),
      `行①に戻して基本料金 C = {{${num(known[0].y)} − ${a} × ${known[0].r[0]} − ${b} × ${known[0].r[1]} = ${num(c)}}}円`,
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
