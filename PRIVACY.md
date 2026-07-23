# LedeLens Privacy Policy

Last updated: July 23, 2026

LedeLens is a Chrome extension that analyzes the internal reasoning structure of an article at the user's request. This policy explains what information the extension handles, why it handles that information, where it is stored, and how users can delete it.

## Information LedeLens handles

When the user opens LedeLens on a page, the extension may process:

- the readable article text or text explicitly selected by the user;
- article metadata such as the title, byline, and publication date;
- the page address, with query parameters and fragments removed;
- the OpenAI API key entered by the user;
- the OpenAI model selected by the user;
- the structured analysis returned by OpenAI.

LedeLens does not collect cookies, general browser history, advertising identifiers, or analytics.

## How information is used

LedeLens uses article text and metadata only to produce the structural analysis requested by the user. The page address is used only on the user's device to match an unchanged page with a previously saved report. It is not included in the article data sent to OpenAI.

LedeLens uses the OpenAI API key only to request the models available to that key and to submit analyses to the OpenAI API. The key is not sent to the article page, the content script, the project maintainer, or any advertising or analytics service.

## Information sent to OpenAI

When the user selects an Analyze button, LedeLens sends the extracted article text, title, byline, publication date, extraction notes, and the user's analysis request to the OpenAI API over HTTPS. The page address is not sent.

Requests set `store: false`. OpenAI processes the request under the terms and privacy practices that apply to the user's OpenAI API account. LedeLens does not control OpenAI's independent security, abuse-monitoring, or legal-retention practices.

## Information stored in Chrome

- The OpenAI API key is stored in `chrome.storage.session`. Chrome clears session storage when the browser session ends.
- The selected model is stored in `chrome.storage.local`.
- Up to 30 successful reports are stored in `chrome.storage.local` with a page address stripped of query parameters and fragments and a non-reversible content fingerprint. This cache is not synchronized through Chrome Sync.

The project maintainer does not operate a LedeLens server and does not receive the article, page address, API key, or analysis result.

## Deleting information

Users can:

- select **Clear key** to remove the OpenAI API key from the current Chrome session;
- select **Clear saved analyses** to delete all locally cached reports and page identifiers;
- remove the extension to delete its remaining local extension data.

## Sharing, advertising, and human access

LedeLens does not sell user data, use it for advertising, transfer it to data brokers, or permit the project maintainer to read it. Data is transferred to OpenAI only as necessary to provide the analysis explicitly requested by the user.

## Chrome Web Store Limited Use

LedeLens's use of information received from Chrome APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Information is used only to provide or improve LedeLens's single user-facing purpose, is not used for personalized advertising or credit decisions, and is not transferred except as necessary to provide the requested analysis, comply with law, or protect against security abuse.

## Security

Data sent to OpenAI is transmitted over HTTPS. Provider credentials remain in trusted extension contexts and are not inserted into article pages. See [SECURITY.md](SECURITY.md) for the project's security model and vulnerability-reporting process.

## Changes

Material changes to this policy or to LedeLens's data practices will be disclosed before the changed practices take effect.

## Contact

Privacy questions can be submitted through the support channel listed on the LedeLens Chrome Web Store page. Security vulnerabilities should be reported privately as described in [SECURITY.md](SECURITY.md).
