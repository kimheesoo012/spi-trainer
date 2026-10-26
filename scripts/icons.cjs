// public/icon.svg から PNG アイコンを作る(Playwright のブラウザで描画)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../public/icon.svg'), 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage();
  const shot = async (size, file, maskable) => {
    await p.setViewportSize({ width: size, height: size });
    const inner = maskable ? svg.replace('rx="96"', 'rx="0"').replace('viewBox="0 0 512 512"', 'viewBox="-64 -64 640 640"') : svg;
    const bg = maskable ? '#14213d' : 'transparent';
    await p.setContent(`<html><body style="margin:0;background:${bg}"><div style="width:${size}px;height:${size}px">${inner.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></body></html>`);
    await p.screenshot({ path: path.join(__dirname, '../public', file), omitBackground: !maskable });
  };
  await shot(180, 'icon-180.png', true);
  await shot(192, 'icon-192.png', false);
  await shot(512, 'icon-512.png', false);
  await shot(512, 'icon-maskable-512.png', true);
  await b.close();
})();
