# LedeLens Interactive Demo

An API-free product demonstration for [LedeLens](https://chromewebstore.google.com/detail/aedlaaeahdhcklnbojnhhghikdjimkei).

The site renders a fictional article inside a simulated Chrome window. Visitors can open the LedeLens side panel, run a narrated analysis, inspect a schema-valid saved result, follow paragraph references, and replay the workflow. It never requests an API key or sends article text to a model.

## Demo data

- The publication, people, city, survey, and events are fictional.
- `app/fixtures/library-analysis.json` follows LedeLens schema `0.2.0`.
- Paragraph references resolve to the nine visible article paragraphs.
- The fixture was produced using the canonical `analyze-news-structure` skill.

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
