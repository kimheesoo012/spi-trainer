// 携帯電話の画面サイズで主要な流れを確かめる。
// 使い方: node scripts/e2e.cjs "iPhone 13" <スクリーンショット保存先>
// 流れ: 問題を解く → 解説 → 間違いの保存 → 再挑戦 → 結果のコピー → アプリを閉じて開き直し、続きを復元 → オフライン起動
const { chromium, devices } = require('playwright');
const assert = require('assert');

const URL = process.env.APP_URL || 'http://localhost:4173/';
const deviceName = process.argv[2] || 'iPhone 13';
const out = process.argv[3] || '.';

async function noHorizontalScroll(p, where) {
  const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  assert(r.sw <= r.w + 1, `${where}: 横スクロールが発生 (${r.sw} > ${r.w})`);
}

async function answer(p, wantWrong) {
  // 正解の位置は画面からは分からないので、選んだ後の表示(○/×)で判定する
  await p.locator('.choice').first().waitFor();
  const n = await p.locator('.choice').count();
  assert.strictEqual(n, 4);
  for (const b of await p.locator('.choice').all()) {
    const h = await b.boundingBox();
    assert(h.height >= 48, `選択肢の高さが48px未満: ${h.height}`);
  }
  await p.locator('.choice').nth(wantWrong ? 0 : 1).click();
  await p.locator('.verdict').waitFor();
  return (await p.locator('.verdict').innerText()).includes('正解') && !(await p.locator('.verdict').innerText()).includes('不正解');
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices[deviceName], permissions: ['clipboard-read', 'clipboard-write'] });
  let p = await ctx.newPage();
  const errors = [];
  const watch = (pg) => {
    pg.on('pageerror', (e) => errors.push(String(e)));
    pg.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  };
  watch(p);
  await p.goto(URL);
  await p.waitForSelector('.type-row');
  await noHorizontalScroll(p, 'home');

  // 1) 割合を学習モードで5問。間違えた問題を作る
  await p.click('.type-row:has-text("割合")');
  await p.click('.seg button:has-text("5問")');
  await p.click('text=始める');
  let wrongs = 0;
  for (let i = 0; i < 5; i++) {
    const ok = await answer(p, true);
    if (!ok) wrongs++;
    if (i === 0) {
      // 解いている間は韓国語を出さない → 解説後にタップで表示
      await p.click('text=詳しい解説');
      await p.locator('.detail').waitFor();
      assert(await p.locator('.detail li').count() >= 2, '詳しい解説の手順がない');
      assert.strictEqual(await p.locator('.ko').count(), 0, '韓国語がタップ前に表示されている');
      await p.click('.toggle[lang="ko"]');
      await p.locator('.ko').waitFor();
      await noHorizontalScroll(p, 'explanation');
      await p.screenshot({ path: `${out}/${deviceName}-explain.png`, fullPage: false });
    }
    await p.click('.sticky-next .btn.primary');
  }
  await p.locator('.score').waitFor();
  const score = await p.locator('.score b').innerText();
  console.log('result:', score.replace(/\s+/g, ' '), 'wrong:', wrongs);
  assert(wrongs >= 1, '間違いを作れなかった');
  await p.screenshot({ path: `${out}/${deviceName}-result.png` });

  // 2) 間違えた問題 → 再挑戦(同じ問題と新しい数値の問題)
  await p.click('text=間違えた問題だけ');
  await p.locator('text=復習待ち').first().waitFor();
  const waiting = await p.locator('main b:has-text("復習待ち")').innerText();
  console.log(waiting);
  assert(waiting.includes(String(wrongs)), `復習待ちの数が合わない: ${waiting}`);
  await p.click('text=間違えた問題だけ解く');
  await p.locator('.badge:has-text("同じ問題で再挑戦")').waitFor();
  // 再挑戦では前回の答え・正解が見えない(選択肢に○×や選択状態がない)
  assert.strictEqual(await p.locator('.choice.correct, .choice.wrong, .choice.selected').count(), 0, '再挑戦で前回の答えが見えている');
  const reviewTotal = Number((await p.locator('.quiz-bar .num').innerText()).split('/')[1]);
  assert.strictEqual(reviewTotal, wrongs * 2, '同じ問題+新しい数値で2問ずつにならない');
  let sawVariant = false;
  for (let i = 0; i < reviewTotal; i++) {
    if (await p.locator('.badge:has-text("新しい数値で確認")').count()) sawVariant = true;
    await answer(p, false);
    await p.click('.sticky-next .btn.primary');
  }
  assert(sawVariant, '新しい数値の問題が出ていない');
  await p.locator('.score').waitFor();

  // 3) 記録 → 今日の結果をコピー
  await p.click('.top .icon-btn'); // ホームへ
  await p.click('text=今日の記録');
  await p.click('text=今日の結果をコピー');
  await p.waitForTimeout(300);
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  console.log('--- copied ---\n' + clip + '\n--------------');
  assert(clip.includes('解いた問題: ' + (5 + reviewTotal) + '問'), 'コピー内容の問題数が合わない');
  await noHorizontalScroll(p, 'stats');
  await p.screenshot({ path: `${out}/${deviceName}-stats.png`, fullPage: true });

  // 4) 実戦モードの途中でアプリを閉じ、開き直して復元
  await p.click('.top .icon-btn');
  await p.click('.seg button:has-text("玉手箱")');
  await p.click('.type-row:has-text("図表の読み取り")');
  await p.click('label:has-text("実戦モード")');
  await p.click('text=始める');
  await p.locator('.choice').first().waitFor();
  await p.locator('.choice').nth(2).click();
  await p.click('.sticky-next .btn.primary');
  await p.locator('.quiz-bar .num:has-text("2")').waitFor();
  const qBefore = await p.locator('.qtext').innerText();
  const tableBefore = await p.locator('.table-wrap').innerText();
  const choicesBefore = await p.locator('.choices').innerText();
  await noHorizontalScroll(p, 'table question');
  await p.screenshot({ path: `${out}/${deviceName}-table.png` });
  await p.waitForTimeout(500);
  await p.close(); // アプリを閉じる
  p = await ctx.newPage();
  watch(p);
  await p.goto(URL);
  await p.locator('.choice').first().waitFor();
  assert.strictEqual(await p.locator('.qtext').innerText(), qBefore, '開き直すと問題文が変わった');
  assert.strictEqual(await p.locator('.table-wrap').innerText(), tableBefore, '開き直すと表が変わった');
  assert.strictEqual(await p.locator('.choices').innerText(), choicesBefore, '開き直すと選択肢の順番が変わった');
  assert((await p.locator('.quiz-bar .num').innerText()).startsWith('2'), '何問目かが復元されていない');
  console.log('restore: OK (2問目・同じ問題・同じ選択肢順)');

  // 5) オフラインで開けるか(サービスワーカーのキャッシュ)
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForTimeout(500);
  await ctx.setOffline(true);
  await p.reload();
  await p.locator('.choice').first().waitFor({ timeout: 5000 });
  console.log('offline reload: OK');
  await ctx.setOffline(false);

  assert.deepStrictEqual(errors, [], 'コンソールエラー: ' + errors.join('\n'));
  console.log(`ALL OK on ${deviceName}`);
  await browser.close();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
