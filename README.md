# Lichtprobe

Lichtprobe is a local release rehearsal for small teams. It shows why a release is blocked and lets a person approve a clean rehearsal. The screen uses a time-animated perspective scene and an optional original synthesizer soundtrack.

Open `index.html` in a modern browser. Select the failed-test scenario, start the run, and check that approval is disabled. The clean scenario leaves the last decision with the operator. The examples use fictional evidence.

Run `node --test tests.cjs` to verify the release gate. A Node.js version with the built-in test runner is sufficient.

## Import a fresh local test report

Run `node capture-report.cjs report.json` and import that file into Lichtprobe. Use `--preview-checked` only after actually checking the preview. The independent review remains pending. Existing output files are preserved.
