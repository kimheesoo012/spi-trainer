// tools/bank-src/*.mjs の問題を src/data/bank/*.json に書き出す。 node tools/build-bank.mjs
import { writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'src', 'data', 'bank');
for (const f of readdirSync(join(here, 'bank-src')).filter((x) => x.endsWith('.mjs') && !x.startsWith('_'))) {
  const mod = await import(pathToFileURL(join(here, 'bank-src', f)).href);
  for (const [name, val] of Object.entries(mod)) {
    if (name === 'FILES') {
      for (const [file, items] of Object.entries(val)) {
        writeFileSync(join(out, file), JSON.stringify(items, null, 1) + '\n');
        console.log(file, items.length);
      }
    }
  }
}
