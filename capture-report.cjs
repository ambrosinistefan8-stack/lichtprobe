const { open } = require('node:fs/promises');
const path = require('node:path');
const { run } = require('node:test');
const { validate } = require('./model.js');

async function main() {
  const [destination, flag, ...surplus] = process.argv.slice(2);
  const previewChecked = flag === '--preview-checked';
  if (!destination || destination.startsWith('-') || path.extname(destination).toLowerCase() !== '.json'
      || (flag !== undefined && !previewChecked) || surplus.length > 0) {
    throw new Error('Use node capture-report.cjs report.json [--preview-checked]');
  }
  const stream = run({ files: [path.join(__dirname, 'tests.cjs')] });
  const tests = [];
  // Node reports children before their parent. Each slot tracks the results of one parent's children.
  const childFailures = [];
  for await (const { type, data } of stream) {
    if (type !== 'test:pass' && type !== 'test:fail') continue;

    const { details, nesting, name, skip, todo } = data;
    const passed = type === 'test:pass' && !skip && !todo;
    const hasChildren = childFailures[nesting] !== undefined;
    const hasFailedChild = childFailures[nesting] === true;
    childFailures.length = nesting;
    if (nesting > 0) {
      const parentDepth = nesting - 1;
      childFailures[parentDepth] = childFailures[parentDepth] === true || !passed;
    }

    if (passed && (hasChildren || details?.type === 'suite')) continue;
    if (hasFailedChild && details?.error?.failureType === 'subtestsFailed') continue;

    tests.push({ name: name.slice(0, 80), passed });
  }
  const report = validate({
    name: 'Lichtprobe – Node-Testlauf',
    preview: previewChecked,
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
