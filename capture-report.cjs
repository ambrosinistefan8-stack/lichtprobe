const { open } = require('node:fs/promises');
const path = require('node:path');
const { run } = require('node:test');
const { validate } = require('./model.js');

async function main() {
  const destination = process.argv[2];
  if (!destination || path.extname(destination).toLowerCase() !== '.json') {
    throw new Error('Use node capture-report.cjs report.json [--preview-checked]');
  }
  const stream = run({ files: [path.join(__dirname, 'tests.cjs')] });
  const tests = [];
  for await (const event of stream) {
    if ((event.type === 'test:pass' || event.type === 'test:fail') && event.data.nesting === 0) {
      if (event.data.details?.type !== 'suite') {
        tests.push({ name: event.data.name.slice(0, 80), passed: event.type === 'test:pass' && !event.data.skip && !event.data.todo });
      }
    }
  }
  const report = validate({
    name: 'Lichtprobe – Node-Testlauf',
    preview: process.argv.includes('--preview-checked'),
    review: 'pending',
    tests
  });
  const output = await open(destination, 'wx');
  try {
    await output.writeFile(JSON.stringify(report, null, 2) + '\n');
  } finally {
    await output.close();
  }
  console.log(`Prüfbericht gespeichert. ${report.tests.filter(test => test.passed).length}/${report.tests.length} Tests bestanden. Review offen.`);
  if (report.tests.some(test => !test.passed)) process.exitCode = 1;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
