import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { TableData } from '../core/types';
import type { InfoLine } from '../data/examInfo';

/** {{式}} を等幅の数式表示にする。改行は CSS(pre-line)で表示 */
export function MathText({ text }: { text: string }) {
  const parts = text.split(/(\{\{.+?\}\})/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('{{') && p.endsWith('}}') ? (
          <span className="math" key={i}>
            {p.slice(2, -2)}
          </span>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

export function Top({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="top">
      {onBack ? (
        <button className="icon-btn" onClick={onBack} aria-label="戻る">
          ←
        </button>
      ) : (
        <span style={{ width: 8 }} />
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

export function TableView({ t }: { t: TableData }) {
  return (
    <div className="table-wrap" role="region" aria-label={t.caption ?? '表'} tabIndex={0}>
      <table>
        {t.caption && <caption>{t.caption}</caption>}
        <thead>
          <tr>
            {t.headers.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) =>
                j === 0 ? (
                  <th key={j} scope="row">
                    {c}
                  </th>
                ) : (
                  <td key={j} className={c === '?' ? 'q' : undefined}>
                    {c}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {t.note && <div className="tiny muted" style={{ padding: '6px 12px' }}>{t.note}</div>}
    </div>
  );
}

export function InfoLines({ lines }: { lines: InfoLine[] }) {
  return (
    <div>
      {lines.map((l, i) => (
        <div className="info-line" key={i}>
          <div className="row" style={{ gap: 6 }}>
            <b>{l.label}</b>
            {l.status === 'unconfirmed' ? <span className="badge warn">未確認</span> : <span className="badge">公式で確認</span>}
          </div>
          <div>{l.text}</div>
          {l.source && (
            <div className="src">
              出典: <a href={l.source} target="_blank" rel="noreferrer">{l.source}</a>(確認日 {l.checked})
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function Toast({ msg, onDone }: { msg: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [msg, onDone]);
  if (!msg) return null;
  return (
    <div className="toast" role="status">
      {msg}
    </div>
  );
}

/** クリップボードへコピー。使えない環境では選択可能なテキストを出す */
export function useCopy() {
  const [fallback, setFallback] = useState<string | null>(null);
  const copy = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      setFallback(null);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) {
          setFallback(null);
          return true;
        }
      } catch {
        /* 下で手動コピー用に表示 */
      }
      setFallback(text);
      return false;
    }
  };
  return { copy, fallback, clearFallback: () => setFallback(null) };
}

export function pctText(r: number) {
  return `${Math.round(r * 100)}%`;
}
