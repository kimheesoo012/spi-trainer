import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/** ビルド後、dist の全ファイルを先読みキャッシュする sw.js を作る(オフライン対応) */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'make-sw',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (d: string) => {
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) walk(p);
          else if (f !== 'sw.js') files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      const hash = createHash('sha256');
      for (const f of files.sort()) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const list = ['./', ...files.map((f) => `./${f}`)];
      const sw = `// 自動生成。アプリの全ファイルを先にキャッシュし、オフラインでも開けるようにする
const CACHE = 'spi-tamate-${version}';
const FILES = ${JSON.stringify(list)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('spi-tamate-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true, ignoreVary: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./') : Response.error()));
    }),
  );
});
`;
      writeFileSync(join(outDir, 'sw.js'), sw);
    },
  };
}

export default defineConfig(({ mode }) =>
  mode === 'single'
    ? {
        // 1つのHTMLにまとめた版(Artifact などファイルを1つしか置けない場所用。オフラインキャッシュなし)
        base: './',
        plugins: [react(), viteSingleFile()],
        publicDir: false,
        build: { outDir: 'dist-single', emptyOutDir: true },
      }
    : {
        base: './',
        plugins: [react(), serviceWorker()],
        build: { outDir: 'dist', emptyOutDir: true },
      },
);
