const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const passingTest = "require('node:test')('fixture passes', () => {});";

function reportFixture(t, source = passingTest) {
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
  return {
    report: join(folder, 'report.json'),
    run(...args) {
      const result = spawnSync(process.execPath, ['capture-report.cjs', ...args], { cwd: folder, encoding: 'utf8', env });
      assert.ifError(result.error);
      return result;
    },
  };
}

function captureFixture(t, source) {
  const fixture = reportFixture(t, source);
  const result = fixture.run('report.json', '--preview-checked');
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(readFileSync(fixture.report, 'utf8'));
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

for (const [label, args, preview] of [
  ['defaults to an unchecked preview', ['report.json'], false],
  ['accepts one preview flag after the destination', ['report.json', '--preview-checked'], true],
]) {
  test(label, (t) => {
    const fixture = reportFixture(t);
    const result = fixture.run(...args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(readFileSync(fixture.report, 'utf8')), {
      name: 'Lichtprobe – Node-Testlauf',
      preview,
      review: 'pending',
      tests: [{ name: 'fixture passes', passed: true }],
    });
  });
}

for (const [label, args] of [
  ['an unknown flag', ['report.json', '--preview-cheked']],
  ['a duplicate flag', ['report.json', '--preview-checked', '--preview-checked']],
  ['a flag before the destination', ['--preview-checked', 'report.json']],
  ['a surplus argument', ['report.json', '--preview-checked', 'extra']],
]) {
  test(`rejects ${label} without creating or overwriting the report`, (t) => {
    const fixture = reportFixture(t);
    const missing = fixture.run(...args);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /Use node capture-report\.cjs report\.json \[--preview-checked\]/);
    assert.equal(existsSync(fixture.report), false);

    const original = '{"existing":true}\n';
    writeFileSync(fixture.report, original);
    const existing = fixture.run(...args);
    assert.equal(existing.status, 1);
    assert.match(existing.stderr, /Use node capture-report\.cjs report\.json \[--preview-checked\]/);
    assert.equal(readFileSync(fixture.report, 'utf8'), original);
  });
}

test('preserves an existing report with valid arguments', (t) => {
  const fixture = reportFixture(t);
  const original = '{"existing":true}\n';
  writeFileSync(fixture.report, original);
  const result = fixture.run('report.json', '--preview-checked');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /EEXIST/);
  assert.equal(readFileSync(fixture.report, 'utf8'), original);
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
