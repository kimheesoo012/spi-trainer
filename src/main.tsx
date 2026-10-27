import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getState, initStore } from './store/state';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

initStore().then(() => root.render(<App />));

// オフライン用のキャッシュ(対応ブラウザ・HTTPS配信時のみ)
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'single') {
  window.addEventListener('load', () => {
    // 新しい版が入れ替わったら、問題を解いている途中でなければ読み込み直す(次に開いたときに新版になる)
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !getState().active) location.reload();
    });
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 使えない環境ではキャッシュなしで動く */
    });
  });
}
