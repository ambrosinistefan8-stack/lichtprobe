const test = require('node:test');
const assert = require('node:assert/strict');
const { inspect, validate, recordReview, presets } = require('./model.js');

test('a clean run waits for a human decision', () => {
  const before = inspect(presets.ready);
  assert.equal(before.isReady, true);
  assert.equal(before.isApproved, false);
  assert.equal(before.stages[3].status, 'waiting');
  assert.equal(inspect(presets.ready, true).isApproved, true);
});

test('failed tests block approval even when the approval flag is true', () => {
  const report = inspect(presets.failure, true);
  assert.equal(report.isApproved, false);
  assert.equal(report.stages[1].status, 'blocked');
  assert.equal(report.stages[1].detail, 'Tastaturbedienung');
});

test('a pending or rejected review blocks release', () => {
  assert.equal(inspect(presets.waiting, true).isApproved, false);
  assert.equal(inspect({ ...presets.ready, review: 'changes' }, true).isReady, false);
});

test('missing preview and malformed or empty test evidence are rejected', () => {
  assert.equal(inspect({ ...presets.ready, preview: false }, true).isApproved, false);
  assert.throws(() => validate({ ...presets.ready, tests: [] }));
  assert.throws(() => validate({ ...presets.ready, tests: [{ name: 'fake', passed: 'yes' }] }));
});

test('recording an independent review preserves its reference and still requires human approval', () => {
  assert.throws(() => recordReview(presets.waiting, 'approved', ' '));
  assert.throws(() => recordReview(presets.waiting, 'pending', 'PR #12'));
  const reviewed = recordReview(presets.waiting, 'approved', ' PR #12 ');
  assert.equal(inspect(reviewed).input.reviewReference, 'PR #12');
  assert.equal(inspect(reviewed).isReady, true);
  assert.equal(inspect(reviewed).isApproved, false);
  assert.equal(inspect(reviewed, true).isApproved, true);
  assert.equal(inspect(recordReview(presets.failure, 'approved', 'PR #12'), true).isApproved, false);
  assert.equal(inspect(recordReview(reviewed, 'changes', 'PR #13'), true).isApproved, false);
});
