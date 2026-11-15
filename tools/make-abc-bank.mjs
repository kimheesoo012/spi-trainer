// 論理的読解(本番形式 A/B/C)と英語の問題JSONを作る。node make.mjs <出力先 bank ディレクトリ>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAB2, ENG2 } from './bank-src/_abc2.mjs';

const JA = {
  A: '本文から論理的に考えて、設問文は明らかに正しい',
  B: '本文から論理的に考えて、設問文は明らかに間違っている',
  C: '本文だけでは、設問文が正しいか間違っているかは判断できない',
};
const EN = {
  A: 'The statement is clearly true, or follows logically, given the information in the passage.',
  B: 'The statement is clearly untrue, or the opposite follows logically, given the information in the passage.',
  C: 'You cannot say whether the statement is true or untrue without further information.',
};
const TIP = {
  A: '本文の内容を別の言い方にしただけなら A。数字は「約六割 → 半数以上」のように言い換えられる。',
  B: '数字・方向(増えた/減った)・範囲(すべて/一部)が本文と食い違えば B。',
  C: '本文にない比較・原因・将来の話は C。「ありそうだ」と思っても、書かれていなければ判断できない。',
};
const KO_LABEL = { A: 'A (분명히 맞음)', B: 'B (분명히 틀림)', C: 'C (본문만으로는 판단 불가)' };

