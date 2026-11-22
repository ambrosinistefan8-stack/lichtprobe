---
name: verify-release-evidence
description: Verify Lichtprobe's Node test-report collector against actual test results. Use when a change affects captured JSON, the preview and review gates, nested failures, or an existing report's file protection.
---

# Verify Lichtprobe release evidence

Use the target checkout and record its commit or working-tree change. Read the project's `AGENTS.md`. The collector loads the `tests.cjs` next to its own script. Running it from another directory alone still runs its original tests.

## Run the checks

1. Verify Node.js 24 or later is available. Copy `capture-report.cjs`, `model.js`, `tests.cjs`, and `capture-report.test.cjs` from the target checkout to a fresh working directory outside the repository. Use a separate fresh temporary directory for the synthetic case below. Keep reports and temporary test fixtures in those directories.
2. In the first directory, run `node --test tests.cjs capture-report.test.cjs`. Record the count, status and individual results from `tests.cjs`. Run `node capture-report.cjs report.json` and record its exit status. Read the generated JSON and validate it with `validate` from `model.js`. Compare each `tests` entry's exact `name` and `passed` value with the independently observed model tests. The collector takes the first 80 characters of each name and the validator trims it. Apply `name.slice(0, 80).trim()` to the observed name, and report any resulting collisions as ambiguous evidence. `capture-report.test.cjs` verifies the collector and its results do not belong in this report. On a clean run expect status `0`, `preview: false`, `review: "pending"`, and no `reviewReference`. Use `--preview-checked` for real evidence only after the browser preview was inspected and record who checked it.
3. Run the release model against the JSON. `inspect(report)` must report `isReady: false` and `isApproved: false` while review is pending. Verify the existing manual-decision and independent-review tests. With an actual confirmed preview and a recorded independent review, clean evidence should be ready and still await human approval. If only the model was exercised, label it as a model check. Leave the report pending and leave any actual approval to its operator.
4. Compare the SHA-256 hash of `report.json` before and after rerunning `node capture-report.cjs report.json`. Expect status `1`, an `EEXIST` error, and matching hashes. This checks exclusive output without exposing another report to replacement.

## Run a known nested failure

In the second temporary directory copy only `capture-report.cjs` and `model.js`. Save the following as that directory's `tests.cjs`.

```js
const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');

test('top-level pass', () => {});
describe('outer suite', () => {
  describe('inner suite', () => {
    it('nested failure', () => assert.fail('expected synthetic failure'));
  });
});
```

Run `node --test tests.cjs`, then `node capture-report.cjs nested.json`. Both commands should exit with status `1`. Verify that `nested.json` passes the model's validation and lists exactly `top-level pass` as `true` and `nested failure` as `false` once each, with review pending. The Tests step from `inspect` must be blocked even though a top-level test passed. The deliberate failure is distinct from a failure in the real project checks.

## Record and stop

Report the exact commands and exit statuses, the compared names and states, the overwrite outcome, and the paths of retained temporary evidence. If a real suite fails, the worktree inputs are incomplete, the report cannot be compared, or the needed environment is unavailable, identify the missing or failed check and leave verification incomplete. Ask for the real preview or review evidence only if the task requires that gate. An expected synthetic failure demonstrates that one guard works and grants no release approval.
