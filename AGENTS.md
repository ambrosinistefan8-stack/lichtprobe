# Lichtprobe project instructions

Lichtprobe is a browser-based release rehearsal. It turns preview, test results, independent review, and a final human decision into a record a small team can inspect and export.

## Run and verify

- Open `index.html` in a modern browser. No server or build step is needed.
- Run `node --test tests.cjs capture-report.test.cjs` with Node.js 24 or later.
- Run `node capture-report.cjs report.json` to generate real local test evidence. Use `--preview-checked` only after inspecting the preview. Import the new JSON and try both the failed and passing browser paths.
- Record the observed local test results and the independent code review separately.

## Project rules

1. **Keep each failure in the evidence.** In `capture-report.cjs`, capture failed nested tests and independent suite failures and avoid counting the same aggregate failure twice. A passing top-level test must never make an incomplete run look successful.
2. **Keep the final decision human.** In `model.js` and `app.js`, missing preview evidence, failed tests, or a pending or rejected review block release. Record the independent review with a reference and require a separate manual action to approve the rehearsal.
3. **Keep the lab offline and safe to share.** Display imported JSON as text after validating its size and schema. Use synthetic examples and keep credentials, private data, and local paths out of demos and the repository. The browser must work directly from `index.html` without a network dependency.
4. **Let the user control movement and sound.** Honour reduced motion in the rehearsal and require an explicit click before soundtrack playback. The same checks and controls must be usable with a keyboard.
5. **Verify the collector at the CLI boundary.** When `capture-report.cjs` changes how Node test events become evidence, keep a regression fixture in `capture-report.test.cjs` that mixes passing and failing results. Check both exit status `1` and the named failure in the generated JSON, and include the fixture result in the PR verification notes.
