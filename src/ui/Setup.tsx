import { useState } from 'react';
import type { Difficulty, Exam } from '../core/types';
import { FOUR_CHOICE_NOTE, typeById } from '../data/catalog';
import { bankItemsFor, verifiedCount } from '../data/bank';
import { EXAM_INFO } from '../data/examInfo';
import { makeSession, omakase, questionsForType } from '../store/logic';
import type { Mode } from '../store/model';
import { saveActive, updateSettings, useStore } from '../store/state';
import type { Nav } from '../App';
import { InfoLines, Top } from './common';

const practiceSecFor = (id: string) => typeById(id)?.practiceSec ?? 60;

export function Setup({ nav, typeId, exam }: { nav: Nav; typeId?: string; exam?: Exam }) {
  const st = useStore();
  const t = typeId ? typeById(typeId) : undefined;
  const [diff, setDiff] = useState<Difficulty | 0>(t?.kind === 'gen' ? 1 : 0);
  const [count, setCount] = useState(st.settings.count);
  const [mode, setMode] = useState<Mode>('study');
  const [err, setErr] = useState<string | null>(null);
  const info = t ? EXAM_INFO[t.infoId] : exam === 'SHL' ? null : EXAM_INFO.spi;
  const bankAvail = t?.kind === 'bank' ? bankItemsFor(t.id, diff === 0 ? undefined : diff).length : Infinity;

  const start = () => {
    updateSettings({ count });
    const attempts = [...st.attempts.values()];
    const qs = t ? questionsForType(t.id, diff, count, new Set(attempts.map((a) => a.qid))) : omakase(exam!, attempts, count);
    if (!qs.length) {
      setErr('この条件で出せる問題がありません。難易度を変えてください。');
      return;
    }
    const label = t ? `${t.name}${t.kind === 'gen' ? `(${diff === 0 ? 'ミックス' : `難易度${diff}`})` : ''}` : `おまかせ(${exam === 'SPI' ? 'SPI' : '玉手箱・SHL系'})`;
    const s = makeSession({ mode, label, items: qs.map((q) => ({ q, kind: 'new' })), practiceSecFor });
    saveActive(s);
    nav({ name: 'quiz' });
  };

  const totalSec = t ? t.practiceSec * count : null;
  return (
    <>
      <Top title={t ? t.name : 'おまかせ'} onBack={() => nav({ name: 'home' })} />
      <main>
        <div className="stack">
          <h2>{t ? `${t.name}(${t.name_ko})` : `おまかせ・${exam === 'SPI' ? 'SPI' : '玉手箱・SHL系'}`}</h2>
          <div className="small muted">
            {t ? t.testNote : 'これまでの正答率が低い分野ほど多く出題します。まだ解いていない分野も混ぜます。'}
          </div>
          {t?.kind === 'bank' && <span className="badge" style={{ alignSelf: 'flex-start' }}>検証済み {verifiedCount(t.id)}問</span>}
          {t?.kind === 'gen' && <span className="badge accent" style={{ alignSelf: 'flex-start' }}>毎回新しい数値で自動生成</span>}
        </div>

        {t?.formatNote && <div className="notice">{t.formatNote}</div>}
        <div className="tiny muted">{FOUR_CHOICE_NOTE}</div>

        {info && (
          <details className="card">
            <summary style={{ cursor: 'pointer', minHeight: 32 }}>
              <b>実際の試験について</b>
              <span className="small muted">({info.title})</span>
            </summary>
            <InfoLines lines={info.lines} />
          </details>
        )}

        <div className="practice small">
          <b>練習用の制限時間</b>(アプリ独自の目安。実際の試験時間ではありません):{' '}
          {t ? `1問 ${t.practiceSec}秒${totalSec ? ` × ${count}問 = ${Math.round(totalSec / 60)}分${totalSec % 60 ? `${totalSec % 60}秒` : ''}` : ''}` : '分野ごとの目安の合計'}
        </div>

        {t?.kind === 'gen' && (
          <fieldset>
            <legend>難易度</legend>
            <div className="seg" role="group">
              {([1, 2, 3, 0] as const).map((d) => (
                <button key={d} aria-pressed={diff === d} onClick={() => setDiff(d)}>
                  {d === 0 ? 'ミックス' : `${'★'.repeat(d)}`}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        {t?.kind === 'bank' && (
          <fieldset>
            <legend>難易度</legend>
            <div className="seg" role="group">
              {([0, 1, 2, 3] as const).map((d) => (
                <button key={d} aria-pressed={diff === d} onClick={() => setDiff(d)}>
                  {d === 0 ? 'すべて' : `${'★'.repeat(d)}(${bankItemsFor(t.id, d).length})`}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>問題数</legend>
          <div className="seg" role="group">
            {[5, 10, 20].map((n) => (
              <button key={n} aria-pressed={count === n} onClick={() => setCount(n)}>
                {n}問
              </button>
            ))}
          </div>
          {bankAvail < count && <div className="tiny muted">この条件の検証済み問題は{bankAvail}問なので、{bankAvail}問だけ出題します。</div>}
        </fieldset>

        <fieldset>
          <legend>モード</legend>
          <div className="stack" style={{ gap: 8 }}>
            {(
              [
                ['study', '学習モード', '時間制限なし。1問ごとにすぐ解説'],
                ['exam', '実戦モード', '練習用の制限時間あり。最後にまとめて採点'],
                ...(t?.perQuestion ? [['speed', '1問ごと制限', `1問${t.practiceSec}秒で自動的に次へ。速さの練習用`]] : []),
              ] as [Mode, string, string][]
            ).map(([m, name, desc]) => (
              <label key={m} className="card row" style={{ cursor: 'pointer', minHeight: 56, flexWrap: 'nowrap', border: mode === m ? '1.5px solid var(--accent)' : '1.5px solid transparent' }}>
                <input type="radio" name="mode" id={`mode-${m}`} checked={mode === m} onChange={() => setMode(m)} style={{ width: 20, height: 20 }} />
                <span>
                  <b>{name}</b>
                  <div className="small muted">{desc}</div>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {err && <div className="notice">{err}</div>}
        <div className="sticky-next">
          <button className="btn primary" onClick={start}>
            始める
          </button>
        </div>
      </main>
    </>
  );
}
