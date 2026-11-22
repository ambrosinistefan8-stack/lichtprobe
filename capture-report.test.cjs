const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { copyFileSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function captureFixture(t, source) {
  const folder = mkdtempSync(join(__dirname, '.capture-report-check-'));
  const files = ['capture-report.cjs', 'model.js', 'tests.cjs', 'report.json'];
  t.after(() => {
    for (const name of files) rmSync(join(folder, name), { force: true });
    rmdirSync(folder);
  });

  copyFileSync(join(__dirname, 'capture-report.cjs'), join(folder, 'capture-report.cjs'));
  copyFileSync(join(__dirname, 'model.js'), join(folder, 'model.js'));
  writeFileSync(join(folder, 'tests.cjs'), source);
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const result = spawnSync(process.execPath, ['capture-report.cjs', 'report.json', '--preview-checked'], {
    cwd: folder,
    encoding: 'utf8',
    env,
  });

  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(readFileSync(join(folder, 'report.json'), 'utf8'));
  assert.equal(report.review, 'pending');
  return report.tests;
}

test('captures nested test failures once alongside passing tests', (t) => {
  const results = captureFixture(t, `
    const { describe, it, test } = require('node:test');
    const assert = require('node:assert/strict');
    test('top-level pass', () => {});
    describe('outer suite', () => {
      describe('inner suite', () => {
        it('nested pass', () => {});
        it('nested failure', () => assert.fail('expected fixture failure'));
      });
    });
    test('parent test', async (t) => {
      await t.test('child failure', () => assert.fail('expected fixture failure'));
    });
  `);

  assert.deepEqual(results, [
    { name: 'top-level pass', passed: true },
    { name: 'nested pass', passed: true },
    { name: 'nested failure', passed: false },
    { name: 'child failure', passed: false },
  ]);
});

test('captures a failed suite setup in its own right', (t) => {
  const results = captureFixture(t, `
    const { before, describe, it, test } = require('node:test');
    test('top-level pass', () => {});
    describe('failed suite setup', () => {
      before(() => { throw new Error('expected setup failure'); });
      it('cannot run', () => {});
    });
  `);

  assert.deepEqual(results[0], { name: 'top-level pass', passed: true });
  assert.ok(results.some(({ name, passed }) => name === 'failed suite setup' && !passed));
});
