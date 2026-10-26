import { describe, expect, it } from 'vitest';
import { BANK, bankQuestion, loadBank, validateBankItem } from '../src/data/bank';
import { TYPES } from '../src/data/catalog';

const HANGUL = /[ㄱ-ㆎ가-힣]/;

describe('問題JSONの形式', () => {
  it('すべての問題が形式チェックを通る', () => {
    expect(BANK.rejected).toEqual([]);
  });
  it('直接作成の分野はどれも10問以上(検証済み)', () => {
    for (const t of TYPES.filter((x) => x.kind === 'bank')) {
      const n = BANK.items.filter((i) => i.typeId === t.id && i.reviewed).length;
      expect(n, t.name).toBeGreaterThanOrEqual(10);
    }
  });
  it('選択肢は4つ・重複なし・正解は選択肢の1つ', () => {
    for (const i of BANK.items) {
      expect(i.choices.length, i.id).toBe(4);
      expect(new Set(i.choices).size, i.id).toBe(4);
      expect(i.choices.filter((c) => c === i.answer).length, i.id).toBe(1);
    }
  });
  it('問題文・選択肢・要点の解説は日本語だけ(韓国語は解説の補足欄のみ)', () => {
    for (const i of BANK.items) {
      for (const s of [i.question_ja, i.passage_ja ?? '', ...i.choices, i.explanation_short_ja, i.tip])
        expect(HANGUL.test(s), `${i.id}: ${s.slice(0, 30)}`).toBe(false);
      expect(HANGUL.test(i.explanation_ko), i.id).toBe(true);
    }
  });
  it('シャッフル後も正解の位置が正しい', () => {
    for (const i of BANK.items) {
      for (let s = 1; s < 20; s++) {
        const q = bankQuestion(i, s);
        expect(q.choices[q.answer]).toBe(i.answer);
      }
    }
  });
  it('不正な問題は読み込まずに拒否する', () => {
    const bad = loadBank({
      'x.json': [
        { id: 'a', exam: 'SPI', test_name: 'SPI3', category: '語句の意味', difficulty: 1, question_ja: 'q', choices: ['1', '2', '3'], answer: '1', explanation_short_ja: 's', explanation_detail_ja: ['d'], explanation_ko: 'k', tip: 't', reviewed: true },
        { id: 'b', exam: 'SPI', test_name: 'SPI3', category: '語句の意味', difficulty: 1, question_ja: 'q', choices: ['1', '2', '3', '4'], answer: '5', explanation_short_ja: 's', explanation_detail_ja: ['d'], explanation_ko: 'k', tip: 't', reviewed: true },
        { id: 'c', exam: 'SPI', test_name: 'SPI3', category: '語句の意味', difficulty: 1, question_ja: 'q', choices: ['1', '2', '3', '4'], answer: '1', explanation_short_ja: 's', explanation_ko: 'k', tip: 't', reviewed: true },
        { id: 'd', exam: 'SHL', test_name: 'x', category: '語句の意味', difficulty: 1, question_ja: 'q', choices: ['1', '2', '3', '4'], answer: '1', explanation_short_ja: 's', explanation_detail_ja: 'd', explanation_ko: 'k', tip: 't', reviewed: true },
      ],
    });
    expect(bad.items).toEqual([]);
    expect(bad.rejected.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(validateBankItem(null)).not.toEqual([]);
  });
});

// ---- 推論: 条件を満たす並びをすべて数え上げ、「確実にいえる」選択肢が正解の1つだけであることを確かめる
type W = Record<string, number>;
const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const worldsOf = (names: string[], vals: number[]) => perms(vals).map((p) => Object.fromEntries(names.map((n, i) => [n, p[i]])) as W);

interface Puzzle {
  worlds: W[];
  /** 選択肢の文字列 → その世界で成り立つか */
  claims: Record<string, (w: W) => boolean>;
}

const AI = ['アもイも正しい', 'アは正しいが、イは正しいとは限らない', 'イは正しいが、アは正しいとは限らない', 'アもイも正しいとは限らない'];
function aiClaims(ws: W[], a: (w: W) => boolean, b: (w: W) => boolean): Puzzle['claims'] {
  const A = ws.every(a);
  const Bc = ws.every(b);
  return { [AI[0]]: () => A && Bc, [AI[1]]: () => A && !Bc, [AI[2]]: () => !A && Bc, [AI[3]]: () => !A && !Bc };
}

const P: Record<string, () => Puzzle> = {
  'suiron-001': () => ({
    // 値 = 着順
    worlds: worldsOf(['P', 'Q', 'R', 'S', 'T'], [1, 2, 3, 4, 5]).filter((o) => o.P < o.R && o.Q === o.P - 1 && o.S > o.T && o.T === 3),
    claims: { Qは1着だった: (o) => o.Q === 1, Rは4着だった: (o) => o.R === 4, SはRより先にゴールした: (o) => o.S < o.R, Pは3着だった: (o) => o.P === 3 },
  }),
  'suiron-002': () => ({
    worlds: worldsOf(['A', 'B', 'C', 'D', 'E'], [1, 2, 3, 4, 5]).filter((o) => Math.abs(o.A - o.B) === 1 && o.C > o.D && (o.E === 1 || o.E === 5) && o.B === 3 && o.D !== 1),
    claims: { Cは5軒目に住んでいる: (o) => o.C === 5, Aは2軒目に住んでいる: (o) => o.A === 2, DはAより西に住んでいる: (o) => o.D < o.A, Eは5軒目に住んでいる: (o) => o.E === 5 },
  }),
  'suiron-003': () => {
    // 割った人 X(0=A,1=B,2=C)。発言の真偽を数える
    const ws: W[] = [0, 1, 2]
      .map((x) => {
        const a = x !== 0;
        const b = x === 2;
        const c = !b;
        return { x, a: +a, b: +b, c: +c };
      })
      .filter((w) => w.a + w.b + w.c === 1);
    return { worlds: ws, claims: { Aが割った: (w) => w.x === 0, Bが割った: (w) => w.x === 1, Cが割った: (w) => w.x === 2, Bは本当のことを言っている: (w) => w.b === 1 } };
  },
  'suiron-004': () => {
    const ws: W[] = [];
    for (let r = 0; r <= 12; r++) for (let w = 0; w <= 12; w++) for (let b = 0; b <= 12; b++) if (r + w + b === 12 && r > w && w > b && b >= 2) ws.push({ r, w, b });
    return {
      worlds: ws,
      claims: { 赤の玉は5個以上ある: (o) => o.r >= 5, 白の玉は4個ある: (o) => o.w === 4, 青の玉は2個である: (o) => o.b === 2, 赤と白の個数の差は2個以上ある: (o) => o.r - o.w >= 2 },
    };
  },
  'suiron-005': () => {
    // 6試合の勝敗をすべて試す
    const T = ['A', 'B', 'C', 'D'];
    const games: [number, number][] = [];
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) games.push([i, j]);
    const ws: W[] = [];
    for (let m = 0; m < 64; m++) {
      const win = [0, 0, 0, 0];
      const beat = new Set<string>();
      games.forEach(([i, j], k) => {
        const [x, y] = (m >> k) & 1 ? [i, j] : [j, i];
        win[x]++;
        beat.add(T[x] + T[y]);
      });
      if (win[0] === 3 && beat.has('BC') && beat.has('DB') && new Set(win).size === 4) ws.push({ A: win[0], B: win[1], C: win[2], D: win[3], CD: +beat.has('CD') });
    }
    return { worlds: ws, claims: { Cは1勝もしていない: (o) => o.C === 0, Bは2勝した: (o) => o.B === 2, CはDに勝った: (o) => o.CD === 1, Dは1勝だけした: (o) => o.D === 1 } };
  },
  'suiron-006': () => ({
    // 値が大きいほど年上
    worlds: worldsOf(['A', 'B', 'C', 'D', 'E'], [1, 2, 3, 4, 5]).filter((o) => o.A > o.B && o.C > o.D && o.C < o.E && o.B > o.D && o.E !== 5),
    claims: { Dが最も年下である: (o) => o.D === 1, Eは2番目に年上である: (o) => o.E === 4, CはBより年上である: (o) => o.C > o.B, Aは2番目に年上である: (o) => o.A === 4 },
  }),
  'suiron-007': () => ({
    worlds: worldsOf(['P', 'Q', 'R', 'S', 'T'], [1, 2, 3, 4, 5]).filter((o) => o.P < o.Q && o.R === 3 && o.S === o.T + 1 && o.Q !== 5),
    claims: { Sは金曜日に当番をした: (o) => o.S === 5, Pは火曜日に当番をした: (o) => o.P === 2, Tは月曜日に当番をした: (o) => o.T === 1, Qは木曜日に当番をした: (o) => o.Q === 4 },
  }),
  'suiron-008': () => {
    const ws = worldsOf(['P', 'Q', 'R'], [1, 2, 3]).filter((o) => o.P > o.Q && o.R < o.P);
    return { worlds: ws, claims: aiClaims(ws, (o) => o.P === 3, (o) => o.Q > o.R) };
  },
  'suiron-009': () => {
    // 部屋 0..5 = 101,102,103,201,202,203
    const fl = (r: number) => (r < 3 ? 1 : 2);
    const ws = worldsOf(['A', 'B', 'C', 'D', 'E', 'F'], [0, 1, 2, 3, 4, 5]).filter(
      (o) => o.B === o.A + 3 && fl(o.C) === 1 && fl(o.D) === fl(o.E) && Math.abs(o.D - o.E) === 1 && o.F === 1,
    );
    const neighbors = (r: number) => [r - 1, r + 1].filter((x) => x >= 0 && x <= 5 && fl(x) === fl(r));
    return {
      worlds: ws,
      claims: {
        '202にはDかEが住んでいる': (o) => o.D === 4 || o.E === 4,
        Aは101に住んでいる: (o) => o.A === 0,
        Dは203に住んでいる: (o) => o.D === 5,
        Bの隣の部屋にはCが住んでいる: (o) => neighbors(o.B).includes(o.C),
      },
    };
  },
  'suiron-010': () => {
    const ws: W[] = [];
    for (let x = 1; x <= 10; x++) for (let y = 1; y <= 10; y++) for (let z = 1; z <= 10; z++) if (x + y + z === 10 && new Set([x, y, z]).size === 3 && x === 2 * y && z > y) ws.push({ x, y, z });
    return { worlds: ws, claims: aiClaims(ws, (o) => o.z > o.x && o.z > o.y, (o) => o.x + o.y === 3) };
  },
};

describe('推論の問題は答えが1つに決まる(総当たり)', () => {
  const items = BANK.items.filter((i) => i.typeId === 'suiron');
  it('すべての推論問題に検証用の総当たりがある', () => {
    expect(items.map((i) => i.id).sort()).toEqual(Object.keys(P).sort());
  });
  for (const it0 of items) {
    it(it0.id, () => {
      const pz = P[it0.id]();
      expect(pz.worlds.length, '条件を満たす並びがない').toBeGreaterThan(0);
      expect(Object.keys(pz.claims).sort()).toEqual([...it0.choices].sort());
      const certain = it0.choices.filter((c) => pz.worlds.every(pz.claims[c]));
      expect(certain).toEqual([it0.answer]);
    });
  }
});