// s: 設問文, a: 正解, why: 根拠(日本語), ko: 設問文の韓国語訳, kw: 判断理由(韓国語), d: 難易度
const GAB = [
  {
    p: 'ある調査会社が、会社員二千人を対象に会議についての意識を調べた。回答者の約六割が「会議の数が多すぎる」と答え、その理由として最も多かったのは「結論が出ないまま終わる会議がある」ことだった。一方、会議の時間を三十分以内に制限している企業では、「多すぎる」と答えた人の割合が四割にとどまった。\n調査会社は、会議の数そのものよりも、会議の目的があらかじめ共有されているかどうかが満足度を左右すると分析している。実際、議題を前日までに知らされている人は、そうでない人に比べて、会議を「有意義だ」と感じる割合が高かった。ただし、この調査は会議の成果そのものを測ったものではなく、参加者の感じ方を尋ねたものである。',
    sum: '회사원 2천 명에게 회의에 대한 생각을 물은 조사. 약 60%가 "회의가 너무 많다"고 답했고, 회의를 30분 이내로 제한하는 기업에서는 40%였다. 안건을 미리 알면 회의를 의미 있다고 느끼는 비율이 높았다. 단, 성과가 아니라 느낌을 물은 조사다.',
    q: [
      { s: '回答者の半数以上が、会議の数が多すぎると感じていた。', a: 'A', d: 1, why: '「回答者の約六割が『会議の数が多すぎる』と答え」とある。約六割は半数以上である。', ko: '응답자의 절반 이상이 회의가 너무 많다고 느꼈다.', kw: '"약 60%"는 절반 이상이므로 본문과 일치합니다.' },
      { s: '会議の時間を三十分以内に制限している企業では、会議が多すぎると答えた人はいなかった。', a: 'B', d: 1, why: '「『多すぎる』と答えた人の割合が四割にとどまった」とある。四割いるので「いなかった」は誤り。', ko: '회의 시간을 30분 이내로 제한하는 기업에서는 회의가 너무 많다고 답한 사람이 없었다.', kw: '40%가 그렇게 답했으므로 "없었다"는 본문과 어긋납니다.' },
      { s: '議題を事前に知らせると、会議で出される結論の質が高まる。', a: 'C', d: 2, why: '本文が述べているのは「有意義だと感じる割合が高かった」ことだけで、最後に「会議の成果そのものを測ったものではない」とある。結論の質については書かれていない。', ko: '안건을 미리 알리면 회의에서 나오는 결론의 질이 높아진다.', kw: '본문은 "의미 있다고 느끼는 비율"만 말하고, 성과는 재지 않았다고 했습니다. 결론의 질은 알 수 없습니다.' },
      { s: 'この調査は、会議によって得られた成果を数値で測定したものである。', a: 'B', d: 2, why: '最後の文に「会議の成果そのものを測ったものではなく、参加者の感じ方を尋ねたもの」とある。設問文は本文と逆。', ko: '이 조사는 회의로 얻은 성과를 수치로 측정한 것이다.', kw: '마지막 문장에서 "성과를 잰 것이 아니라 느낌을 물은 것"이라고 했으므로 반대입니다.' },
    ],
  },
  {
    p: '全国の書店の数は、この二十年でほぼ半分になった。背景には、インターネット通販や電子書籍の普及に加え、雑誌の売り上げが大きく落ち込んだことがある。かつて多くの小規模な書店は、定期的に売れる雑誌の収益に支えられていた。\nその一方で、新しい形の書店も生まれている。ある地方都市の書店は、店内に喫茶スペースを設け、著者を招いた読書会を月に二回開いている。本の売り上げだけを見れば以前と大きく変わらないが、飲食と催しの収入を合わせると、店全体の利益は三年前の約一・五倍になったという。店主は「本を売る場所から、本をきっかけに人が集まる場所へ変わる必要がある」と語る。もっとも、こうした取り組みには場所と人手が必要であり、どの書店にもできるわけではない。',
    sum: '전국 서점 수가 20년 사이 거의 절반이 됐다. 원인은 인터넷 판매·전자책 보급과 잡지 매출 감소. 한 지방 서점은 카페와 독서 모임을 열어, 책 매출은 그대로지만 가게 전체 이익이 3년 전의 약 1.5배가 됐다. 다만 모든 서점이 할 수 있는 것은 아니다.',
    q: [
      { s: 'この二十年で、全国の書店の数はおよそ半減した。', a: 'A', d: 1, why: '冒頭に「この二十年でほぼ半分になった」とある。', ko: '지난 20년 사이 전국 서점 수는 대략 절반으로 줄었다.', kw: '첫 문장 "거의 절반이 됐다"와 같은 내용입니다.' },
      { s: '雑誌の売り上げの落ち込みは、小規模な書店の経営に影響を与えた。', a: 'A', d: 2, why: '書店が減った背景に「雑誌の売り上げが大きく落ち込んだこと」が挙げられ、続けて「小規模な書店は雑誌の収益に支えられていた」とある。二つを合わせると、落ち込みが経営に影響したことが論理的に導ける。', ko: '잡지 매출 감소는 소규모 서점의 경영에 영향을 주었다.', kw: '서점 감소의 배경으로 잡지 매출 감소가 나오고, 소규모 서점이 잡지 수익에 기대고 있었다고 했으므로 논리적으로 따라 나옵니다.' },
      { s: 'この地方都市の書店では、本の売り上げが三年前の約一・五倍になった。', a: 'B', d: 2, why: '「本の売り上げだけを見れば以前と大きく変わらない」とある。一・五倍になったのは「店全体の利益」であり、本の売り上げではない。', ko: '이 지방 도시의 서점은 책 매출이 3년 전의 약 1.5배가 됐다.', kw: '1.5배가 된 것은 "가게 전체 이익"이고, 책 매출은 "크게 달라지지 않았다"고 했으므로 틀립니다.' },
      { s: '電子書籍を利用する人は、紙の本を買わなくなる。', a: 'C', d: 2, why: '電子書籍の普及は書店が減った背景として挙げられているだけで、利用者が紙の本を買うかどうかは書かれていない。', ko: '전자책을 이용하는 사람은 종이책을 사지 않게 된다.', kw: '전자책 보급이 배경이라고만 했고, 이용자 개인이 종이책을 사는지는 나오지 않습니다.' },
    ],
  },
  {
    p: 'ある大学の研究グループは、学生百二十人を二つのグループに分け、新しい単語を覚える実験を行った。一方のグループは夜に学習してそのまま眠り、もう一方は朝に学習して日中は起きたまま過ごした。十二時間後に確認テストをしたところ、夜に学習して眠ったグループのほうが、平均で約二割多くの単語を覚えていた。\n研究グループは、眠っている間に記憶が整理され、定着しやすくなるためではないかと考えている。ただし、朝に学習したグループは、テストまでの間に授業や会話などで多くの新しい情報に触れていた。そのため、成績の差が睡眠そのものの効果なのか、日中の活動による妨げが少なかったためなのかは、この実験だけでは区別できない。',
    sum: '학생 120명을 두 그룹으로 나눠 단어 암기 실험을 했다. 밤에 공부하고 잔 그룹이 12시간 뒤 시험에서 약 20% 더 많이 기억했다. 다만 아침 그룹은 낮 동안 새 정보를 많이 접했기 때문에, 차이가 수면 효과인지 낮 활동의 방해가 적어서인지는 이 실험만으로 구분할 수 없다.',
    q: [
      { s: '確認テストは、学習してから十二時間後に行われた。', a: 'A', d: 1, why: '「十二時間後に確認テストをした」とある。', ko: '확인 시험은 공부한 지 12시간 뒤에 치러졌다.', kw: '본문에 그대로 나옵니다.' },
      { s: '朝に学習したグループのほうが、覚えていた単語の数が多かった。', a: 'B', d: 1, why: '「夜に学習して眠ったグループのほうが、平均で約二割多く」とある。設問文は逆。', ko: '아침에 공부한 그룹이 기억한 단어 수가 더 많았다.', kw: '더 많이 기억한 쪽은 밤에 공부하고 잔 그룹이므로 반대입니다.' },
      { s: 'この実験によって、睡眠が記憶を定着させることが証明された。', a: 'B', d: 3, why: '最後に「睡眠そのものの効果なのか…この実験だけでは区別できない」とある。区別できないのだから「証明された」とは言えず、本文と食い違う。', ko: '이 실험으로 수면이 기억을 정착시킨다는 것이 증명됐다.', kw: '본문은 "이 실험만으로는 구분할 수 없다"고 했습니다. "증명됐다"는 본문과 어긋납니다.' },
      { s: '昼寝をすれば、朝に学習した内容も定着しやすくなる。', a: 'C', d: 2, why: '昼寝については本文に何も書かれていない。', ko: '낮잠을 자면 아침에 공부한 내용도 잘 정착된다.', kw: '낮잠 이야기는 본문에 전혀 없습니다.' },
    ],
  },
  {
    p: '日本では、まだ食べられるのに捨てられる食品が、年間で数百万トンにのぼる。その約半分は家庭から、残りは食品メーカーや小売店、飲食店などの事業者から出ている。\n事業者側の原因の一つとされてきたのが、「三分の一ルール」と呼ばれる商習慣である。これは、製造日から賞味期限までの期間を三つに分け、最初の三分の一の期間内に小売店へ納品できなかった商品は、店に並べずに返品するというものだ。近年は、この期限を二分の一に緩める小売企業が増えている。\n一方、家庭から出る食品ロスについては、買いすぎや、賞味期限と消費期限の混同が原因として挙げられる。賞味期限は「おいしく食べられる期限」であり、過ぎたらすぐに食べられなくなるわけではない。',
    sum: '일본에서 아직 먹을 수 있는데 버려지는 식품이 연간 수백만 톤. 약 절반은 가정, 나머지는 사업자에서 나온다. 사업자 쪽 원인으로 "3분의 1 규칙"(제조일~유통기한의 첫 1/3 안에 납품 못 하면 반품)이 있고, 최근 1/2로 완화하는 기업이 늘고 있다. 가정 쪽 원인은 과잉 구매와 賞味期限·消費期限의 혼동.',
    q: [
      { s: '食品ロスのうち、家庭から出るものは全体のおよそ半分を占める。', a: 'A', d: 1, why: '「その約半分は家庭から」とある。', ko: '식품 손실 중 가정에서 나오는 것이 전체의 약 절반을 차지한다.', kw: '"약 절반은 가정에서"와 같은 내용입니다.' },
      { s: '「三分の一ルール」では、製造日から賞味期限までの期間の最初の三分の一を過ぎた商品は、小売店に納品されない。', a: 'A', d: 2, why: '「最初の三分の一の期間内に小売店へ納品できなかった商品は、店に並べずに返品する」とある。期間を過ぎた商品は納品されず返品されるので、設問文と一致する。', ko: '"3분의 1 규칙"에서는 제조일부터 유통기한까지 기간의 첫 3분의 1을 넘긴 상품은 소매점에 납품되지 않는다.', kw: '첫 1/3 기간 안에 납품하지 못한 상품은 반품한다고 했으므로 같은 뜻입니다.' },
      { s: '納品期限を二分の一に緩めた小売企業では、食品ロスが半分に減った。', a: 'C', d: 2, why: '「二分の一に緩める小売企業が増えている」とあるだけで、その結果として食品ロスがどれだけ減ったかは書かれていない。', ko: '납품 기한을 2분의 1로 완화한 소매 기업에서는 식품 손실이 절반으로 줄었다.', kw: '완화하는 기업이 늘고 있다는 말만 있고, 그 결과는 나오지 않습니다.' },
      { s: '賞味期限を一日でも過ぎた食品は、食べることができない。', a: 'B', d: 1, why: '「過ぎたらすぐに食べられなくなるわけではない」とある。設問文は本文と逆。', ko: '賞味期限을 하루라도 넘긴 식품은 먹을 수 없다.', kw: '"넘겼다고 바로 못 먹게 되는 것은 아니다"라고 했으므로 반대입니다.' },
    ],
  },
  {
    p: '人口約三万人のある町で、運転手のいない自動運転バスの実証運行が一年間行われた。路線は駅と病院、役場を結ぶ約四キロで、最高時速は二十キロに抑えられた。期間中の利用者はのべ約一万五千人で、その七割が六十五歳以上だった。\n町がこの事業を始めた背景には、路線バスの運転手不足がある。町内を走る民間のバス路線は、この五年間で三本が廃止された。実証運行の期間中、人身事故は一件も起きなかったが、路上駐車の車を避けられずに停止し、係員が遠隔操作で対応した例が月に数回あった。町は来年度から運行を本格化させる方針だが、車両の維持費を運賃だけでまかなうことは難しく、費用の負担が課題となっている。',
    sum: '인구 약 3만 명의 마을에서 무인 자율주행 버스를 1년간 시험 운행했다. 이용자 약 1만 5천 명 중 70%가 65세 이상. 인명 사고는 없었지만, 길가 주차 차량을 피하지 못해 직원이 원격 조작한 사례가 한 달에 몇 번 있었다. 내년부터 본격 운행할 방침이지만 비용 부담이 과제다.',
    q: [
      { s: '実証運行の利用者の過半数は、六十五歳以上だった。', a: 'A', d: 1, why: '「その七割が六十五歳以上だった」とある。七割は過半数である。', ko: '시험 운행 이용자의 과반수는 65세 이상이었다.', kw: '70%는 과반수이므로 맞습니다.' },
      { s: '実証運行の期間中、バスが人にけがをさせる事故は起きなかった。', a: 'A', d: 1, why: '「人身事故は一件も起きなかった」とある。人身事故とは人が死傷する事故のこと。', ko: '시험 운행 기간 동안 버스가 사람을 다치게 하는 사고는 일어나지 않았다.', kw: '"人身事故(사람이 다치거나 죽는 사고)는 한 건도 없었다"와 같습니다.' },
      { s: '自動運転バスは、係員の操作を一度も必要とせずに運行された。', a: 'B', d: 1, why: '「係員が遠隔操作で対応した例が月に数回あった」とある。', ko: '자율주행 버스는 직원의 조작을 한 번도 필요로 하지 않고 운행됐다.', kw: '직원이 원격 조작한 사례가 한 달에 몇 번 있었으므로 틀립니다.' },
      { s: '本格運行が始まれば、町内の民間バス路線はさらに廃止される。', a: 'C', d: 2, why: '民間路線は「この五年間で三本が廃止された」とあるが、今後どうなるかは書かれていない。', ko: '본격 운행이 시작되면 마을의 민간 버스 노선은 더 폐지된다.', kw: '과거 5년간 3개 노선이 없어졌다는 사실만 있고, 앞으로의 일은 나오지 않습니다.' },
    ],
  },
  {
    p: 'メンバーの経歴や専門が多様なチームは、似た者どうしのチームよりも良い成果を出すといわれる。しかし、複数の研究を総合すると、多様性が成果に結びつくかどうかは条件によって異なる。\n新しい製品の企画のように、決まった正解のない課題では、多様なチームのほうが独創的な案を多く出す傾向がある。これに対し、手順の決まった作業を速く正確にこなす課題では、多様性による差はほとんど見られない。また、多様なチームは意見の対立が起こりやすく、初期の段階では意思決定に時間がかかる。\nある研究者は、多様性の利点を引き出すには、立場の弱いメンバーでも発言しやすい雰囲気が欠かせないと指摘する。異なる視点があっても、それが口に出されなければ、ないのと同じだからである。',
    sum: '다양한 팀이 더 좋은 성과를 낸다고 하지만, 조건에 따라 다르다. 정답이 없는 과제에서는 독창적인 안을 많이 내지만, 절차가 정해진 작업에서는 차이가 거의 없다. 초기에는 의사결정에 시간이 걸린다. 다양성의 이점을 살리려면 발언하기 쉬운 분위기가 필요하다.',
    q: [
      { s: '多様なチームは、どのような種類の課題でも、似た者どうしのチームより高い成果を出す。', a: 'B', d: 1, why: '「条件によって異なる」「手順の決まった作業…では、多様性による差はほとんど見られない」とある。「どのような課題でも」は誤り。', ko: '다양한 팀은 어떤 종류의 과제에서도 비슷한 사람끼리의 팀보다 높은 성과를 낸다.', kw: '"조건에 따라 다르다", 절차가 정해진 작업에서는 차이가 거의 없다고 했으므로 틀립니다.' },
      { s: '正解の決まっていない課題では、多様なチームのほうが独創的な案を出しやすい。', a: 'A', d: 1, why: '「決まった正解のない課題では、多様なチームのほうが独創的な案を多く出す傾向がある」とある。', ko: '정답이 정해지지 않은 과제에서는 다양한 팀이 독창적인 안을 내기 쉽다.', kw: '본문 내용 그대로입니다.' },
      { s: '多様なチームは、結成から時間がたつと、似た者どうしのチームより意思決定が速くなる。', a: 'C', d: 3, why: '本文は「初期の段階では意思決定に時間がかかる」と述べるだけで、時間がたった後に速くなるかどうかは書かれていない。', ko: '다양한 팀은 결성 후 시간이 지나면 비슷한 사람끼리의 팀보다 의사결정이 빨라진다.', kw: '"초기에는 시간이 걸린다"는 말만 있습니다. 그 뒤에 더 빨라지는지는 알 수 없습니다.' },
      { s: 'メンバーが自分の視点を発言しなければ、多様性の利点は生かされない。', a: 'A', d: 2, why: '「異なる視点があっても、それが口に出されなければ、ないのと同じ」とある。', ko: '구성원이 자기 관점을 말하지 않으면 다양성의 이점은 살지 않는다.', kw: '"다른 관점이 있어도 말로 나오지 않으면 없는 것과 같다"와 같은 뜻입니다.' },
    ],
  },
  {
    p: 'ある商店街では、二年前から加盟店の約八割がキャッシュレス決済を導入している。導入した店への聞き取りでは、「レジの締め作業が短くなった」という声が多かった一方、「決済手数料の負担が重い」という声も半数近くにのぼった。手数料は売り上げの三％前後で、利益の薄い小さな店ほど影響が大きい。\n客の側では、三十代以下の利用が目立つ。商店街の調査によると、キャッシュレスで支払った客の一回あたりの購入額は、現金で支払った客より平均で二割ほど高かった。ただし、もともと購入額の大きい客がキャッシュレスを選びやすい可能性もあり、決済方法が購入額を押し上げたとは言い切れない。なお、導入していない店の多くは、店主が高齢で、機器の操作に不安があることを理由に挙げている。',
    sum: '어느 상점가에서 가맹점의 약 80%가 캐시리스 결제를 도입했다. 계산대 마감이 빨라졌다는 의견이 많았지만, 수수료(매출의 약 3%)가 부담이라는 의견도 절반 가까이였다. 캐시리스 결제 손님의 1회 구매액이 현금 손님보다 평균 20%쯤 높았지만, 결제 수단이 구매액을 올렸다고 단정할 수는 없다.',
    q: [
      { s: 'この商店街では、加盟店の過半数がキャッシュレス決済を導入している。', a: 'A', d: 1, why: '「加盟店の約八割がキャッシュレス決済を導入している」とある。', ko: '이 상점가에서는 가맹점의 과반수가 캐시리스 결제를 도입했다.', kw: '약 80%는 과반수입니다.' },
      { s: '導入した店のすべてが、決済手数料を負担に感じている。', a: 'B', d: 1, why: '負担が重いという声は「半数近く」であり、「すべて」ではない。', ko: '도입한 가게 모두가 결제 수수료를 부담으로 느끼고 있다.', kw: '"절반 가까이"이므로 "모두"는 틀립니다.' },
      { s: 'キャッシュレス決済を導入した店では、売り上げが二割増えた。', a: 'C', d: 3, why: '二割高かったのは「キャッシュレスで支払った客の一回あたりの購入額」であり、店の売り上げ全体がどう変わったかは書かれていない。', ko: '캐시리스 결제를 도입한 가게에서는 매출이 20% 늘었다.', kw: '20% 높았던 것은 "캐시리스 손님의 1회 구매액"입니다. 가게 매출 전체가 어떻게 변했는지는 나오지 않습니다.' },
      { s: 'キャッシュレスで支払った客は、現金で支払った客より、一回あたりの購入額が平均して高かった。', a: 'A', d: 1, why: '「現金で支払った客より平均で二割ほど高かった」とある。', ko: '캐시리스로 결제한 손님은 현금으로 결제한 손님보다 1회 구매액이 평균적으로 높았다.', kw: '본문 내용 그대로입니다.' },
    ],
  },
  {
    p: '外国語は幼いうちに始めるほどよい、と広く信じられている。確かに、発音については、幼少期に学び始めた人のほうが母語話者に近づきやすいことが多くの研究で示されている。\nしかし、文法や語彙の習得については、事情が異なる。同じ学習時間で比べた場合、学び始めの段階では、大人のほうが子どもより速く上達するという報告が少なくない。大人はすでに母語で身につけた知識や、意識的に規則を学ぶ力を使えるからである。\n結局のところ、最終的な到達度を大きく左右するのは、始めた年齢そのものよりも、その言語に触れる時間の長さと、使う必要性の強さだと考える研究者が多い。週に一時間の授業を幼児期から続けても、それだけで高い運用力が身につくとは考えにくい。',
    sum: '외국어는 어릴수록 좋다고들 한다. 발음은 어릴 때 시작한 사람이 유리하다. 하지만 문법·어휘는 같은 학습 시간이면 초기에는 어른이 더 빨리 는다. 최종 수준을 좌우하는 것은 시작 나이보다 그 언어를 접하는 시간과 써야 할 필요성이라고 보는 연구자가 많다.',
    q: [
      { s: '発音に関しては、幼いころに学び始めた人のほうが有利であることが多い。', a: 'A', d: 1, why: '「発音については、幼少期に学び始めた人のほうが母語話者に近づきやすい」とある。', ko: '발음에 관해서는 어릴 때 배우기 시작한 사람이 유리한 경우가 많다.', kw: '본문과 같은 내용입니다.' },
      { s: '学習を始めたばかりの段階では、同じ学習時間であれば、子どものほうが大人より速く上達する。', a: 'B', d: 1, why: '「学び始めの段階では、大人のほうが子どもより速く上達する」とある。設問文は逆。', ko: '배우기 시작한 단계에서는 같은 학습 시간이면 아이가 어른보다 빨리 는다.', kw: '본문은 "어른이 더 빨리 는다"고 했으므로 반대입니다.' },
      { s: '多くの研究者は、最終的な到達度を決める最大の要因は学習を始めた年齢だと考えている。', a: 'B', d: 2, why: '「始めた年齢そのものよりも、触れる時間の長さと、使う必要性の強さだと考える研究者が多い」とある。', ko: '많은 연구자는 최종 수준을 결정하는 가장 큰 요인이 학습을 시작한 나이라고 생각한다.', kw: '"시작 나이보다 접하는 시간과 필요성"이라고 했으므로 틀립니다.' },
      { s: '大人になってから外国語を学び始めた人は、母語話者と同じ発音を身につけることができない。', a: 'C', d: 3, why: '本文は「幼少期に始めた人のほうが近づきやすい」と述べるだけで、大人には不可能だとは書いていない。可能かどうかは判断できない。', ko: '어른이 되어 외국어를 배우기 시작한 사람은 원어민과 같은 발음을 익힐 수 없다.', kw: '"어릴 때 시작하면 가까워지기 쉽다"는 말만 있고, 어른은 불가능하다고는 하지 않았습니다.' },
    ],
  },
  {
    p: 'ある人材サービス会社が正社員五千人を対象に行った調査によると、副業をしている人は全体の約一割だった。副業をしていない人のうち、約四割が「今後してみたい」と答えている。副業をする理由で最も多かったのは「収入を増やしたい」で、「本業では得られない経験を積みたい」がこれに続いた。\n企業の側では、副業を認める動きが広がっている。同じ会社が企業を対象に行った別の調査では、副業を認めている企業は五年前の約三割から、約六割に増えた。認める理由として多いのは「社員の成長につながる」「優秀な人材を引き留められる」である。一方、認めていない企業の多くは、長時間労働による健康への影響や、情報が外部に漏れるおそれを理由に挙げている。',
    sum: '정사원 5천 명 조사에서 부업을 하는 사람은 약 10%. 하지 않는 사람 중 약 40%가 해 보고 싶다고 답했다. 이유 1위는 수입 증가, 2위는 본업에서 얻을 수 없는 경험. 부업을 허용하는 기업은 5년 전 약 30%에서 약 60%로 늘었다. 허용하지 않는 기업은 건강 문제와 정보 유출을 이유로 든다.',
    q: [
      { s: '調査対象の正社員のうち、副業をしている人は少数派だった。', a: 'A', d: 1, why: '「副業をしている人は全体の約一割だった」とある。', ko: '조사 대상 정사원 중 부업을 하는 사람은 소수였다.', kw: '약 10%이므로 소수입니다.' },
      { s: '副業をする理由として最も多く挙げられたのは、本業では得られない経験を積むことだった。', a: 'B', d: 1, why: '最も多かったのは「収入を増やしたい」で、経験は二番目である。', ko: '부업을 하는 이유로 가장 많이 꼽힌 것은 본업에서 얻을 수 없는 경험을 쌓는 것이었다.', kw: '1위는 "수입을 늘리고 싶다"이고, 경험은 2위입니다.' },
      { s: '副業を認めている企業の割合は、五年前に比べておよそ二倍になった。', a: 'A', d: 2, why: '「五年前の約三割から、約六割に増えた」とある。三割から六割は約二倍。', ko: '부업을 허용하는 기업의 비율은 5년 전에 비해 약 2배가 됐다.', kw: '약 30% → 약 60%이므로 약 2배입니다.' },
      { s: '副業を認めた企業では、社員の離職率が下がった。', a: 'C', d: 2, why: '「優秀な人材を引き留められる」は企業が挙げた理由であり、実際に離職率が下がったかどうかは書かれていない。', ko: '부업을 허용한 기업에서는 사원의 이직률이 내려갔다.', kw: '"인재를 붙잡을 수 있다"는 것은 기업이 든 이유일 뿐, 실제 결과는 나오지 않습니다.' },
    ],
  },
  {
    p: 'ある市は、十年前から街路樹を増やす事業を進めてきた。市の報告書によれば、街路樹の本数はこの十年で約一・三倍になり、夏の日中、木陰のある歩道の路面温度は、木陰のない歩道に比べて最大で十度以上低かった。\n一方で、課題も明らかになっている。落ち葉の清掃や枝の剪定にかかる費用は年々増え、昨年度は事業を始めた年の約二倍に達した。また、根が成長して歩道の舗装を持ち上げ、歩行者がつまずく事故も報告されている。\n市は今後、本数を増やすことよりも、既存の木の管理に重点を移す方針である。樹種を選ぶ際にも、成長が緩やかで根が広がりにくいものを優先するという。',
    sum: '어느 시가 10년 전부터 가로수를 늘려 왔다. 그루 수는 약 1.3배가 됐고, 여름 낮 나무 그늘이 있는 보도의 노면 온도는 최대 10도 이상 낮았다. 한편 관리 비용은 시작한 해의 약 2배가 됐고, 뿌리 때문에 넘어지는 사고도 있다. 앞으로는 늘리기보다 기존 나무 관리에 중점을 둔다.',
    q: [
      { s: '夏の日中、木陰のある歩道は、木陰のない歩道より路面温度が低かった。', a: 'A', d: 1, why: '「木陰のある歩道の路面温度は、木陰のない歩道に比べて最大で十度以上低かった」とある。', ko: '여름 낮, 나무 그늘이 있는 보도는 그늘이 없는 보도보다 노면 온도가 낮았다.', kw: '본문 내용 그대로입니다.' },
      { s: '街路樹の管理にかかる費用は、この十年で減少した。', a: 'B', d: 1, why: '「費用は年々増え、昨年度は事業を始めた年の約二倍に達した」とある。', ko: '가로수 관리 비용은 지난 10년 사이 줄었다.', kw: '해마다 늘어 약 2배가 됐으므로 반대입니다.' },
      { s: '街路樹が増えたことで、市の中心部の気温が下がった。', a: 'C', d: 2, why: '本文が述べているのは歩道の「路面温度」の比較だけで、市の中心部の気温については書かれていない。', ko: '가로수가 늘어서 시 중심부의 기온이 내려갔다.', kw: '본문은 보도의 "노면 온도"만 비교했습니다. 시 중심부의 기온은 나오지 않습니다.' },
      { s: '市は今後も、街路樹の本数を増やすことを最も重視する方針である。', a: 'B', d: 1, why: '「本数を増やすことよりも、既存の木の管理に重点を移す方針」とある。', ko: '시는 앞으로도 가로수 그루 수를 늘리는 것을 가장 중시할 방침이다.', kw: '"늘리기보다 기존 나무 관리에 중점을 옮긴다"고 했으므로 틀립니다.' },
    ],
  },
  {
    p: 'ある通信販売会社は、問い合わせ窓口への電話がつながるまでの待ち時間を短くするため、よくある質問に自動で答えるチャット機能を導入した。導入後、電話の件数は約三割減り、平均の待ち時間は五分から二分に短くなった。\nところが、顧客満足度の調査では、全体の点数は導入前とほとんど変わらなかった。詳しく調べると、チャットだけで問題が解決した顧客の満足度は高かったが、チャットで解決せずに電話をかけ直した顧客の満足度は、導入前の平均を大きく下回っていた。同じ説明を二度しなければならなかったことへの不満が多かったという。\n同社は現在、チャットでのやり取りの内容を、電話の担当者がそのまま引き継いで確認できる仕組みを準備している。',
    sum: '어느 통신판매 회사가 자주 묻는 질문에 자동으로 답하는 채팅 기능을 도입했다. 전화는 약 30% 줄고 평균 대기 시간은 5분에서 2분이 됐다. 그런데 고객 만족도 전체 점수는 거의 그대로였다. 채팅으로 해결된 고객은 만족도가 높았지만, 해결이 안 돼 다시 전화한 고객은 같은 설명을 두 번 해야 해서 만족도가 낮았다. 회사는 채팅 내용을 전화 담당자가 이어받는 구조를 준비 중이다.',
    q: [
      { s: 'チャット機能の導入後、電話がつながるまでの平均の待ち時間は半分以下になった。', a: 'A', d: 2, why: '「平均の待ち時間は五分から二分に短くなった」とある。二分は五分の半分(二分三十秒)より短い。', ko: '채팅 기능 도입 후, 전화가 연결될 때까지의 평균 대기 시간은 절반 이하가 됐다.', kw: '5분 → 2분입니다. 5분의 절반은 2분 30초이므로 절반 이하가 맞습니다.' },
      { s: 'チャット機能の導入によって、顧客満足度の全体の点数は大きく上がった。', a: 'B', d: 1, why: '「全体の点数は導入前とほとんど変わらなかった」とある。', ko: '채팅 기능 도입으로 고객 만족도 전체 점수가 크게 올랐다.', kw: '"도입 전과 거의 달라지지 않았다"고 했으므로 틀립니다.' },
      { s: 'チャットで解決せずに電話をかけ直した顧客は、チャットを利用した顧客の半数を超えていた。', a: 'C', d: 3, why: '電話をかけ直した顧客の満足度は書かれているが、その人数や割合は書かれていない。', ko: '채팅으로 해결되지 않아 다시 전화한 고객은 채팅을 이용한 고객의 절반을 넘었다.', kw: '다시 전화한 고객의 만족도는 나오지만, 그 인원이나 비율은 나오지 않습니다.' },
      { s: '電話をかけ直した顧客の不満の一因は、同じ説明を繰り返さなければならなかったことにある。', a: 'A', d: 1, why: '「同じ説明を二度しなければならなかったことへの不満が多かった」とある。', ko: '다시 전화한 고객의 불만 원인 중 하나는 같은 설명을 반복해야 했던 것이다.', kw: '본문에 그대로 나옵니다.' },
    ],
  },
  {
    p: '「朝食を毎日食べる子どもは学力テストの点数が高い」という調査結果は、よく知られている。しかし、この結果から「朝食を食べさせれば成績が上がる」と結論づけるのは早計である。\n朝食を毎日食べる家庭は、就寝時刻や起床時刻が規則正しく、保護者が子どもの学習に関心を持っている場合が多いと考えられる。そうだとすれば、成績の高さをもたらしているのは朝食そのものではなく、生活習慣や家庭環境全体かもしれない。二つの事柄が同時に起きていることと、一方がもう一方の原因であることは、別の問題である。\nもちろん、朝食に効果がないと決まったわけではない。因果関係を確かめるには、ほかの条件をそろえたうえで、朝食の有無だけを変えて比べる調査が必要になる。',
    sum: '"아침을 매일 먹는 아이가 학력 시험 점수가 높다"는 조사 결과가 있다. 하지만 "아침을 먹이면 성적이 오른다"고 결론짓기는 이르다. 생활 습관이나 가정 환경 전체가 원인일 수 있다. 두 가지가 함께 일어나는 것과 한쪽이 다른 쪽의 원인인 것은 다른 문제다. 그렇다고 아침의 효과가 없다고 정해진 것도 아니다.',
    q: [
      { s: '筆者は、朝食を食べても学力は上がらないと主張している。', a: 'B', d: 2, why: '「朝食に効果がないと決まったわけではない」とある。筆者は「効果がない」と主張しているのではなく、「この結果だけでは因果関係は分からない」と述べている。', ko: '필자는 아침을 먹어도 학력은 오르지 않는다고 주장한다.', kw: '필자는 "효과가 없다고 정해진 것은 아니다"라고 했습니다. 인과관계를 알 수 없다는 것이지, 효과가 없다는 주장이 아닙니다.' },
      { s: '朝食を毎日食べる子どもは、学力テストの点数が高い傾向にあるという調査結果がある。', a: 'A', d: 1, why: '冒頭の調査結果そのもの。', ko: '아침을 매일 먹는 아이는 학력 시험 점수가 높은 경향이 있다는 조사 결과가 있다.', kw: '첫 문장의 조사 결과 그대로입니다.' },
      { s: '二つの事柄が同時に起きていても、一方が他方の原因であるとは限らない。', a: 'A', d: 2, why: '「二つの事柄が同時に起きていることと、一方がもう一方の原因であることは、別の問題である」とある。', ko: '두 가지 일이 함께 일어나더라도, 한쪽이 다른 쪽의 원인이라고는 할 수 없다.', kw: '본문의 "별개의 문제다"와 같은 뜻입니다.' },
      { s: '就寝時刻を早めれば、子どもの学力テストの点数は上がる。', a: 'C', d: 3, why: '規則正しい生活習慣が成績の原因「かもしれない」と述べているだけで、就寝時刻を早めた結果については書かれていない。', ko: '취침 시각을 앞당기면 아이의 학력 시험 점수가 오른다.', kw: '생활 습관이 원인"일지도 모른다"고 했을 뿐, 취침 시각을 앞당긴 결과는 나오지 않습니다.' },
    ],
  },
];

