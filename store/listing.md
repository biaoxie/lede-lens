# Chrome Web Store listing

This document is the canonical copy for the LedeLens Chrome Web Store submission.

## Product details

**Name:** LedeLens – Article Analysis

**Summary:** Analyze articles and passages for evidence, sources, causality, context, and framing—without fact-checking or bias ratings.

**Category:** Tools

**Language:** English

## Detailed description

LedeLens helps you read articles more critically. Open an article-like webpage—or select a passage—and see how well its main takeaway is supported by the evidence, sources, causal reasoning, context, and distinction between reporting and interpretation presented on the page.

Use it with news reports, opinion pieces, explainers, essays, and blog posts. LedeLens gives you a clear overall finding, practical questions to ask, material issues to watch, and paragraph-linked explanations. It analyzes internal support only: it does not fact-check claims, rate publishers, detect political bias, or judge an author's intent.

Open an article, select the LedeLens toolbar icon, and choose **Analyze article**. LedeLens extracts the readable text and asks an OpenAI model selected by you to review five practical questions:

- What supports the main point?
- Who says this?
- Does the article show why?
- What important context is missing?
- Are facts, interpretation, and uncertainty kept separate?

The report emphasizes a plain-language overall finding, a bounded conclusion, source-linked observations, and up to three material issues to watch. Paragraph references let you return to the relevant part of the page.

LedeLens evaluates structure, not truth. It does not fact-check an article, decide which political viewpoint is correct, or tell you what to believe.

Built as a practical media-literacy and critical-reading aid, LedeLens helps readers ask better questions about evidence, sourcing, causality, context, and interpretation.

### Bring your own OpenAI API key

LedeLens requires an OpenAI API key. Available models are loaded from OpenAI for your key so you can choose and confirm the model before analysis. OpenAI API usage may incur charges on your OpenAI account.

### Privacy by design

- Analysis runs only after you select the extension and choose **Analyze article**.
- Article text and metadata are sent directly from the extension to OpenAI over HTTPS.
- The page address is not sent to OpenAI.
- Your API key stays in Chrome session storage and is cleared when the browser session ends.
- Successful reports are saved locally so revisiting the same unchanged page does not require another API request.
- LedeLens has no analytics, advertising, or maintainer-operated server.

## Single purpose

LedeLens analyzes the internal evidence, causality, context, sourcing, and framing structure of the article or selected text that the user explicitly asks it to review.

## Permission justifications

### activeTab

Grants temporary access only to the tab where the user selects the LedeLens toolbar icon. This lets the extension read the current article without requesting access to every website in advance.

### scripting

Injects the bundled article extractor and paragraph highlighter into the user-activated tab. No remote code is downloaded or executed.

### sidePanel

Shows configuration, progress, and the completed report beside the article so the reader can keep the source visible.

### storage

Stores the API key for the current browser session, the confirmed model preference, and up to 30 successful reports locally. Users can clear the key and saved reports from the extension.

### Host permission: https://api.openai.com/*

Connects directly to OpenAI to list models available for the user's API key and to request the analysis the user explicitly starts. The extension does not contact any other provider or maintainer-operated server.

## Remote code

LedeLens does not use remote code. All JavaScript and the Mozilla Readability library are packaged with the extension. OpenAI returns structured data that is locally validated and rendered as text; it is never executed as code.

## Data-use disclosures

Select the applicable Chrome Web Store categories:

- **Authentication information:** the user's OpenAI API key.
- **Website content:** article text, selected text, title, byline, publication date, and extraction notes.
- **Web browsing activity:** the stripped address of a user-activated page is stored locally only to restore an unchanged cached report. It is not sent to OpenAI or the maintainer.

Data-use statements:

- Data is used only for the extension's single purpose.
- Data is not sold or used for advertising.
- Data is not used for creditworthiness or lending.
- Article content is transferred to OpenAI only to provide the analysis explicitly requested by the user.
- The developer does not operate a LedeLens server and does not receive user data.

## Reviewer test instructions

1. Install and pin LedeLens.
2. Open a regular article page containing a headline and several paragraphs.
3. Select the LedeLens toolbar icon.
4. Enter a valid OpenAI API key and choose **Load available models**.
5. Select a returned model, then choose **Confirm settings**.
6. Choose **Analyze article**.
7. Confirm that a structured report appears in the side panel and that paragraph references highlight the relevant text on the page.
8. Reopen LedeLens on the unchanged page to confirm the saved report is restored without a new API request.
9. Use **Clear key** and **Clear saved analyses** to confirm local deletion controls.

OpenAI API usage may incur charges on the reviewer's OpenAI account. No separate LedeLens account is required.
