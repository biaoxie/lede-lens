# Security policy

## Reporting a vulnerability

Please do not disclose credential exposure, cross-context injection, or other exploitable security issues in a public issue. Use GitHub's private vulnerability reporting feature for this repository. Include reproduction steps, affected versions, impact, and any suggested mitigation.

## Credential model

LedeLens is currently a proof of concept that sends requests directly from a Chrome extension service worker to a model provider. The OpenAI API key:

- is accepted only by the side panel;
- is stored in `chrome.storage.session`;
- is never passed to the content script or page DOM;
- is cleared when the browser session ends;
- is not intentionally logged or synchronized.

This design reduces persistence but cannot make a browser-held API key equivalent to a server-side secret. Use a restricted project key, monitor usage, and revoke a key immediately if exposure is suspected.

## Untrusted content

Extracted articles are untrusted input. Content scripts collect article text and paragraph identifiers only. The service worker sends the canonical system instruction separately from article data, requires Structured Outputs, and validates the result locally before rendering it.

## Supported versions

Security fixes are applied to the latest release on the default branch while the project remains pre-1.0.
