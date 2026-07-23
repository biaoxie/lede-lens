## Summary

Describe the user-facing problem and the chosen approach.

## Boundary review

- [ ] The change keeps structural analysis separate from factual verification.
- [ ] Provider credentials remain outside content scripts, page DOM, logs, and synchronized storage.
- [ ] Model output is validated locally before rendering.
- [ ] Paragraph IDs remain stable and traceable.
- [ ] Any breaking schema change uses a new schema version and includes migration notes.

## Verification

- [ ] `npm run verify`
- [ ] Full-article extraction tested manually
- [ ] Selected-text extraction tested manually
