# Lichtprobe

Lichtprobe is a local release rehearsal for small teams. It shows why a release is blocked and lets a person approve a clean rehearsal. The screen uses a time-animated perspective scene and an optional original synthesizer soundtrack.

Open `index.html` in a modern browser. Select the failed-test scenario, start the run, and check that approval is disabled. The clean scenario leaves the last decision with the operator. The examples use fictional evidence.

Run `node --test tests.cjs capture-report.test.cjs` to verify the release gate and the report collector. Use Node.js 24 or later.

## Import a fresh local test report

Run `node capture-report.cjs report.json` and import that file into Lichtprobe. After actually checking the preview, you can add `--preview-checked` once after the filename. Invalid arguments leave the output untouched. Existing output files are preserved.

Play the report to see the pending review. Once an independent reviewer has decided, enter the reference and their decision under **Review erfassen**. If the preview, tests and review all pass, the operator can then select **Im Labor freigeben** as a separate step. The exported report includes the review reference. Lichtprobe records the review the operator enters, and relies on the operator to verify its source.
