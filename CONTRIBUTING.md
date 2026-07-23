# Contributing to LedeLens

Thank you for helping improve LedeLens.

## Before opening a pull request

1. Open or reference an issue for non-trivial behavior changes.
2. Keep the analysis skill provider-neutral.
3. Keep provider credentials out of article pages, content scripts, logs, and synchronized storage.
4. Do not add factual verification to the structural-analysis result.
5. Preserve stable paragraph IDs and source linking.
6. Validate model output locally before rendering it.
7. Do not silently change schema version `0.1.0`. Breaking field or meaning changes require a new version and migration notes.

## Development workflow

```bash
npm run verify
```

Load the repository as an unpacked extension from `chrome://extensions` for manual testing. Test both full-article and selected-text extraction on at least two structurally different pages.

## Pull requests

Keep pull requests focused. Explain:

- the user-facing problem;
- the chosen approach;
- security or privacy effects;
- schema effects, if any;
- automated and manual verification performed.

By submitting a contribution, you agree that it is licensed under the Apache License 2.0.
