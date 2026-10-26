import type { Exam } from '../core/types';

export interface TypeDef {
  id: string;
  exam: Exam;
  section: string;
  name: string;
  name_ko: string;
  kind: 'gen' | 'bank';
  /** 問題データに入れる検査名 */
  test_name: string;
  /** どの検査を想定した練習か。公式の出題形式そのものではないことを明示する */
  testNote: string;
  /** 元の解答形式と、このアプリでの変更点 */
  formatNote?: string;
  /** アプリ独自の練習用制限時間(1問あたり秒) */
  practiceSec: number;
  infoId: string;
  /** 1問ごとの制限時間モードを出すか */
  perQuestion?: boolean;
}

export const TYPES: TypeDef[] = [
  // ---- SPI 非言語
  { id: 'wariai', exam: 'SPI', section: '非言語', name: '割合', name_ko: '비율', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 60, infoId: 'spi' },
  { id: 'soneki', exam: 'SPI', section: '非言語', name: '損益算', name_ko: '손익 계산', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 60, infoId: 'spi' },
  { id: 'hayasa', exam: 'SPI', section: '非言語', name: '速さ', name_ko: '속력', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 75, infoId: 'spi' },
  { id: 'shigoto', exam: 'SPI', section: '非言語', name: '仕事算', name_ko: '일률(일 계산)', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 75, infoId: 'spi' },
  { id: 'shugo', exam: 'SPI', section: '非言語', name: '集合', name_ko: '집합', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 75, infoId: 'spi' },
  { id: 'kakuritsu', exam: 'SPI', section: '非言語', name: '確率', name_ko: '확률', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 75, infoId: 'spi' },
  { id: 'baai', exam: 'SPI', section: '非言語', name: '場合の数', name_ko: '경우의 수', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 75, infoId: 'spi' },
  { id: 'suiron', exam: 'SPI', section: '非言語', name: '推論', name_ko: '추론', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題(オリジナル)', practiceSec: 90, infoId: 'spi' },
  { id: 'shiryo', exam: 'SPI', section: '非言語', name: '資料解釈', name_ko: '자료 해석', kind: 'gen', test_name: 'SPI3', testNote: 'SPI3 非言語の類似練習問題', practiceSec: 75, infoId: 'spi' },
  // ---- SPI 言語
  { id: 'goi', exam: 'SPI', section: '言語', name: '語句の意味', name_ko: '어휘의 의미', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 言語の類似練習問題(オリジナル)', practiceSec: 25, infoId: 'spi' },
  { id: 'nigo', exam: 'SPI', section: '言語', name: '二語の関係', name_ko: '두 단어의 관계', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 言語の類似練習問題(オリジナル)', practiceSec: 25, infoId: 'spi', formatNote: 'SPIでは複数の組を選ぶ形式もあるが、このアプリでは1つだけ選ぶ4択に変えている。' },
  { id: 'yoho', exam: 'SPI', section: '言語', name: '語句の用法', name_ko: '어구의 용법', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 言語の類似練習問題(オリジナル)', practiceSec: 35, infoId: 'spi' },
  { id: 'kuran', exam: 'SPI', section: '言語', name: '空欄補充', name_ko: '빈칸 채우기', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 言語の類似練習問題(オリジナル)', practiceSec: 45, infoId: 'spi' },
  { id: 'narabe', exam: 'SPI', section: '言語', name: '文の並べ替え', name_ko: '문장 배열', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 言語の類似練習問題(オリジナル)', practiceSec: 60, infoId: 'spi', formatNote: 'SPIでは並べ替えた順番の「何番目」を答える形式もあるが、このアプリでは並び順全体を選ぶ4択にしている。' },
  { id: 'chobun', exam: 'SPI', section: '言語', name: '長文読解', name_ko: '장문 독해', kind: 'bank', test_name: 'SPI3', testNote: 'SPI3 言語の類似練習問題(オリジナル)', practiceSec: 90, infoId: 'spi' },
  // ---- 玉手箱・SHL系 計数
  { id: 'shisoku', exam: 'SHL', section: '計数', name: '四則逆算', name_ko: '사칙 역산', kind: 'gen', test_name: '玉手箱Ⅲ', testNote: '玉手箱Ⅲ 計数(四則逆算)を想定した類似練習問題', practiceSec: 12, infoId: 'tamatebako3', perQuestion: true, formatNote: '実際の検査の選択肢数とは異なる場合がある。このアプリでは4択。' },
  { id: 'zuhyo', exam: 'SHL', section: '計数', name: '図表の読み取り', name_ko: '도표 읽기', kind: 'gen', test_name: 'GAB系', testNote: 'GAB 計数(図表理解)に近い形式の類似練習問題。「玉手箱の図表の読み取り」として知られる形式', practiceSec: 35, infoId: 'gab', perQuestion: true, formatNote: '実際の検査の選択肢数とは異なる場合がある。このアプリでは4択。' },
  { id: 'kuuran', exam: 'SHL', section: '計数', name: '表の空欄推測', name_ko: '표의 빈칸 추측', kind: 'gen', test_name: '玉手箱系(未確認)', testNote: '対策書で「玉手箱の表の空欄推測」とされる形式の類似練習問題(公式の科目名は未確認)', practiceSec: 60, infoId: 'hyoKuuran', perQuestion: true, formatNote: 'このアプリでは、表の規則を「一次式」に限って答えが1つに決まるようにしている。' },
  // ---- 玉手箱・SHL系 言語
  { id: 'gab_ronri', exam: 'SHL', section: '言語', name: '論理的読解(GAB形式)', name_ko: '논리적 독해(GAB형)', kind: 'bank', test_name: 'GAB', testNote: 'GAB 言語(論理)を想定した類似練習問題(オリジナル)', practiceSec: 50, infoId: 'gab', formatNote: '元の形式は各文について「A 正しい / B 誤り / C 判断できない」を選ぶ3択(公式未確認)。このアプリでは「本文から確実に言えるもの」を1つ選ぶ4択に変えている。' },
  { id: 'images_shushi', exam: 'SHL', section: '言語', name: '趣旨判定(IMAGES形式)', name_ko: '취지 판정(IMAGES형)', kind: 'bank', test_name: 'IMAGES', testNote: 'IMAGES 言語(趣旨判定)を想定した類似練習問題(オリジナル)', practiceSec: 75, infoId: 'images', formatNote: '元の形式は複数の文について「筆者の趣旨か・書かれているが趣旨ではないか・関係ないか」を判定する形式として知られる(公式未確認)。このアプリでは「筆者の趣旨として最も適切なもの」を1つ選ぶ4択に変えている。' },
];

export const typeById = (id: string) => TYPES.find((t) => t.id === id);

export const FOUR_CHOICE_NOTE = 'このアプリの問題は、学習しやすいように「正解が1つの4択」に作り直した練習用です。実際の検査の形式とは異なる場合があります。';
