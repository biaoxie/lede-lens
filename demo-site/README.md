# LedeLens Interactive Demo

A static, saved-result product demonstration for [LedeLens](https://ledelens.app), an open-source Chrome extension for article structure analysis and critical reading.

The site renders a fictional article inside a simulated Chrome window. Visitors can open the LedeLens side panel, run a narrated analysis, inspect a schema-valid saved result, follow paragraph references, and replay the workflow. The demo needs no API key. The Chrome extension does: it sends extracted article text and metadata to OpenAI when the user analyzes, and OpenAI charges may apply.

## Demo data

- The publication, people, city, survey, and events are fictional.
- `app/fixtures/library-analysis.json` follows LedeLens schema `0.2.0`.
- Paragraph references resolve to the ten visible article paragraphs.
- The fixture is a saved result produced by the real extension using the canonical `analyze-news-structure` skill.

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm test
```
