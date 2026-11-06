import { useState } from 'react';
import type { Question } from '../core/types';
import { useStore } from '../store/state';
import { MathText } from './common';

const NO = ['1', '2', '3', '4'];

/**
 * 正誤 → 直感的な解き方(手がかり) → 最速の解き方(基本より本当に速いときだけ) → 基本の解き方(折りたたみ) → 韓国語の補足
 * 最速の解き方がない問題は、基本の解き方を最初から開いておく(計算を隠さない)
 */
export function Explanation({ q, chosen, timedOut }: { q: Question; chosen: number | null; timedOut?: boolean }) {
  const { settings } = useStore();
  const hasIntuition = !!q.intuition_ja;
  const fast = q.fast_ja ?? [];
  const [basic, setBasic] = useState(!hasIntuition || fast.length === 0);
  const [ko, setKo] = useState(false);
  const ok = chosen === q.answer;
  const showKo = settings.koMode === 'always' || ko;
  const isGen = q.source === 'gen';
  return (
    <section className="explain" aria-live="polite">
      <div className={`verdict ${ok ? 'ok' : 'ng'}`}>
        <span aria-hidden="true">{ok ? '○' : '×'}</span>
        <span>{ok ? '正解' : chosen === null ? (timedOut ? '時間切れ' : '未回答') : '不正解'}</span>
      </div>
      {!ok && (
        <div>
          正解は <b>{NO[q.answer]}</b>「<MathText text={q.choices[q.answer]} />」
          {chosen !== null && (
            <span className="muted small">
              {' '}
              (選んだ答え: {NO[chosen]}「{q.choices[chosen]}」)
            </span>
          )}
        </div>
      )}
      {hasIntuition ? (
        <div className="way way-intuition">
          <h3>直感的な解き方</h3>
          {q.cue_ja && (
            <div className="cue">
              <span className="cue-label">手がかり</span>
              <MathText text={q.cue_ja} />
            </div>
          )}
          <p>
            <MathText text={q.intuition_ja!} />
          </p>
        </div>
      ) : (
        <div className="short">
          <MathText text={q.explanation_short_ja} />
        </div>
      )}
      {fast.length > 0 && (
        <div className="way way-fast">
          <h3>
            最速の解き方 <span className="badge-fast">最速</span>
          </h3>
          <ol>
            {fast.map((s, i) => (
              <li key={i}>
                <MathText text={s} />
              </li>
            ))}
          </ol>
        </div>
      )}
      {hasIntuition && (
        <button className="toggle" aria-expanded={basic} onClick={() => setBasic(!basic)}>
          {basic ? '基本の解き方を閉じる' : fast.length ? '基本の解き方' : '基本の解き方(この問題では最短)'}
        </button>
      )}
      {!hasIntuition && (
        <button className="toggle" aria-expanded={basic} onClick={() => setBasic(!basic)}>
          {basic ? '詳しい解説を閉じる' : '詳しい解説'}
        </button>
      )}
      {basic && (
        <div className="detail">
          <h3>{hasIntuition ? '基本の解き方' : isGen ? '正攻法(手順)' : '解説'}</h3>
          {hasIntuition && (
            <div className="short">
              <MathText text={q.explanation_short_ja} />
            </div>
          )}
          <ol>
            {q.steps_ja.map((s, i) => (
              <li key={i}>
                <MathText text={s} />
              </li>
            ))}
          </ol>
          {isGen && q.quick_ja.length > 0 && (
            <>
              <h3>{hasIntuition ? '補足(別の見方・わな)' : '速解き(時間を縮めるコツ)'}</h3>
              <ul>
                {q.quick_ja.map((s, i) => (
                  <li key={i}>
                    <MathText text={s} />
                  </li>
                ))}
              </ul>
            </>
          )}
          {q.tip && <div className="tip">ポイント: {q.tip}</div>}
        </div>
      )}
      {settings.koMode === 'tap' && (
        <button className="toggle" aria-expanded={ko} onClick={() => setKo(!ko)} lang="ko">
          {ko ? '한국어 해설 닫기' : '한국어 해설'}
        </button>
      )}
      {showKo && (
        <div className="ko" lang="ko">
          {q.explanation_ko}
        </div>
      )}
    </section>
  );
}

export function ChoiceButtons({
  q,
  chosen,
  reveal,
  onChoose,
  disabled,
}: {
  q: Question;
  chosen: number | null;
  reveal: boolean;
  onChoose: (i: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="choices" role="group" aria-label="選択肢">
      {q.choices.map((c, i) => {
        let cls = 'choice';
        let mark = '';
        if (reveal) {
          if (i === q.answer) {
            cls += ' correct';
            mark = '○';
          } else if (i === chosen) {
            cls += ' wrong';
            mark = '×';
          }
        } else if (i === chosen) cls += ' selected';
        const why = reveal && i !== q.answer ? (q.gen?.params.wrongWhy as Record<string, string> | undefined)?.[c] : undefined;
        return (
          <button key={i} className={cls} onClick={() => onChoose(i)} disabled={reveal || disabled} aria-pressed={i === chosen}>
            <span className="no">{NO[i]}</span>
            <span className="txt">
              <MathText text={c} />
              {why && <span className="why">{i === chosen ? 'この誤り: ' : ''}{why}</span>}
            </span>
            {mark && (
              <span className="mark" aria-label={mark === '○' ? '正解' : '選んだ答え(不正解)'}>
                {mark}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
