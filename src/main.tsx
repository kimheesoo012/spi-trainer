import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initStore } from './store/state';
import './styles.css';

const root = createRoot(document.getElementById('root')!);

initStore().then(() => root.render(<App />));

// オフライン用のキャッシュ(対応ブラウザ・HTTPS配信時のみ)
if ('serviceWorker' in navigator && import.meta.env.PROD && import.meta.env.MODE !== 'single') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 使えない環境ではキャッシュなしで動く */
    });
  });
}
