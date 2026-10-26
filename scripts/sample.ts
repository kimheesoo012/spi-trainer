import { generate } from '../src/gen/registry';
const [typeId, diff, n] = process.argv.slice(2);
for (let i = 1; i <= Number(n ?? 2); i++) {
  const q = generate(typeId, Number(diff) as 1|2|3, i * 101);
  console.log('---', q.id, q.gen?.params.template);
  console.log(q.question_ja);
  if (q.table) console.log(JSON.stringify(q.table));
  q.choices.forEach((c, j) => console.log(j === q.answer ? ' *' : '  ', c));
  console.log('SHORT:', q.explanation_short_ja);
  console.log('STEPS:', q.steps_ja.join('\n  '));
  console.log('QUICK:', q.quick_ja.join('\n  '));
  console.log('KO:', q.explanation_ko);
}
