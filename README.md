# LedeLens

LedeLens is an open-source Chrome extension that audits the internal reasoning structure of news articles. It examines evidence, causal and predictive moves, missing context, and the separation between reporting and framing.

It does **not** fact-check the article. Its core question is narrower:

> Assuming the reported facts are accurate, how well do they support the article's conclusions?

## What it shows

- Five reader-focused questions about support, sourcing, causality, missing context, and the separation of facts from interpretation
- Up to three material issues such as unsupported causation, missing baselines, one-sided sourcing, or certainty inflation
- The strongest conclusion the article can support on its own terms
- A bounded evidence-structure verdict and presentation-style label
- Paragraph links that scroll back to the corresponding source text

## Current status

LedeLens is an early proof of concept. The first release:

- runs as a Chrome Manifest V3 side panel;
- analyzes a full article or selected text;
- calls the OpenAI Responses API directly from the persistent side panel;
- lists the compatible GPT-5 models available to the user's OpenAI API key and requires an explicit selection;
- stores the OpenAI API key in `chrome.storage.session`, which Chrome clears when the browser session ends;
- validates every model result locally against JSON Schema before rendering it.

See [quick-start.md](quick-start.md) to load the extension locally.

## Product boundaries

LedeLens evaluates article structure, not factual truth. It assesses whether an article's important conclusions stay within its own evidence, whether causal language is internally supported, which context is missing, and what conclusion would follow if the reported material were accurate.

It does not verify events, source credibility, linked documents, statistics, or author intent. `manipulation_risk_signals` describes observable textual patterns; it is never a claim that an author intended to manipulate readers.

## Architecture

```text
article page
  -> Mozilla Readability extracts the article from a cloned page
  -> isolated content script maps the coherent reader result and stable paragraph IDs back to the live page
  -> side panel requests an analysis
  -> persistent side panel reads the session-only API key
  -> OpenAI Responses API returns Structured Outputs
  -> local schema and reference validation
  -> side panel renders the verdict, metrics, issues, conclusion, and paragraph links
```

The extracted article is untrusted input. Article text is sent separately from the system instruction and cannot redefine the analysis role or output contract.

The canonical model behavior lives in [`skills/analyze-news-structure/assets/system-prompt.md`](skills/analyze-news-structure/assets/system-prompt.md). The canonical response contract is [`skills/analyze-news-structure/assets/output-schema.json`](skills/analyze-news-structure/assets/output-schema.json). Breaking field or meaning changes require a new schema version; see [`MIGRATIONS.md`](MIGRATIONS.md).

## Security and privacy

Direct browser-to-provider calls are a deliberate proof-of-concept tradeoff. LedeLens:

- keeps provider credentials out of content scripts and page DOM;
- stores the API key only in Chrome session storage;
- does not log, sync, or commit API keys;
- sends only the extracted page content required for the requested analysis;
- sets `store: false` on OpenAI Responses API requests.

A browser extension remains a sensitive place for a provider credential. Review [SECURITY.md](SECURITY.md) before using LedeLens with a valuable or broadly privileged key. A production distribution should consider a scoped token broker or local companion.

Long-running model requests execute in the open side panel rather than the Manifest V3 service worker. They use the Responses API's server-sent event stream so the connection receives lifecycle events and output while the model works. This avoids idle fetch timeouts while keeping credentials inside extension contexts and out of article pages. Each OpenAI call includes a unique client request ID so network failures can be traced without exposing the API key.

The request does not override reasoning effort; the selected model uses its own default behavior. It uses low output verbosity to reduce redundant JSON prose while preserving the complete analysis contract. After each successful run, the side panel reports time to first output, total request time, and reasoning-token usage when OpenAI supplies it. Time to first output includes queueing and model preparation; the API does not expose reasoning wall-clock time separately.

## Development

Requirements:

- Google Chrome 116 or newer
- Node.js 24 or newer for local verification
- An OpenAI API key for live analysis

Install dependencies and run the repository checks:

```bash
npm ci
npm run verify
```

`npm run verify` enforces at least 95% line, branch, and function coverage across the unit-testable core modules in `src/lib/`, in addition to static checks for the Chrome integration files.

Mozilla Readability is the only runtime package dependency. It runs locally against a cloned document; LedeLens does not send the page to a separate extraction service. Reload the extension from `chrome://extensions` after changing source files.

## Project layout

```text
manifest.json                         Chrome extension manifest
src/background.js                    Settings, session credential storage, and side-panel lifecycle
src/content.js                       Reader-mode extraction, source mapping, and highlighting
src/lib/openai.js                    OpenAI request, tracing, parsing, and local validation
src/lib/validator.js                 Local schema and reference validation
src/sidepanel/                        Side panel UI
skills/analyze-news-structure/        Provider-neutral analysis contract
tests/                                Node test suite
scripts/check.mjs                     Static repository checks
```

## Contributing

Issues and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and preserve the product and security boundaries described above.

## License

Licensed under the [Apache License 2.0](LICENSE).