const ENG = [
  {
    p: 'A software company introduced a policy that allows employees to work from home up to three days a week. Before the change, all staff were required to be in the office every weekday. One year later, the company surveyed its 400 employees. About 70 percent said they were more satisfied with their jobs than before. The number of employees who left the company fell from 48 in the previous year to 30. However, some managers reported that it had become harder to train new staff, because junior employees had fewer chances to learn by watching experienced colleagues. The company plans to keep the policy but will ask new hires to come to the office four days a week during their first six months.',
    sum: '한 소프트웨어 회사가 주 3일까지 재택근무를 허용했다. 1년 뒤 직원 400명 중 약 70%가 전보다 만족한다고 답했고, 퇴사자는 48명에서 30명으로 줄었다. 다만 일부 관리자는 신입 교육이 어려워졌다고 했다. 회사는 제도를 유지하되, 신입은 첫 6개월간 주 4일 출근하게 할 계획이다.',
    q: [
      { s: 'Employees may now work from home every day of the week.', a: 'B', d: 1, why: '"up to three days a week"(週に最大三日)とある。毎日ではない。', ko: '직원들은 이제 매일 재택근무를 할 수 있다.', kw: '"up to three days a week"(주 3일까지)이므로 매일은 아닙니다.' },
      { s: 'Fewer employees left the company in the year after the policy was introduced than in the year before.', a: 'A', d: 1, why: '"fell from 48 in the previous year to 30" とある。', ko: '제도 도입 후 1년 동안 퇴사한 직원은 그 전 해보다 적었다.', kw: '48명에서 30명으로 줄었으므로 맞습니다.' },
      { s: 'Most managers were against the new policy.', a: 'C', d: 2, why: '本文は "some managers reported that it had become harder to train new staff" と述べるだけで、管理職が制度に反対だったかどうか、またその割合は書かれていない。', ko: '대부분의 관리자는 새 제도에 반대했다.', kw: '"일부 관리자가 신입 교육이 어려워졌다고 했다"는 말만 있습니다. 반대했는지, 몇 명인지는 나오지 않습니다.' },
      { s: 'During their first six months, new hires will be asked to come to the office four days a week.', a: 'A', d: 1, why: '最後の文に "will ask new hires to come to the office four days a week during their first six months" とある。', ko: '신입 사원은 첫 6개월 동안 주 4일 출근하도록 요청받는다.', kw: '마지막 문장 그대로입니다.' },
    ],
  },
  {
    p: 'A coffee shop chain began charging customers an extra 20 cents for each disposable cup in order to reduce waste. Customers who bring their own cup pay the regular price. In the first three months, the share of drinks sold in reusable cups rose from 5 percent to 18 percent. Total sales did not change significantly during the period. The chain said the money collected from the cup charge would be donated to local environmental groups. Some customers complained that the charge was unfair to people who buy coffee on the way to work without planning ahead. The chain is now testing a system in two stores where customers can borrow a cup and return it at any branch.',
    sum: '한 커피 체인이 쓰레기를 줄이려고 일회용 컵에 20센트를 더 받기 시작했다. 자기 컵을 가져오면 정가를 낸다. 3개월 만에 재사용 컵 비율이 5%에서 18%로 올랐고, 전체 매출은 큰 변화가 없었다. 컵 요금은 지역 환경 단체에 기부한다. 현재 두 매장에서 컵 대여 제도를 시험 중이다.',
    q: [
      { s: 'Customers who bring their own cup receive a discount on the regular price.', a: 'B', d: 2, why: '"Customers who bring their own cup pay the regular price." とある。割引ではなく通常価格を払う。', ko: '자기 컵을 가져오는 손님은 정가에서 할인을 받는다.', kw: '자기 컵을 가져오면 "정가를 낸다"고 했습니다. 할인이 아닙니다.' },
      { s: 'The share of drinks sold in reusable cups more than tripled in the first three months.', a: 'A', d: 2, why: '"rose from 5 percent to 18 percent" とある。5%の3倍は15%で、18%はそれより大きい。', ko: '재사용 컵으로 팔린 음료의 비율은 첫 3개월 동안 3배 넘게 늘었다.', kw: '5% → 18%입니다. 5%의 3배는 15%이므로 3배가 넘습니다.' },
      { s: 'The cup-borrowing system will be introduced in all stores next year.', a: 'C', d: 1, why: '"is now testing a system in two stores" とあるだけで、今後すべての店に広げるかどうかは書かれていない。', ko: '컵 대여 제도는 내년에 모든 매장에 도입된다.', kw: '"두 매장에서 시험 중"이라는 말만 있고, 앞으로의 계획은 나오지 않습니다.' },
      { s: 'The chain keeps the money from the cup charge as profit.', a: 'B', d: 1, why: '"the money collected from the cup charge would be donated to local environmental groups" とある。', ko: '체인은 컵 요금으로 받은 돈을 이익으로 가진다.', kw: '지역 환경 단체에 기부한다고 했으므로 틀립니다.' },
    ],
  },
  {
    p: 'The city of Norton launched a bicycle-sharing service two years ago with 500 bikes and 40 stations. Residents can rent a bike with a smartphone app and return it to any station. The service now has 1,200 bikes, and the number of trips per day has grown from about 900 to about 3,500. A city report found that around 30 percent of users had previously made the same trips by car. The report also noted problems: bikes tend to collect at stations near the train station in the morning, leaving other stations empty, and staff must move bikes by truck several times a day. The city council will vote next month on whether to add 20 more stations.',
    sum: '노턴 시가 2년 전 자전거 500대, 정류소 40곳으로 공유 자전거를 시작했다. 지금은 1,200대이고 하루 이용 횟수는 약 900회에서 약 3,500회로 늘었다. 이용자의 약 30%는 전에 같은 구간을 차로 다녔다. 아침에 역 근처 정류소로 자전거가 몰리는 문제가 있다. 시의회는 다음 달 정류소 20곳 추가 여부를 표결한다.',
    q: [
      { s: 'The number of bikes has more than doubled since the service began.', a: 'A', d: 1, why: '500台から1,200台になった。500の2倍は1,000で、1,200はそれより多い。', ko: '서비스 시작 이후 자전거 수는 2배 넘게 늘었다.', kw: '500대 → 1,200대입니다. 2배(1,000대)를 넘습니다.' },
      { s: 'Most users of the service used to make the same trips by car.', a: 'B', d: 1, why: '"around 30 percent of users" とある。30%は "most"(大半)ではない。', ko: '이용자 대부분은 전에 같은 구간을 차로 다녔다.', kw: '약 30%이므로 "대부분"이 아닙니다.' },
      { s: 'The city council has decided to add 20 more stations.', a: 'B', d: 2, why: '"will vote next month on whether to add" とある。来月採決する段階であり、まだ決まっていない。', ko: '시의회는 정류소 20곳을 추가하기로 결정했다.', kw: '"다음 달에 추가 여부를 표결한다"고 했습니다. 아직 결정되지 않았습니다.' },
      { s: 'The service has reduced traffic jams in the city centre.', a: 'C', d: 2, why: '利用者の約30%が以前は車を使っていたとあるが、渋滞が減ったかどうかは書かれていない。', ko: '이 서비스로 시 중심부의 교통 체증이 줄었다.', kw: '이용자의 약 30%가 전에 차를 썼다는 말만 있고, 체증이 줄었는지는 나오지 않습니다.' },
    ],
  },
  {
    p: 'An online retailer introduced a chatbot to answer common customer questions, such as delivery dates and return rules. The chatbot now handles about 60 percent of all enquiries without human help. As a result, the average waiting time for customers who need to speak to a human agent has fallen from eight minutes to three. The company did not reduce the number of agents; instead, agents now spend more time on complicated cases, such as damaged goods or payment errors. A customer survey showed that satisfaction was high when the chatbot solved the problem, but low when customers had to repeat their explanation to a human agent after the chatbot failed. The company is working on a way to pass the chat history to the agent automatically.',
    sum: '한 온라인 소매업체가 배송일·반품 규정 같은 흔한 질문에 답하는 챗봇을 도입했다. 챗봇이 전체 문의의 약 60%를 사람 없이 처리한다. 상담원 연결 대기 시간은 8분에서 3분으로 줄었다. 상담원 수는 줄이지 않았고, 복잡한 건에 더 많은 시간을 쓴다. 챗봇이 해결하면 만족도가 높지만, 실패해서 상담원에게 다시 설명해야 하면 낮다.',
    q: [
      { s: 'The chatbot deals with more than half of customer enquiries on its own.', a: 'A', d: 1, why: '"handles about 60 percent of all enquiries without human help" とある。', ko: '챗봇은 고객 문의의 절반 이상을 혼자 처리한다.', kw: '약 60%를 사람 도움 없이 처리하므로 맞습니다.' },
      { s: 'The company cut the number of human agents after introducing the chatbot.', a: 'B', d: 1, why: '"The company did not reduce the number of agents" とある。', ko: '회사는 챗봇 도입 후 상담원 수를 줄였다.', kw: '"상담원 수를 줄이지 않았다"고 했으므로 틀립니다.' },
      { s: 'Customers who had to explain their problem twice tended to be less satisfied.', a: 'A', d: 2, why: '"low when customers had to repeat their explanation to a human agent" とある。', ko: '문제를 두 번 설명해야 했던 고객은 만족도가 낮은 경향이 있었다.', kw: '상담원에게 설명을 반복해야 했을 때 만족도가 낮았다고 했습니다.' },
      { s: 'Human agents are paid more than before because their work has become more difficult.', a: 'C', d: 2, why: '担当者が複雑な案件に時間を使うようになったとあるが、給与については書かれていない。', ko: '상담원은 일이 어려워졌기 때문에 전보다 급여를 더 받는다.', kw: '복잡한 건에 시간을 쓴다는 말만 있고, 급여 이야기는 없습니다.' },
    ],
  },
  {
    p: 'A manufacturing firm with 250 workers tested a four-day working week for six months. Workers kept the same pay but worked 32 hours a week instead of 40. To make this possible, the firm shortened meetings and stopped producing several reports that few people read. Output per worker stayed at roughly the same level as before the trial. Sick leave fell by a quarter. Not every department took part: the customer service team continued to work five days because the firm could not find a way to cover telephone calls on the fifth day. At the end of the trial, 9 out of 10 participants said they wanted the arrangement to continue. Management will announce its decision in the spring.',
    sum: '직원 250명의 제조업체가 6개월간 주 4일제를 시험했다. 급여는 그대로, 주 40시간 대신 32시간 일했다. 회의를 줄이고 거의 읽히지 않는 보고서를 없앴다. 1인당 생산량은 거의 같았고 병가는 4분의 1 줄었다. 고객 서비스팀은 참가하지 않았다. 참가자 10명 중 9명이 계속하기를 원했다. 경영진은 봄에 결정을 발표한다.',
    q: [
      { s: 'Workers in the trial received lower pay because they worked fewer hours.', a: 'B', d: 1, why: '"Workers kept the same pay" とある。', ko: '시험에 참가한 직원들은 일하는 시간이 줄어서 급여가 낮아졌다.', kw: '"급여는 그대로"라고 했으므로 틀립니다.' },
      { s: 'The customer service team will join the four-day week next year.', a: 'C', d: 2, why: '顧客サービス部門が参加しなかった理由は書かれているが、今後参加するかどうかは書かれていない。', ko: '고객 서비스팀은 내년에 주 4일제에 참가한다.', kw: '참가하지 않은 이유만 나오고, 앞으로 참가하는지는 나오지 않습니다.' },
      { s: 'Sick leave decreased during the trial.', a: 'A', d: 1, why: '"Sick leave fell by a quarter." とある。', ko: '시험 기간 동안 병가가 줄었다.', kw: '병가가 4분의 1 줄었다고 했습니다.' },
      { s: 'Management has already decided to make the four-day week permanent.', a: 'B', d: 2, why: '"Management will announce its decision in the spring." とある。決定はこれから発表されるので、「すでに恒久化を決めた」とは言えない。', ko: '경영진은 이미 주 4일제를 영구적으로 하기로 결정했다.', kw: '"봄에 결정을 발표한다"고 했습니다. 아직 결정이 나오지 않았습니다.' },
    ],
  },
  {
    p: 'A language-learning app studied how its users practise. It found that users who studied for ten minutes every day remembered more words after three months than users who studied for seventy minutes once a week, even though the total study time was the same. The app\'s researchers believe that short, frequent sessions give the brain more chances to recall information before it is forgotten. The study also found that users who set a reminder on their phone were twice as likely to keep studying for more than a month. However, the study only looked at vocabulary. The researchers said they did not know whether the same pattern would be found for speaking or writing skills.',
    sum: '한 언어 학습 앱이 이용자의 학습 방식을 조사했다. 매일 10분 공부한 사람이 주 1회 70분 공부한 사람보다 3개월 뒤 단어를 더 많이 기억했다(총 학습 시간은 같음). 알림을 설정한 사람은 한 달 넘게 계속할 가능성이 2배였다. 다만 조사 대상은 어휘뿐이고, 말하기·쓰기에도 같은지는 모른다고 했다.',
    q: [
      { s: 'The two groups compared in the study spent the same total amount of time studying.', a: 'A', d: 2, why: '"even though the total study time was the same" とある(毎日10分×7日=70分、週1回70分)。', ko: '조사에서 비교한 두 그룹은 총 학습 시간이 같았다.', kw: '"총 학습 시간은 같았다"고 했습니다(매일 10분 × 7일 = 70분).' },
      { s: 'Users who studied once a week remembered more words than users who studied every day.', a: 'B', d: 1, why: '本文では、毎日10分学習した人のほうが多く覚えていた。設問文は逆。', ko: '주 1회 공부한 사람이 매일 공부한 사람보다 단어를 더 많이 기억했다.', kw: '더 많이 기억한 쪽은 매일 공부한 사람이므로 반대입니다.' },
      { s: 'Short daily sessions are also more effective for improving speaking skills.', a: 'C', d: 2, why: '"they did not know whether the same pattern would be found for speaking or writing skills" とある。', ko: '짧은 매일 학습은 말하기 실력 향상에도 더 효과적이다.', kw: '말하기·쓰기에도 같은지는 "모른다"고 했으므로 판단할 수 없습니다.' },
      { s: 'Users who set a reminder were more likely to continue studying for over a month.', a: 'A', d: 1, why: '"twice as likely to keep studying for more than a month" とある。', ko: '알림을 설정한 사람은 한 달 넘게 공부를 계속할 가능성이 더 높았다.', kw: '가능성이 2배였다고 했으므로 맞습니다.' },
    ],
  },
];

