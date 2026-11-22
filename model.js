(function exposeReleaseModel(root) {
  'use strict';

  const steps = Object.freeze(['Vorschau', 'Tests', 'Review', 'Freigabe']);
  const states = new Set(['approved', 'pending', 'changes']);

  function validate(input) {
    if (!input || typeof input !== 'object' || typeof input.name !== 'string' ||
        !input.name.trim() || input.name.length > 80 || typeof input.preview !== 'boolean' ||
        !Array.isArray(input.tests) || input.tests.length < 1 || input.tests.length > 50 ||
        !states.has(input.review)) {
      throw new Error('JSON prüfen. Erwartet werden name, preview, tests und review.');
    }
    const tests = input.tests.map((test) => {
      if (!test || typeof test.name !== 'string' || !test.name.trim() || test.name.length > 80 ||
          typeof test.passed !== 'boolean') {
        throw new Error('Jeder Test braucht einen Namen und einen Wahrheitswert in passed.');
      }
      return { name: test.name.trim(), passed: test.passed };
    });
    const normalized = { name: input.name.trim(), preview: input.preview, review: input.review, tests };
    if (input.reviewReference !== undefined) {
      if (!validReviewReference(input.reviewReference)) throw new Error('Die Review-Referenz braucht 1 bis 160 Zeichen.');
      normalized.reviewReference = input.reviewReference.trim();
    }
    return normalized;
  }

  function validReviewReference(reference) {
    return typeof reference === 'string' && reference.trim().length > 0 && reference.length <= 160;
  }

  function recordReview(input, decision, reference) {
    if (decision !== 'approved' && decision !== 'changes') throw new Error('Wähle einen Review-Entscheid.');
    if (!validReviewReference(reference)) throw new Error('Gib eine Review-Referenz an.');
    return validate({ ...input, review: decision, reviewReference: reference });
  }

  function inspect(raw, approved = false) {
    const input = validate(raw);
    const failures = input.tests.filter(test => !test.passed);
    const isReady = input.preview && failures.length === 0 && input.review === 'approved';
    const isApproved = isReady && approved === true;
    const reviewDetail = { approved: 'Review bestätigt', pending: 'Review ausstehend', changes: 'Änderungen verlangt' }[input.review];
    return {
      input,
      isReady,
      isApproved,
      stages: [
        { status: input.preview ? 'pass' : 'blocked', detail: input.preview ? 'Vorschau bestätigt' : 'Vorschau fehlt' },
        { status: failures.length ? 'blocked' : 'pass', detail: failures.length ? failures.map(test => test.name).join(', ') : `${input.tests.length} Tests bestanden` },
        { status: input.review === 'approved' ? 'pass' : input.review === 'changes' ? 'blocked' : 'waiting',
          detail: input.reviewReference ? `${reviewDetail} · ${input.reviewReference}` : reviewDetail },
        { status: isApproved ? 'pass' : isReady ? 'waiting' : 'blocked',
          detail: isApproved ? 'Im Labor manuell freigegeben' : isReady ? 'Wartet auf deine Entscheidung' : 'Offene Prüfpunkte' }
      ]
    };
  }

  const candidate = Object.freeze({
    name: 'Kandidat A', preview: true, review: 'approved',
    tests: [
      { name: 'Kompakte Ansicht', passed: true },
      { name: 'Tastaturbedienung', passed: true },
      { name: 'Berichtsausgabe', passed: true }
    ]
  });
  const presets = Object.freeze({
    ready: candidate,
    failure: { ...candidate, name: 'Kandidat B', tests: candidate.tests.map((test, index) => ({ ...test, passed: index !== 1 })) },
    waiting: { ...candidate, name: 'Kandidat C', review: 'pending' }
  });

  const api = Object.freeze({ inspect, validate, recordReview, presets, steps });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.releaseModel = api;
})(globalThis);
