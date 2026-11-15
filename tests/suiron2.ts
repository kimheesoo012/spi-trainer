// 追加した推論問題(suiron-011〜032)の総当たり検証。条件を満たす世界をすべて作り、各選択肢が「どの世界でも成り立つか」を調べる。
type W = Record<string, number>;
export interface Puzzle {
  worlds: W[];
  claims: Record<string, (w: W) => boolean>;
}

const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const worldsOf = (names: string[], vals: number[]) => perms(vals).map((p) => Object.fromEntries(names.map((n, i) => [n, p[i]])) as W);

const AI = ['アもイも正しい', 'アは正しいが、イは正しいとは限らない', 'イは正しいが、アは正しいとは限らない', 'アもイも正しいとは限らない'];
function aiClaims(ws: W[], a: (w: W) => boolean, b: (w: W) => boolean): Puzzle['claims'] {
  const A = ws.every(a);
  const Bc = ws.every(b);
  return { [AI[0]]: () => A && Bc, [AI[1]]: () => A && !Bc, [AI[2]]: () => !A && Bc, [AI[3]]: () => !A && !Bc };
}

export const P2: Record<string, () => Puzzle> = {
  'suiron-011': () => ({
    // 値 = 着順
    worlds: worldsOf(['A', 'B', 'C', 'D'], [1, 2, 3, 4]).filter((o) => o.A < o.B && o.C < o.A && o.D > o.B),
    claims: { Bは3着だった: (o) => o.B === 3, Aは1着だった: (o) => o.A === 1, Dは3着だった: (o) => o.D === 3, CはBのすぐ前にゴールした: (o) => o.C === o.B - 1 },
  }),
  'suiron-012': () => {
    // 値が大きいほど年上
    const ws = worldsOf(['P', 'Q', 'R', 'S'], [1, 2, 3, 4]).filter((o) => o.P > o.Q && o.R > o.S && o.Q > o.S);
    return { worlds: ws, claims: aiClaims(ws, (o) => o.P === 4, (o) => o.S === 1) };
  },
  'suiron-013': () => ({
    // 値 = 前から何番目か
    worlds: worldsOf(['P', 'Q', 'R', 'S', 'T'], [1, 2, 3, 4, 5]).filter((o) => o.Q === o.P + 2 && o.R === o.S + 1 && o.T !== 1),
    claims: { TはPのすぐ後ろにいる: (o) => o.T === o.P + 1, Pは先頭にいる: (o) => o.P === 1, Rはいちばん後ろにいる: (o) => o.R === 5, QはSより前にいる: (o) => o.Q < o.S },
  }),
  'suiron-014': () => {
    // 値 = 席の番号 0..5(円形)
    const adj = (x: number, y: number) => [1, 5].includes((x - y + 6) % 6);
    const opp = (x: number, y: number) => (x - y + 6) % 6 === 3;
    return {
      worlds: worldsOf(['A', 'B', 'C', 'D', 'E', 'F'], [0, 1, 2, 3, 4, 5]).filter((o) => opp(o.A, o.D) && adj(o.B, o.C) && !adj(o.E, o.A)),
      claims: {
        EはDの隣に座っている: (o) => adj(o.E, o.D),
        Fの真向かいにBが座っている: (o) => opp(o.F, o.B),
        BはAの隣に座っている: (o) => adj(o.B, o.A),
        CとFは隣り合って座っている: (o) => adj(o.C, o.F),
      },
    };
  },
  'suiron-015': () => ({
    // 値 = 左から何番目か
    worlds: worldsOf(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5, 6]).filter((o) => o.A === o.B + 2 && Math.abs(o.C - o.D) === 3 && o.E !== 1 && o.E !== 6),
    claims: {
      Fは端の席に座っている: (o) => o.F === 1 || o.F === 6,
      Eは左から2番目の席に座っている: (o) => o.E === 2,
      AとEは隣り合って座っている: (o) => Math.abs(o.A - o.E) === 1,
      Aは右端の席に座っている: (o) => o.A === 6,
    },
  }),
  'suiron-016': () => {
    const ws: W[] = [];
    for (let r = 1; r <= 9; r++) for (let b = 1; b <= 9; b++) for (let y = 1; y <= 9; y++) if (r + b + y === 9 && r === b + 3) ws.push({ r, b, y });
    return {
      worlds: ws,
      claims: { 赤は4本以上買った: (o) => o.r >= 4, 黄は青より多く買った: (o) => o.y > o.b, 青は1本だけ買った: (o) => o.b === 1, 赤と黄の本数は同じである: (o) => o.r === o.y },
    };
  },
  'suiron-017': () => {
    const ws: W[] = [];
    for (let p = 1; p <= 9; p++) for (let o = 1; o <= 9; o++) if (100 * p + 150 * o === 900) ws.push({ p, o });
    return { worlds: ws, claims: aiClaims(ws, (w) => w.p > w.o, (w) => w.p + w.o >= 7) };
  },
  'suiron-018': () => {
    // 4人の総当たり 6試合。P=0, Q=1, R=2, S=3
    const games: [number, number][] = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) games.push([i, j]);
    const ws: W[] = [];
    for (let m = 0; m < 64; m++) {
      const win = [0, 0, 0, 0];
      const beat = new Set<string>();
      games.forEach(([i, j], k) => {
        const [x, y] = (m >> k) & 1 ? [i, j] : [j, i];
        win[x]++;
        beat.add(`${x}${y}`);
      });
      if (win[0] === 2 && beat.has('10') && win[3] === 0) ws.push({ P: win[0], Q: win[1], R: win[2], S: win[3], PR: +beat.has('02'), RQ: +beat.has('21') });
    }
    return { worlds: ws, claims: { PはRに勝った: (o) => o.PR === 1, Qは3勝した: (o) => o.Q === 3, Rは1勝2敗だった: (o) => o.R === 1, QはRに負けた: (o) => o.RQ === 1 } };
  },
  'suiron-019': () => {
    // 5チームの総当たり 10試合。A=0 … E=4
    const games: [number, number][] = [];
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) games.push([i, j]);
    const ws: W[] = [];
    for (let m = 0; m < 1024; m++) {
      const win = [0, 0, 0, 0, 0];
      const beat = new Set<string>();
      games.forEach(([i, j], k) => {
        const [x, y] = (m >> k) & 1 ? [i, j] : [j, i];
        win[x]++;
        beat.add(`${x}${y}`);
      });
      if (win[0] === 4 && win[4] === 0 && beat.has('12') && win[3] === 2) ws.push({ B: win[1], C: win[2], D: win[3], CD: +beat.has('23'), same: +(new Set(win).size < 5) });
    }
    return { worlds: ws, claims: { Bは2勝以上した: (o) => o.B >= 2, CはDに勝った: (o) => o.CD === 1, Bは3勝1敗だった: (o) => o.B === 3, 勝ち数が同じチームがある: (o) => o.same === 1 } };
  },
  'suiron-020': () => {
    // x = 忘れた人(0=A … 3=D)。うそはちょうど1人
    const ws: W[] = [0, 1, 2, 3]
      .map((x) => {
        const a = x === 1;
        const b = x === 3;
        const c = x !== 2;
        const d = !b;
        return { x, a: +a, b: +b, c: +c, d: +d };
      })
      .filter((w) => w.a + w.b + w.c + w.d === 3);
    return {
      worlds: ws,
      claims: { 宿題を忘れたのはBである: (w) => w.x === 1, 宿題を忘れたのはDである: (w) => w.x === 3, うそをついているのはAである: (w) => w.a === 0, Dはうそをついている: (w) => w.d === 0 },
    };
  },
  'suiron-021': () => {
    // 色: 0=赤, 1=白, 2=青。本当はちょうど1人
    const ws = worldsOf(['P', 'Q', 'R'], [0, 1, 2]).filter((o) => +(o.P !== 0) + +(o.Q === 2) + +(o.P === 1) === 1);
    return {
      worlds: ws,
      claims: { Pの帽子は白ではない: (o) => o.P !== 1, Rの帽子は白である: (o) => o.R === 1, Qの帽子は青である: (o) => o.Q === 2, Pの帽子は青である: (o) => o.P === 2 },
    };
  },
  'suiron-022': () => {
    const ws: W[] = [];
    for (let p = 0; p <= 100; p++) for (let q = 0; q <= 100; q++) for (let r = 0; r <= 100; r++) if (p + q + r === 72 * 3 && p + q === 68 * 2) ws.push({ p, q, r });
    return { worlds: ws, claims: aiClaims(ws, (w) => w.r === 80, (w) => w.p < w.r || w.q < w.r) };
  },
  'suiron-023': () => {
    const all = 60 * 40;
    const m = 55 * 24;
    const fN = 40 - 24;
    const f = all - m;
    // 平均は小数になるので10倍した整数で比べる
    const w: W = { f, m, favg10: (f * 10) / fN, mavg10: 550 };
    return {
      worlds: Number.isInteger(w.favg10) ? [w] : [],
      claims: {
        '女性の平均点は67.5点である': (o) => o.favg10 === 675,
        女性の平均点は65点である: (o) => o.favg10 === 650,
        女性の合計点は男性の合計点より高い: (o) => o.f > o.m,
        女性の平均点は男性の平均点より10点高い: (o) => o.favg10 - o.mavg10 === 100,
      },
    };
  },
  'suiron-024': () => {
    // k = Q市の面積(P市は k/2、R市は k)
    const ws: W[] = [2, 4, 10, 36, 250].map((k) => ({ p: 300 * (k / 2), q: 150 * k, r: 200 * k, areaPR2: k + 2 * k })); // areaPR2 = (k/2 + k) × 2
    return {
      worlds: ws,
      claims: {
        P市とQ市の人口は等しい: (o) => o.p === o.q,
        '3つの市のうち、R市の人口が最も少ない': (o) => o.r < o.p && o.r < o.q,
        Q市の人口はR市の人口より多い: (o) => o.q > o.r,
        P市とR市を合わせた地域の人口密度は250人である: (o) => (o.p + o.r) * 2 === 250 * o.areaPR2,
      },
    };
  },
  'suiron-025': () => {
    // w = Xの重さ。食塩は100倍した値で持つ(濃度% × 重さ)
    const ws: W[] = [100, 150, 240, 1000].map((w) => ({ w, sx: 10 * w, sy: 5 * w, sz: 8 * 2 * w, wz: 2 * w }));
    // 濃度 c% になる ⇔ 食塩(100倍値)× 10 = c×10 × 重さ
    const conc = (salt: number, weight: number, c10: number) => salt * 10 === c10 * weight;
    return {
      worlds: ws,
      claims: {
        'XとYをすべて混ぜると、濃度は7.5%になる': (o) => conc(o.sx + o.sy, o.w + o.w, 75),
        'XとZをすべて混ぜると、濃度は9%になる': (o) => conc(o.sx + o.sz, o.w + o.wz, 90),
        'YとZをすべて混ぜると、濃度は6.5%になる': (o) => conc(o.sy + o.sz, o.w + o.wz, 65),
        'X、Y、Zをすべて混ぜると、濃度は8%になる': (o) => conc(o.sx + o.sy + o.sz, o.w + o.w + o.wz, 80),
      },
    };
  },
  'suiron-026': () => {
    const ws: W[] = [];
    for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) if (a + b + c === 15 && c === 8) ws.push({ a, b, c });
    return {
      worlds: ws,
      claims: {
        '3枚の中に奇数のカードはちょうど1枚ある': (o) => [o.a, o.b, o.c].filter((x) => x % 2 === 1).length === 1,
        真ん中の大きさの数は5である: (o) => o.b === 5,
        最も小さい数は1である: (o) => o.a === 1,
        真ん中の大きさの数は偶数である: (o) => o.b % 2 === 0,
      },
    };
  },
  'suiron-027': () => {
    // 曜日: 1=月, 3=水, 5=金。仕事: 0=レジ, 1=品出し, 2=清掃
    const ws: W[] = [];
    for (const d of perms([1, 3, 5]))
      for (const j of perms([0, 1, 2])) {
        const [Ad, Bd, Cd] = d;
        const [Aj, Bj, Cj] = j;
        const regiDay = [Ad, Bd, Cd][[Aj, Bj, Cj].indexOf(0)];
        const shinaDay = [Ad, Bd, Cd][[Aj, Bj, Cj].indexOf(1)];
        if (Ad !== 1 && regiDay === 3 && Bj === 2 && Cd !== 5) ws.push({ Ad, Bd, Cd, Aj, Bj, Cj, shinaDay });
      }
    return {
      worlds: ws,
      claims: { Bは水曜日には働かない: (o) => o.Bd !== 3, Cは月曜日に働く: (o) => o.Cd === 1, Aの担当はレジである: (o) => o.Aj === 0, 品出しの担当者は金曜日に働く: (o) => o.shinaDay === 5 },
    };
  },
  'suiron-028': () => ({
    // 値 = 着順
    worlds: worldsOf(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5, 6]).filter((o) => o.A < o.B && o.C === o.D + 1 && o.F === o.E + 3 && o.B !== 6),
    claims: { BはFより先にゴールした: (o) => o.B < o.F, Fは6着だった: (o) => o.F === 6, Dは1着だった: (o) => o.D === 1, AはEより先にゴールした: (o) => o.A < o.E },
  }),
  'suiron-029': () => {
    // k = 犬と猫の両方を飼っている人数
    const ws: W[] = [];
    for (let k = 0; k <= 9; k++) {
      const neither = 30 - (12 + 9 - k);
      if (neither >= 0) ws.push({ k, neither });
    }
    return { worlds: ws, claims: aiClaims(ws, (w) => w.neither >= 9, (w) => w.k >= 3) };
  },
  'suiron-030': () => {
    // 1回戦 A対B、C対D → 勝者どうしの決勝。A=0 … D=3
    const ws: W[] = [];
    for (const w1 of [0, 1])
      for (const w2 of [2, 3])
        for (const champ of [w1, w2]) {
          const win = [0, 0, 0, 0];
          win[w1]++;
          win[w2]++;
          win[champ]++;
          if (win[0] === 1 && win[3] === 0) ws.push({ w1, w2, champ, B: win[1] });
        }
    return {
      worlds: ws,
      claims: {
        優勝したのはCである: (o) => o.champ === 2,
        Bは1回だけ勝った: (o) => o.B === 1,
        決勝戦でAはCに勝った: (o) => o.w1 === 0 && o.w2 === 2 && o.champ === 0,
        決勝戦はA対Dだった: (o) => o.w1 === 0 && o.w2 === 3,
      },
    };
  },
  'suiron-031': () => {
    // n = 赤い玉の個数。「XならばY」は (Xでない) または Y
    const ws: W[] = Array.from({ length: 31 }, (_, n) => ({ n }));
    const a = (o: W) => o.n >= 5;
    const i = (o: W) => o.n === 7;
    const u = (o: W) => o.n >= 3;
    return {
      worlds: ws,
      claims: {
        'イが正しければ、ウも必ず正しい': (o) => !i(o) || u(o),
        'アが正しければ、イも必ず正しい': (o) => !a(o) || i(o),
        'ウが正しければ、アも必ず正しい': (o) => !u(o) || a(o),
        'ウが正しければ、イも必ず正しい': (o) => !u(o) || i(o),
      },
    };
  },
  'suiron-032': () => {
    const ws: W[] = [];
    for (let p = 1; p <= 60; p++) for (let q = 1; q <= 60; q++) ws.push({ p, q });
    const a = (o: W) => o.p === 2 * o.q;
    const i = (o: W) => o.p > o.q;
    const u = (o: W) => Math.abs(o.p - o.q) === o.q;
    return {
      worlds: ws,
      claims: {
        'ウが正しければ、アも必ず正しい': (o) => !u(o) || a(o),
        'イが正しければ、アも必ず正しい': (o) => !i(o) || a(o),
        'イが正しければ、ウも必ず正しい': (o) => !i(o) || u(o),
        'アが正しくなければ、イも必ず正しくない': (o) => a(o) || !i(o),
      },
    };
  },
};