function build(src, { prefix, category, test_name, choices, head }) {
  const out = [];
  src.forEach((P, pi) => {
    P.q.forEach((x, qi) => {
      out.push({
        id: `${prefix}-${String(pi + 1).padStart(2, '0')}-${qi + 1}`,
        exam: 'SHL',
        test_name,
        category,
        difficulty: x.d,
        passage_ja: P.p,
        question_ja: `${head}\n${x.s}`,
        choices: [choices.A, choices.B, choices.C],
        answer: choices[x.a],
        explanation_short_ja: `正解は ${x.a}。${x.why}`,
        explanation_detail_ja: [
          `設問文: ${x.s}`,
          `根拠: ${x.why}`,
          x.a === 'A' ? '判定: 本文に書かれている、または本文から必ず導ける → A' : x.a === 'B' ? '判定: 本文の記述と食い違う → B' : '判定: 本文に手がかりがなく、正しいとも誤りとも言えない → C',
        ],
        explanation_ko: `지문 요지: ${P.sum}\n설문: ${x.ko}\n정답 ${KO_LABEL[x.a]}: ${x.kw}`,
        tip: TIP[x.a],
        reviewed: true,
      });
    });
  });
  return out;
}

const dir = process.argv[2];
const gab = build([...GAB, ...GAB2], { prefix: 'gababc', category: '論理的読解(本番形式・3択)', test_name: 'GAB', choices: JA, head: '次の設問文について、本文の内容から判断してA・B・Cのいずれかを選びなさい。' });
const eng = build([...ENG, ...ENG2], { prefix: 'engabc', category: '英語 論理的読解(本番形式・3択)', test_name: 'GAB', choices: EN, head: 'Read the passage and decide whether the statement below is A, B or C.' });
writeFileSync(join(dir, 'shl_gab_abc.json'), JSON.stringify(gab, null, 1) + '\n');
writeFileSync(join(dir, 'shl_eigo_abc.json'), JSON.stringify(eng, null, 1) + '\n');
const tally = (a) => a.reduce((m, x) => { const k = 'ABC'[x.choices.indexOf(x.answer)]; m[k] = (m[k] || 0) + 1; return m; }, {});
console.log('gab', gab.length, tally(gab), 'eng', eng.length, tally(eng));
