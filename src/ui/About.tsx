import { FOUR_CHOICE_NOTE, TYPES } from '../data/catalog';
import { BANK, verifiedCount } from '../data/bank';
import { CHECK_METHOD, EXAM_INFO } from '../data/examInfo';
import type { Nav } from '../App';
import { InfoLines, Top } from './common';

export function About({ nav }: { nav: Nav }) {
  return (
    <>
      <Top title="このアプリについて" onBack={() => nav({ name: 'home' })} />
      <main>
        <section className="stack small">
          <p style={{ margin: 0 }}>{FOUR_CHOICE_NOTE}</p>
          <p style={{ margin: 0 }}>
            問題はすべてこのアプリのオリジナルです。SPIはリクルートマネジメントソリューションズ、玉手箱Ⅲ・GAB・IMAGESは日本エス・エイチ・エルの検査で、このアプリはどちらとも関係ありません。玉手箱Ⅲ・GAB・IMAGESは別々の検査なので、分野ごとに想定した検査名を表示しています。
          </p>
          <p style={{ margin: 0 }}>計算問題は毎回数値を変えて自動生成し、答えはプログラムで計算しています。言語・推論の問題は二重に見直した問題だけを出題します。</p>
        </section>

        <section className="stack">
          <h2>分野と問題の数</h2>
          <div className="table-wrap">
            <table className="stat-table">
              <thead>
                <tr>
                  <th>分野</th>
                  <th>想定</th>
                  <th>問題</th>
                </tr>
              </thead>
              <tbody>
                {TYPES.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td className="tiny">{t.test_name}</td>
                    <td>{t.kind === 'gen' ? '自動生成(3段階)' : `検証済み ${verifiedCount(t.id)}問`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {BANK.rejected.length > 0 && <div className="notice">形式エラーで読み込まなかった問題: {BANK.rejected.map((r) => r.id).join(', ')}</div>}
        </section>

        <section className="stack">
          <h2>実際の試験の情報と出典</h2>
          <div className="tiny muted">{CHECK_METHOD}</div>
          {Object.values(EXAM_INFO).map((e) => (
            <div className="card" key={e.id}>
              <h3>{e.title}</h3>
              <InfoLines lines={e.lines} />
            </div>
          ))}
          <div className="tiny muted">アプリの「練習用の制限時間」はこのアプリ独自の目安で、実際の試験時間ではありません。</div>
        </section>
      </main>
    </>
  );
}
