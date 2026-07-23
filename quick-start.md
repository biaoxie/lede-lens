# Run LedeLens in Chrome in about 5 minutes

This guide installs the development version of LedeLens as an unpacked Chrome extension and walks through the first analysis.

## Before you begin

You need:

- Google Chrome 116 or newer
- Node.js 24 or newer
- An OpenAI API key with API billing or credits

A ChatGPT subscription does not include OpenAI API usage.

LedeLens is not yet distributed through the Chrome Web Store. This guide loads the source directly into Chrome.

## 1. Download and prepare LedeLens

Clone the repository:

```bash
git clone https://github.com/biaoxie/lede-lens.git
cd lede-lens
npm ci
```

If you downloaded the source another way, run `npm ci` from the folder containing `manifest.json`.

## 2. Load the extension in Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode** in the upper-right corner.
3. Select **Load unpacked**.
4. Choose the LedeLens repository folder.
5. Optional: pin LedeLens from Chrome's extensions menu for one-click access.

When source files change, return to `chrome://extensions`, select LedeLens's reload icon, and refresh the article tab.

## 3. Connect OpenAI

1. Open a regular news article on an `http://` or `https://` page.
2. Select the LedeLens toolbar icon to open the side panel and grant access to the current tab.
3. Open settings and paste your OpenAI API key.
4. Select **Load available models**.
5. Choose a compatible GPT-5 model returned for your OpenAI project.
6. Select **Confirm settings**.

LedeLens requests the available models directly from OpenAI and verifies your selection before saving it. The key is stored only in `chrome.storage.session`; Chrome clears it when the browser session ends. You will need to enter it again after fully closing and reopening Chrome.

Use an OpenAI API key—not your ChatGPT password. Never include the key in screenshots, issues, or support messages.

Before an analysis, LedeLens explains that the extracted article text and metadata will be sent to OpenAI. The page address remains local, with query parameters and fragments removed, and is used only to restore saved reports. See the [Privacy Policy](PRIVACY.md).

## 4. Analyze a full article

1. Choose **Full article**.
2. Select **Analyze article**.
3. Follow the progress messages while LedeLens extracts the article, waits for OpenAI, validates the structured response, and renders the report.
4. Select a paragraph badge such as `p4` to return to and highlight the relevant passage.

The report evaluates internal support, sourcing, causal reasoning, missing context, and the separation of reporting from interpretation. It does not verify whether the article's reported facts are true.

## 5. Read the report

- **Overall finding** describes how well the article internally supports its main takeaway. It is not a truth, credibility, or political-neutrality score.
- **Presentation style** describes how the article separates reporting, interpretation, and uncertainty. It is descriptive rather than a second quality score.
- **Five questions to ask** explain the article's evidence, sourcing, causality, context, and framing.
- **What to watch** lists up to three material limitations. Paragraph badges such as `p4` return to the relevant source text.

## 6. Analyze selected text

To focus on one passage:

1. Select text on the article page.
2. Choose **Selected text** in the side panel.
3. Select **Analyze selected text**.

## Reopen a saved report

After a successful analysis, LedeLens saves the report in local extension storage.

To restore it:

1. Reopen the same article.
2. Select the LedeLens toolbar icon.
3. LedeLens restores the report automatically if the URL and extracted article content still match.

Restoring a report does not make another OpenAI request. Select **Re-analyze article** when you want a fresh result.

The cache is limited to 30 reports and is not synchronized through Chrome Sync. If the article content changes, LedeLens does not reuse the old report.

To delete every cached report and page identifier, open settings and select **Clear saved analyses**.

## Switching pages while the side panel is open

Chrome's `activeTab` permission applies only after you interact with the extension on the current tab. When you navigate or switch tabs:

1. LedeLens clears the previous page's article and report.
2. Select the LedeLens toolbar icon on the new page.
3. LedeLens refreshes the page context and either restores a cached report or enables a new analysis.

This avoids showing the previous article's result as though it belonged to the new page.

## Troubleshooting

### “Open a regular web page to use LedeLens”

Chrome does not allow extensions to inspect protected pages such as:

- `chrome://` pages
- the Chrome Web Store
- some built-in or protected documents

Open a regular `http://` or `https://` article. If you switched tabs or navigated while the side panel remained open, select the LedeLens toolbar icon again.

### Little or no article text was found

Full-article mode uses Mozilla Readability, the standalone parser used by Firefox Reader View. It analyzes document structure and text density rather than relying on site-specific selectors.

Some pages place content in unusual containers, interactive viewers, inaccessible frames, or paywalled sections. Select the relevant passage and use **Selected text** when full-article extraction is incomplete.

### The OpenAI request fails

Check that:

- the session API key is current;
- the selected model remains available to the API project;
- the API project has billing or sufficient credits;
- the article is not exceptionally long;
- the network connection remains active while the response streams.

LedeLens shows a request ID for traceable network failures without exposing the API key.

### The page still shows an old report

Select the LedeLens toolbar icon on the current tab. LedeLens should clear stale page state, refresh access, and restore only a report whose URL and article-content fingerprint match.

### Development changes do not appear

1. Open `chrome://extensions`.
2. Select the reload icon on the LedeLens card.
3. Refresh the article page.
4. Select the LedeLens toolbar icon again.

## Security reminder

The current proof of concept sends requests directly from the side panel to OpenAI. Use a restricted project key, monitor usage, and revoke the key if you suspect exposure. See [SECURITY.md](SECURITY.md) for the full credential model and vulnerability-reporting process.
