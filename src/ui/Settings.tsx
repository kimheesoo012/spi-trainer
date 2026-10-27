import { useRef, useState } from 'react';
import { makeBackup, parseBackup, SCHEMA_VERSION } from '../store/backup';
import { clearAll, importData, updateSettings, useStore } from '../store/state';
import type { Nav } from '../App';
import { Toast, Top, useCopy } from './common';

/** 1ファイル版(Artifact 等)ではダウンロードが使えない */
const SINGLE = import.meta.env.MODE === 'single';

export function Settings({ nav }: { nav: Nav }) {
  const st = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [paste, setPaste] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { copy, fallback } = useCopy();

  const backupText = () => JSON.stringify(makeBackup([...st.attempts.values()], [...st.mistakes.values()], st.settings));

  const doImport = (text: string) => {
    const r = parseBackup(text);
    if (!r.ok) {
      setImportMsg({ ok: false, text: `取り込みませんでした: ${r.error} 今の記録はそのままです。` });
      return;
    }
    const n = importData(r.data);
    setImportMsg({ ok: true, text: `取り込みました: 解答記録 ${n.attempts}件、復習リスト ${n.mistakes}件を追加・更新(同じ記録は重複させません)。` });
  };

  const download = () => {
    try {
      const blob = new Blob([backupText()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `spi-tamate-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setToast('ファイルを書き出しました');
    } catch {
      setToast('この環境ではファイル保存ができません。「テキストをコピー」を使ってください');
    }
  };

  return (
    <>
      <Top title="設定" onBack={() => nav({ name: 'home' })} />
      <main>
        <fieldset>
          <legend>1日の目標(問題数)</legend>
          <div className="seg" role="group">
            {[5, 10, 20, 30].map((n) => (
              <button key={n} aria-pressed={st.settings.dailyGoal === n} onClick={() => updateSettings({ dailyGoal: n })}>
                {n}問
              </button>
            ))}
          </div>
          <div className="tiny muted">連続記録は1問でも解けば続きます。目標はホームの輪とカレンダーの達成印に使います。</div>
        </fieldset>

        <fieldset>
          <legend>韓国語の解説</legend>
          <div className="seg" role="group">
            <button aria-pressed={st.settings.koMode === 'tap'} onClick={() => updateSettings({ koMode: 'tap' })}>
              タップで表示
            </button>
            <button aria-pressed={st.settings.koMode === 'always'} onClick={() => updateSettings({ koMode: 'always' })}>
              解説と一緒に表示
            </button>
          </div>
          <div className="tiny muted">解いている間は、どちらの設定でも韓国語は表示しません。</div>
        </fieldset>

        <fieldset>
          <legend>画面の色</legend>
          <div className="seg" role="group">
            {(
              [
                ['system', '端末に合わせる'],
                ['light', 'ライト'],
                ['dark', 'ダーク'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} aria-pressed={st.settings.theme === v} onClick={() => updateSettings({ theme: v })}>
                {l}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="card stack">
          <h2>記録の書き出し・取り込み</h2>
          <div className="small muted">
            保存先: {st.backend === 'indexeddb' ? 'この端末のブラウザ(IndexedDB)' : st.backend === 'localstorage' ? 'この端末のブラウザ(localStorage)' : '一時メモリ(再読み込みで消えます)'}。形式バージョン {SCHEMA_VERSION}。
          </div>
          {SINGLE && <div className="tiny muted">この版(1ファイル版)ではファイル保存ができないため、「テキストをコピー」でメモ帳などに保存してください。</div>}
          <div className="row" style={{ display: 'grid', gridTemplateColumns: SINGLE ? '1fr' : '1fr 1fr' }}>
            {!SINGLE && (
              <button className="btn" onClick={download}>
                ファイルに保存
              </button>
            )}
            <button
              className="btn"
              onClick={async () => {
                const ok = await copy(backupText());
                setToast(ok ? '記録をテキストでコピーしました' : '下の文章を選択してコピーしてください');
              }}
            >
              テキストをコピー
            </button>
          </div>
          {fallback && <textarea readOnly value={fallback} id="backup-fallback" onFocus={(e) => e.currentTarget.select()} />}
          <input
            ref={fileRef}
            type="file"
            id="import-file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) doImport(await f.text());
              e.target.value = '';
            }}
          />
          <button className="btn" onClick={() => fileRef.current?.click()}>
            ファイルから取り込む
          </button>
          <label className="small" htmlFor="import-paste">
            またはテキストを貼り付けて取り込む
          </label>
          <textarea id="import-paste" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"app":"spi-tamate-trainer", ...}' />
          <button className="btn" disabled={!paste.trim()} onClick={() => doImport(paste)}>
            貼り付けた内容を取り込む
          </button>
          {importMsg && <div className={importMsg.ok ? 'card small' : 'notice'}>{importMsg.text}</div>}
          <div className="tiny muted">形式が正しくないファイルは全体を拒否し、今の記録は変更しません。</div>
        </section>

        <section className="stack">
          {!confirmClear ? (
            <button className="btn danger" onClick={() => setConfirmClear(true)}>
              すべての記録を削除
            </button>
          ) : (
            <div className="confirm">
              <b>解答記録・復習リスト・設定をすべて削除します。元に戻せません。</b>
              <button
                className="btn danger block"
                onClick={async () => {
                  await clearAll();
                  setConfirmClear(false);
                  setToast('削除しました');
                }}
              >
                削除する
              </button>
              <button className="btn ghost block" onClick={() => setConfirmClear(false)}>
                やめる
              </button>
            </div>
          )}
        </section>
        <button className="btn ghost" onClick={() => nav({ name: 'about' })}>
          このアプリについて・試験情報の出典
        </button>
      </main>
      <Toast msg={toast} onDone={() => setToast(null)} />
    </>
  );
}
