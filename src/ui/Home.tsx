import type { Exam } from '../core/types';
import { FOUR_CHOICE_NOTE, TYPES } from '../data/catalog';
import { verifiedCount } from '../data/bank';
import { daySummary, fmtDuration, typeStats } from '../store/logic';
import { localDay } from '../store/model';
import { updateSettings, useStore } from '../store/state';
import type { Nav } from '../App';
import { pctText, Top } from './common';

export function Home({ nav }: { nav: Nav }) {
  const st = useStore();
  const exam = st.settings.lastExam;
  const attempts = [...st.attempts.values()];
  const today = daySummary(attempts, localDay(Date.now()));
  const stats = new Map(typeStats(attempts).map((s) => [s.typeId, s]));
  const openMistakes = [...st.mistakes.values()].filter((m) => !m.cleared).length;
  const sections = [...new Set(TYPES.filter((t) => t.exam === exam).map((t) => t.section))];

  return (
    <>
      <Top
        title="SPI・玉手箱 練習帳"
        right={
          <button className="icon-btn" onClick={() => nav({ name: 'settings' })} aria-label="設定">
            ⚙
          </button>
        }
      />
      <main>
        {st.active && (
          <div className="card stack">
            <div>
              <b>解きかけの問題があります</b>
              <div className="small muted">
                {st.active.label}・{st.active.index + 1}/{st.active.items.length}問目
              </div>
            </div>
            <button className="btn primary block" onClick={() => nav({ name: 'quiz' })}>
              続きから解く
            </button>
          </div>
        )}

        <button className="card stack" style={{ border: 0, textAlign: 'left', cursor: 'pointer' }} onClick={() => nav({ name: 'stats' })}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>今日の記録</h2>
            <span className="small muted">記録をすべて見る →</span>
          </div>
          <div className="today">
            <div>
              <span className="tiny muted">解いた問題</span>
              <b>{today.n}問</b>
            </div>
            <div>
              <span className="tiny muted">学習時間</span>
              <b>{fmtDuration(today.timeMs)}</b>
            </div>
            <div>
              <span className="tiny muted">正答率</span>
              <b>{today.n ? pctText(today.correct / today.n) : '—'}</b>
            </div>
          </div>
        </button>

        <div className="seg" role="group" aria-label="検査の種類">
          {(['SPI', 'SHL'] as Exam[]).map((e) => (
            <button key={e} aria-pressed={exam === e} onClick={() => updateSettings({ lastExam: e })}>
              {e === 'SPI' ? 'SPI' : '玉手箱・SHL系'}
            </button>
          ))}
        </div>

        <div className="row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <button className="btn primary" onClick={() => nav({ name: 'omakase', exam })}>
            おまかせ
            <div className="tiny" style={{ fontWeight: 400 }}>苦手な分野を多めに</div>
          </button>
          <button className="btn" onClick={() => nav({ name: 'review' })}>
            間違えた問題
            <div className="tiny muted" style={{ fontWeight: 400 }}>
              復習待ち {openMistakes}問
            </div>
          </button>
        </div>

        {sections.map((sec) => (
          <section key={sec} className="stack">
            <div className="section-label">{sec}</div>
            <div className="type-list">
              {TYPES.filter((t) => t.exam === exam && t.section === sec).map((t) => {
                const s = stats.get(t.id);
                const cnt = t.kind === 'bank' ? verifiedCount(t.id) : 0;
                return (
                  <button key={t.id} className="type-row" onClick={() => nav({ name: 'setup', typeId: t.id })} disabled={t.kind === 'bank' && cnt === 0}>
                    <span className="name">
                      {t.name}
                      <div className="tiny muted" style={{ fontWeight: 400 }}>
                        {t.test_name === 'SPI3' ? 'SPI3 類似' : `${t.test_name} 類似`}
                      </div>
                    </span>
                    <span className="meta">
                      {t.kind === 'gen' ? <span className="badge accent">自動生成</span> : <span className="badge">検証済み {cnt}問</span>}
                      <span className="rate">{s ? pctText(s.rate) : '—'}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <p className="tiny muted" style={{ margin: 0 }}>
          {FOUR_CHOICE_NOTE}
          <br />
          正答率は累計。<button className="btn ghost" style={{ minHeight: 0, padding: 0, border: 0, color: 'var(--accent)', fontWeight: 400 }} onClick={() => nav({ name: 'about' })}>このアプリについて・試験情報の出典</button>
        </p>
      </main>
    </>
  );
}
