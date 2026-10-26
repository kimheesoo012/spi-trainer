import { useEffect, useState } from 'react';
import type { Question } from '../core/types';
import { modeLabel } from '../store/logic';
import type { Session } from '../store/model';
import { discardActive, finishSession, getState, recordAttempt, saveActive, setActiveLocal, useStore } from '../store/state';
import type { Nav } from '../App';
import { MathText, TableView, Top } from './common';
import { ChoiceButtons, Explanation } from './Explanation';

function mmss(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function QuestionBody({ q }: { q: Question }) {
  return (
    <div className="stack" style={{ gap: 14 }}>
      {q.passage_ja && <div className="passage">{q.passage_ja}</div>}
      <div className="qtext">
        {q.question_ja.split('\n').map((line, i) =>
          line.includes('□') && line.includes('=') ? (
            <div key={i} className="eq" style={{ fontSize: '1.25rem', margin: '10px 0', textAlign: 'center' }}>
              {line}
            </div>
          ) : line.startsWith('※') ? (
            <div key={i} className="tiny muted" style={{ marginTop: 6, lineHeight: 1.6 }}>
              {line}
            </div>
          ) : (
            <div key={i}>
              <MathText text={line} />
            </div>
          ),
        )}
      </div>
      {q.table && <TableView t={q.table} />}
    </div>
  );
}

/** 次の問題へ進める(最後なら null) */
function advanced(s: Session): Session | null {
  if (s.index + 1 >= s.items.length) return null;
  return { ...s, index: s.index + 1 };
}

export function Quiz({ nav }: { nav: Nav }) {
  const st = useStore();
  const s = st.active;
  const [menu, setMenu] = useState(false);

  // タイマー: 250msごとに現在の問題の所要時間を足す。画面が隠れている間は数えない。保存は3秒ごと
  useEffect(() => {
    let last = performance.now();
    let lastSave = Date.now();
    const id = setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const cur = getState().active;
      if (!cur || cur.status !== 'active' || document.hidden) return;
      const idx = cur.index;
      if (cur.mode === 'study' && cur.revealed[idx]) return;
      const times = cur.times.slice();
      times[idx] += dt;
      let next: Session = { ...cur, times, elapsedMs: cur.elapsedMs + (cur.mode === 'exam' ? dt : 0) };
      if (cur.mode === 'exam' && next.limitMs && next.elapsedMs >= next.limitMs) {
        finishSession(next);
        nav({ name: 'result' });
        return;
      }
      if (cur.mode === 'speed' && next.perQMs && times[idx] >= next.perQMs) {
        times[idx] = next.perQMs;
        const adv = advanced(next);
        if (!adv) {
          finishSession(next);
          nav({ name: 'result' });
          return;
        }
        next = adv;
        saveActive(next);
        lastSave = Date.now();
        return;
      }
      if (Date.now() - lastSave > 3000) {
        saveActive(next);
        lastSave = Date.now();
      } else setActiveLocal(next);
    }, 250);
    const flush = () => {
      const cur = getState().active;
      if (cur) saveActive(cur);
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [nav]);

  if (!s) {
    return (
      <>
        <Top title="問題" onBack={() => nav({ name: 'home' })} />
        <main>
          <p>進行中の問題はありません。</p>
          <button className="btn primary" onClick={() => nav({ name: 'home' })}>
            ホームへ
          </button>
        </main>
      </>
    );
  }

  const i = s.index;
  const n = s.items.length;
  const q = s.items[i].q;
  const chosen = s.answers[i];
  const revealed = s.mode === 'study' && s.revealed[i];
  const kind = s.items[i].kind;

  const choose = (k: number) => {
    const cur = getState().active!;
    const answers = cur.answers.slice();
    answers[cur.index] = k;
    if (cur.mode === 'study') {
      if (cur.revealed[cur.index]) return;
      const revealedArr = cur.revealed.slice();
      revealedArr[cur.index] = true;
      const next = { ...cur, answers, revealed: revealedArr };
      saveActive(next);
      recordAttempt(next, cur.index);
      return;
    }
    if (cur.mode === 'speed') {
      const next = { ...cur, answers };
      const adv = advanced(next);
      if (!adv) {
        finishSession(next);
        nav({ name: 'result' });
      } else saveActive(adv);
      return;
    }
    saveActive({ ...cur, answers });
  };

  const goNext = () => {
    const cur = getState().active!;
    const adv = advanced(cur);
    if (!adv) {
      finishSession(cur);
      nav({ name: 'result' });
    } else {
      saveActive(adv);
      window.scrollTo(0, 0);
    }
  };

  let timer: string;
  let low = false;
  let bar = (i / n) * 100;
  if (s.mode === 'exam' && s.limitMs) {
    const rem = s.limitMs - s.elapsedMs;
    timer = `残り ${mmss(rem)}`;
    low = rem < 60000;
  } else if (s.mode === 'speed' && s.perQMs) {
    const rem = s.perQMs - s.times[i];
    timer = `この問題 残り ${mmss(rem)}`;
    low = rem < 4000;
    bar = (rem / s.perQMs) * 100;
  } else timer = `${mmss(s.times[i])}`;

  return (
    <>
      <Top
        title={s.label}
        onBack={() => setMenu(true)}
        right={
          <button className="icon-btn" style={{ fontSize: '0.85rem', width: 'auto', padding: '0 8px' }} onClick={() => setMenu(true)}>
            中断
          </button>
        }
      />
      <main>
        <div className="stack" style={{ gap: 6 }}>
          <div className="quiz-bar">
            <span className="num">
              <b style={{ color: 'var(--ink)' }}>{i + 1}</b> / {n}
            </span>
            <span>{modeLabel(s.mode)}</span>
            {kind !== 'new' && <span className="badge">{kind === 'retry_same' ? '同じ問題で再挑戦' : '新しい数値で確認'}</span>}
            <span className="spacer" />
            <span className={`timer ${low ? 'low' : ''}`} aria-live="off">
              {timer}
            </span>
          </div>
          <div className="progress" aria-hidden="true">
            <span style={{ width: `${bar}%` }} />
          </div>
        </div>

        {menu && (
          <div className="confirm" role="dialog" aria-label="中断メニュー">
            <b>どうしますか?</b>
            <button className="btn block" onClick={() => nav({ name: 'home' })}>
              中断してホームへ(あとで続きから)
            </button>
            {s.mode !== 'study' || s.revealed.some(Boolean) ? (
              <button
                className="btn block"
                onClick={() => {
                  finishSession(getState().active!);
                  nav({ name: 'result' });
                }}
              >
                ここで終了して結果を見る{s.mode !== 'study' ? '(未回答は不正解)' : ''}
              </button>
            ) : null}
            <button
              className="btn block danger"
              onClick={() => {
                discardActive();
                nav({ name: 'home' });
              }}
            >
              この回を破棄する{s.mode === 'study' ? '(解いた問題の記録は残る)' : '(記録しない)'}
            </button>
            <button className="btn ghost block" onClick={() => setMenu(false)}>
              問題に戻る
            </button>
          </div>
        )}

        <QuestionBody q={q} />
        <ChoiceButtons q={q} chosen={chosen} reveal={revealed} onChoose={choose} />
        {revealed && <Explanation key={q.id + i} q={q} chosen={chosen} />}
        {(revealed || s.mode === 'exam') && (
          <div className="sticky-next">
            <button className="btn primary" onClick={goNext}>
              {i + 1 >= n ? (s.mode === 'exam' ? '採点する' : '結果を見る') : s.mode === 'exam' && chosen === null ? '未回答のまま次へ' : '次の問題'}
            </button>
          </div>
        )}
        {s.mode === 'speed' && (
          <div className="sticky-next">
            <button className="btn ghost" onClick={goNext}>
              パス
            </button>
          </div>
        )}
      </main>
    </>
  );
}
