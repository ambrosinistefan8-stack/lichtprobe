# Lichtprobe project instructions

- Keep the app usable from a local `index.html` without a network dependency.
- Treat imported JSON as untrusted data and display it as text. Check the schema and file limit before processing.
- Failed tests, missing preview evidence, or an unresolved review must block release. A passing run must still wait for a human decision.
- Keep motion optional through the user's reduced-motion setting. Sound requires the user's explicit click.
- Use synthetic examples. Keep credentials, local workspace paths and other projects out of the repository.
- Run `node --test tests.cjs` before requesting review. Record observed test and review results separately.
