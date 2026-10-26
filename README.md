# SPI・玉手箱 練習帳

SPI と 玉手箱・SHL系検査(玉手箱Ⅲ・GAB・IMAGES を想定)の 4択練習問題アプリ。
スマホ縦画面向け。サーバー・アカウント・有料APIなし、静的ファイルだけで動く PWA。

- 計算系 11分野は **パラメータ生成器** で毎回新しい数値の問題を作る(難易度3段階)。答え・誤答・解説の数値はすべてコードで計算(分数の厳密計算。浮動小数点は使わない)。
- 言語・推論系 9分野は **オリジナル問題(JSON)**。二重に見直した問題だけを出題する。
- 問題はすべて「正解1つの4択」に作り直した練習用で、実際の検査の形式とは異なる場合がある。

## 開発

```bash
npm install
npm run dev          # 開発サーバー
npm test             # 生成器(各型×難易度 3000回)・問題JSON・推論の総当たり・記録ロジックのテスト
GEN_N=10000 npm test # 生成器の試行回数を増やす
npm run build        # dist/ に PWA 版(オフライン用 sw.js 付き)
npm run build:single # dist-single/index.html に1ファイル版(オフラインキャッシュなし)
node scripts/e2e.cjs "iPhone 13" <保存先>  # vite preview を 4173 番で起動してから。スマホ画面で主要な流れを確認
```

## 問題を増やす(JSON)

`src/data/bank/` に `.json` ファイル(問題の配列)を置き、`npm run build` し直すと読み込まれる。
形式が正しくない問題は読み込まず、「このアプリについて」画面に ID が表示される。`npm test` でも検査される。

```json
{
  "id": "goi-013",
  "exam": "SPI",
  "test_name": "SPI3",
  "category": "語句の意味",
  "difficulty": 2,
  "passage_ja": "(長文がある場合だけ)",
  "question_ja": "次の意味を表す語として、最も適切なものを選びなさい。\n「…」",
  "choices": ["正解", "誤答1", "誤答2", "誤答3"],
  "answer": "正解",
  "explanation_short_ja": "要点の解説(日本語2〜4行)",
  "explanation_detail_ja": ["手順1", "手順2"],
  "explanation_ko": "한국어 보충 해설",
  "tip": "コツ",
  "reviewed": true
}
```

- `category` は分野名(`src/data/catalog.ts` の `name`)。`exam` は分野と一致させる。
- `choices` は4つ・重複なし。`answer` は `choices` のどれかと完全に一致する文字列。表示時に順番は入れ替わる。
- `reviewed: false` の問題は読み込むが出題しない(検証済みの数にも入れない)。
- 推論の問題を追加するときは `tests/bank.test.ts` に総当たりの検証を追加する(答えが1つに決まることを確かめるため)。

## 構成

| 場所 | 内容 |
| --- | --- |
| `src/core/` | 分数クラス `Frac`、シード付き乱数、表示用の書式 |
| `src/gen/` | 分野ごとの生成器と共通処理(誤答の重複除去・選択肢のシャッフル・別ルートの答え合わせ) |
| `src/data/catalog.ts` | 分野一覧・想定検査名・練習用制限時間・形式の注記 |
| `src/data/examInfo.ts` | 実際の試験情報(出典URL・確認日。確認できないものは「未確認」) |
| `src/data/bank/*.json` | 直接作成の問題 |
| `src/store/` | 記録・復習リスト・統計・保存(IndexedDB、使えなければ localStorage)・書き出し/取り込み |
| `src/ui/` | 画面 |
| `tests/` | 生成器の検査(独立した BigInt 有理数の式評価器で解説の式も検算)、問題JSONの検査、推論の総当たり、記録ロジック |

## 公開(スマホで使う)

`npm run build` でできた `dist/` を、HTTPS の静的ホスティング(GitHub Pages、Netlify、Cloudflare Pages など)にそのまま置く。
`base: './'` なのでサブディレクトリでも動く。初回に開いたあとはオフラインでも使え、ホーム画面に追加できる。
