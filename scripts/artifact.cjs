// dist-single/index.html を、外側の <html>/<head>/<body> を持たない1ファイル(Artifact 公開用)に変換する
const fs = require('fs');
const src = fs.readFileSync('dist-single/index.html', 'utf8');
const title = /<title>[\s\S]*?<\/title>/.exec(src)[0];
const styles = [...src.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...src.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const body = /<body>([\s\S]*?)<\/body>/.exec(src)[1].replace(/<script[\s\S]*?<\/script>/g, '').trim();
const out = [title, '<meta name="claude:viewport-fit-sides" content="cover">', ...styles, body, ...scripts].join('\n');
fs.mkdirSync('dist-artifact', { recursive: true });
fs.writeFileSync('dist-artifact/spi-trainer.html', out);
console.log('dist-artifact/spi-trainer.html', out.length, 'bytes', 'scripts', scripts.length, 'styles', styles.length);
