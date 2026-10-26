// 実際の試験情報。確認できたものだけ出典URLと確認日を付ける。
// 公式に確認できなかったものは status: 'unconfirmed'(画面では「未確認」)。
// 確認方法: 2026-10-26、作成環境から公式ページ本文へ直接アクセスできなかったため、
// 公式ドメインに限定したWeb検索の結果(該当ページの要約)で内容を確認した。

export interface InfoLine {
  label: string;
  text: string;
  status: 'confirmed' | 'unconfirmed';
  source?: string;
  checked?: string;
}

export interface ExamInfo {
  id: string;
  title: string;
  lines: InfoLine[];
}

const CHECKED = '2026-10-26';
const SPI_CHARGE = 'https://www.spi.recruit.co.jp/spi3/charge/charge.html';
const SPI_TC_FAQ = 'https://www.spi.recruit.co.jp/testcenter/faq.html';
const SHL_TAMA = 'https://www.shl.co.jp/service/assessment/tamatebako3/';
const SHL_GAB = 'https://www.shl.co.jp/service/assessment/gab/';
const SHL_IMAGES = 'https://www.shl.co.jp/service/assessment/images/';

export const CHECK_METHOD =
  '確認方法: 公式ドメインに限定したWeb検索で該当ページの内容を確認(作成環境から公式ページ本文を直接開くことはできなかった)。';

export const EXAM_INFO: Record<string, ExamInfo> = {
  spi: {
    id: 'spi',
    title: 'SPI3(リクルートマネジメントソリューションズ)',
    lines: [
      {
        label: '実際の時間',
        text: 'SPI3-U(性格+基礎能力)はテストセンター・WEBテスティング・インハウスCBTいずれも約65分(性格検査を含む合計)。能力検査だけの時間は方式で異なる。',
        status: 'confirmed',
        source: SPI_CHARGE,
        checked: CHECKED,
      },
      {
        label: '電卓(テストセンター)',
        text: 'テストセンターでは検査中の計算機(電卓)の使用は認められない。',
        status: 'confirmed',
        source: SPI_TC_FAQ,
        checked: CHECKED,
      },
      {
        label: '電卓(WEBテスティング・自宅受検)',
        text: '公式の記載を確認できず(未確認)。受検案内の注意事項で確認すること。',
        status: 'unconfirmed',
      },
      {
        label: '電卓(ペーパーテスティング)',
        text: '公式の記載を確認できず(未確認)。',
        status: 'unconfirmed',
      },
      {
        label: '1分野あたりの問題数・時間',
        text: 'SPIは受検者ごとに出題が変わる方式で、分野別の問題数・時間は公開情報で確認できず(未確認)。',
        status: 'unconfirmed',
      },
    ],
  },
  tamatebako3: {
    id: 'tamatebako3',
    title: '玉手箱Ⅲ(日本エス・エイチ・エル)',
    lines: [
      {
        label: '実際の時間',
        text: '言語・計数・英語・パーソナリティで合計約49分。言語・計数・英語はそれぞれ約10分。Webで実施。',
        status: 'confirmed',
        source: SHL_TAMA,
        checked: CHECKED,
      },
      {
        label: '計数の形式',
        text: '公式説明は「簡単な四則演算を組み合わせた等式中の未知数を求める」形式(=四則逆算)。',
        status: 'confirmed',
        source: SHL_TAMA,
        checked: CHECKED,
      },
      {
        label: '電卓',
        text: '公式の記載を確認できず(未確認)。',
        status: 'unconfirmed',
      },
      {
        label: '問題数',
        text: '四則逆算の問題数・1問あたりの時間は公式に確認できず(未確認)。',
        status: 'unconfirmed',
      },
    ],
  },
  gab: {
    id: 'gab',
    title: 'GAB(日本エス・エイチ・エル)',
    lines: [
      {
        label: '実際の時間',
        text: '言語・計数・英語・パーソナリティで合計80〜90分。',
        status: 'confirmed',
        source: SHL_GAB,
        checked: CHECKED,
      },
      {
        label: '言語の形式',
        text: '400〜800字程度の主張のある文章を読み、書き手の論理をどこまで正しく理解しているかを測る。',
        status: 'confirmed',
        source: SHL_GAB,
        checked: CHECKED,
      },
      {
        label: '計数の形式',
        text: '図表を理解する能力と、四則演算・百分率計算を正確に速く行う能力を測る(図表理解)。',
        status: 'confirmed',
        source: SHL_GAB,
        checked: CHECKED,
      },
      {
        label: '解答形式',
        text: '言語の「A 正しい / B 誤り / C 判断できない」の3択形式は対策書で広く知られるが、公式ページでは確認できず(未確認)。',
        status: 'unconfirmed',
      },
      {
        label: '電卓',
        text: '公式の記載を確認できず(未確認)。',
        status: 'unconfirmed',
      },
    ],
  },
  images: {
    id: 'images',
    title: 'IMAGES(日本エス・エイチ・エル)',
    lines: [
      {
        label: '実際の時間',
        text: '言語・計数・英語はそれぞれ10分、パーソナリティを含め合計60分。紙(マークシート)で実施。',
        status: 'confirmed',
        source: SHL_IMAGES,
        checked: CHECKED,
      },
      {
        label: '言語の形式',
        text: '1000文字程度のエッセイを読み、筆者の訴えたい趣旨を判断する。',
        status: 'confirmed',
        source: SHL_IMAGES,
        checked: CHECKED,
      },
      {
        label: '電卓',
        text: '公式の記載を確認できず(未確認)。',
        status: 'unconfirmed',
      },
    ],
  },
  hyoKuuran: {
    id: 'hyoKuuran',
    title: '「表の空欄推測」(玉手箱の計数として知られる形式)',
    lines: [
      {
        label: '公式の位置づけ',
        text: 'SHL公式ページでは、この形式の科目名・時間・問題数を確認できず(未確認)。対策書・対策サイトで「玉手箱の計数」として扱われている形式の類似練習。',
        status: 'unconfirmed',
      },
      {
        label: '電卓',
        text: '公式の記載を確認できず(未確認)。',
        status: 'unconfirmed',
      },
    ],
  },
};
