# Agent guide

## Start here

1. Read `README.md`.
2. Read `skills/analyze-news-structure/SKILL.md`.
3. Treat `skills/analyze-news-structure/assets/system-prompt.md` as the canonical model instruction.
4. Treat `skills/analyze-news-structure/assets/output-schema.json` as the canonical output contract.

## Boundaries

- Keep this project independent from `claims-workshop`.
- Keep the analysis skill provider-neutral.
- Keep provider credentials out of article pages and content scripts.
- Do not add factual verification to the structural-analysis result.
- Do not silently change schema version `0.1.0`; use a new version for breaking field or meaning changes.
- Validate model output locally before rendering it.
- Preserve paragraph IDs so every important result can link back to the article.
