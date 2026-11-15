// 追加した推論問題(suiron-033〜044)の総当たり検証。
import type { Puzzle } from './suiron2';

type W = Record<string, number>;
const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const worldsOf = (names: string[], vals: number[]) => perms(vals).map((p) => Object.fromEntries(names.map((n, i) => [n, p[i]])) as W);

const AI = ['アもイも正しい', 'アは正しいが、イは正しいとは限らない', 'イは正しいが、アは正しいとは限らない', 'アもイも正しいとは限らない'];
function aiClaims(ws: W[], a: (w: W) => boolean, b: (w: W) => boolean): Puzzle['claims'] {
  const A = ws.every(a);
  const Bc = ws.every(b);
  return { [AI[0]]: () => A && Bc, [AI[1]]: () => A && !Bc, [AI[2]]: () => !A && Bc, [AI[3]]: () => !A && !Bc };
}

export const P3: Record<string, () => Puzzle> = {
  'suiron-033': () => {
    // Q = 10k とおく(P = 1.5Q = 15k、R = 0.8P = 12k)
    const ws: W[] = [1, 2, 7, 30, 125].map((k) => ({ q: 10 * k, p: 15 * k, r: 12 * k }));
    return {
      worlds: ws.filter((o) => o.p * 2 === o.q * 3 && o.r * 5 === o.p * 4),
      claims: {
        'Rの売上は、Qの売上より多い': (o) => o.r > o.q,
        '3つの店の中で、Rの売上が最も少ない': (o) => o.r < o.p && o.r < o.q,
        'PとRの売上の合計は、Qの売上の3倍である': (o) => o.p + o.r === 3 * o.q,
        'RとQの売上の差は、PとRの売上の差より大きい': (o) => Math.abs(o.r - o.q) > Math.abs(o.p - o.r),
      },
    };
  },
  'suiron-034': () => {
    // 駅 = 0、東をプラス
    const eki = 0;
    const gakko = eki + 300;
    const tosho = gakko - 500;
    const koen = tosho + 100;
    return {
      worlds: [{ eki, gakko, tosho, koen }],
      claims: {
        '公園は、駅から西へ100mのところにある': (o) => o.koen === o.eki - 100,
        '図書館は、駅から東へ200mのところにある': (o) => o.tosho === o.eki + 200,
        学校と公園の間の距離は300mである: (o) => Math.abs(o.gakko - o.koen) === 300,
        '駅は、図書館と公園の間にある': (o) => (o.eki - o.tosho) * (o.eki - o.koen) < 0,
      },
    };
  },
  'suiron-035': () => {
    const ws: W[] = [];
    for (let x = 1; x <= 12; x++) for (let y = 1; y <= 12; y++) for (let z = 1; z <= 12; z++) for (let w = 1; w <= 12; w++) if (x + y === z + w && x > z) ws.push({ x, y, z, w });
    return {
      worlds: ws,
      claims: { YはWより軽い: (o) => o.y < o.w, XはWより重い: (o) => o.x > o.w, '4つの中でXが最も重い': (o) => o.x > o.y && o.x > o.z && o.x > o.w, YはZより軽い: (o) => o.y < o.z },
    };
  },
  'suiron-036': () => {
    // n = 社員数(割合がすべて整数人になる数)
    const ws: W[] = [100, 500, 1200].map((n) => {
      const m = (n * 60) / 100;
      const f = n - m;
      return { n, m, f, mb: (m * 30) / 100, fb: (f * 50) / 100 };
    });
    return {
      worlds: ws.filter((o) => [o.m, o.f, o.mb, o.fb].every(Number.isInteger)),
      claims: {
        '自転車で通勤している社員は、男性より女性のほうが多い': (o) => o.fb > o.mb,
        '自転車で通勤している社員は、社員全体の40%である': (o) => (o.mb + o.fb) * 100 === 40 * o.n,
        '自転車で通勤していない社員は、男性より女性のほうが多い': (o) => o.f - o.fb > o.m - o.mb,
        '自転車で通勤している男性は、社員全体の30%である': (o) => o.mb * 100 === 30 * o.n,
      },
    };
  },
  'suiron-037': () => {
    // 4つの区分の人数(英語だけ・数学だけ・両方・どちらでもない)をすべて試す
    const ws: W[] = [];
    for (let both = 0; both <= 20; both++) {
      const eOnly = 25 - both;
      const mOnly = 20 - both;
      const neither = 40 - eOnly - mOnly - both;
      if (eOnly >= 0 && mOnly >= 0 && neither >= 0) ws.push({ both, neither });
    }
    return { worlds: ws, claims: aiClaims(ws, (w) => w.both >= 5, (w) => w.neither <= 15) };
  },
  'suiron-038': () => {
    const ws: W[] = [];
    for (let p = 1; p <= 58; p++) for (let q = 1; q <= 58; q++) for (let r = 1; r <= 58; r++) if (p + q + r === 60 && p === q + 4 && r > p && r > q && r <= 25) ws.push({ p, q, r });
    return {
      worlds: ws,
      claims: { PとRの年齢の差は4歳以下である: (o) => Math.abs(o.p - o.r) <= 4, Rは24歳である: (o) => o.r === 24, Qは16歳である: (o) => o.q === 16, RはQより8歳年上である: (o) => o.r === o.q + 8 },
    };
  },
  'suiron-039': () => ({
    // 値 = 2回目の順位。1回目は A1, B2, C3, D4
    worlds: worldsOf(['A', 'B', 'C', 'D'], [1, 2, 3, 4]).filter((o) => o.A !== 1 && o.B !== 2 && o.C !== 3 && o.D !== 4 && o.A === 1 + 2 && o.B !== 1),
    claims: { Bは4位だった: (o) => o.B === 4, Cは1位だった: (o) => o.C === 1, Dは2位だった: (o) => o.D === 2, CはDより順位が上だった: (o) => o.C < o.D },
  }),
  'suiron-040': () => {
    // 月=0 … 土=5 の出勤(1)・休み(0)をすべて試す
    const ws: W[] = [];
    for (let m = 0; m < 64; m++) {
      const d = [0, 1, 2, 3, 4, 5].map((i) => (m >> i) & 1);
      const count = d.reduce((a, b) => a + b, 0);
      const consecutive = d.some((x, i) => i > 0 && x === 1 && d[i - 1] === 1);
      if (count === 3 && !consecutive && d[2] === 0) ws.push({ mon: d[0], tue: d[1], thu: d[3], fri: d[4], sat: d[5] });
    }
    return {
      worlds: ws,
      claims: { 木曜日は出勤した: (o) => o.thu === 1, 月曜日は出勤した: (o) => o.mon === 1, 金曜日は出勤した: (o) => o.fri === 1, 火曜日は出勤しなかった: (o) => o.tue === 0 },
    };
  },
  'suiron-041': () => {
    // 値 = 順位。うそはちょうど1人
    const ws = worldsOf(['A', 'B', 'C', 'D'], [1, 2, 3, 4])
      .map((o) => ({ ...o, a: +(o.A !== 1), b: +(o.B < o.C), c: +(o.A === 1), d: +(o.D === 1) }))
      .filter((o) => o.a + o.b + o.c + o.d === 3);
    return {
      worlds: ws,
      claims: { うそをついているのはCである: (o) => o.c === 0, Cは4位だった: (o) => o.C === 4, Aは2位だった: (o) => o.A === 2, Bは2位だった: (o) => o.B === 2 },
    };
  },
  'suiron-042': () => {
    const ws: W[] = [];
    for (let p = 0; p <= 10; p++) for (let q = 0; q <= 10; q++) for (let r = 0; r <= 10; r++) if (p + q + r === 24 && p > q && p > r && q === r + 2) ws.push({ p, q, r });
    return {
      worlds: ws,
      claims: { Pは10点だった: (o) => o.p === 10, Qは7点だった: (o) => o.q === 7, Rは5点だった: (o) => o.r === 5, PとRの点数の差は3点だった: (o) => o.p - o.r === 3 },
    };
  },
  'suiron-043': () => ({
    // 0=野球, 1=サッカー, 2=テニス
    worlds: worldsOf(['P', 'Q', 'R'], [0, 1, 2]).filter((o) => o.P !== 1 && o.Q !== 0),
    claims: {
      'Pがテニス部ならば、Qはサッカー部である': (o) => o.P !== 2 || o.Q === 1,
      Rはサッカー部である: (o) => o.R === 1,
      Qはテニス部である: (o) => o.Q === 2,
      Pは野球部である: (o) => o.P === 0,
    },
  }),
  'suiron-044': () => {
    const ws: W[] = [];
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === 9) ws.push({ a, b });
    return {
      worlds: ws,
      claims: {
        '2つの目の積は偶数である': (o) => (o.a * o.b) % 2 === 0,
        どちらかの目は6である: (o) => o.a === 6 || o.b === 6,
        '2つの目の差は1である': (o) => Math.abs(o.a - o.b) === 1,
        どちらかの目は3である: (o) => o.a === 3 || o.b === 3,
      },
    };
  },
};
