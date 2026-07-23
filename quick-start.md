# LedeLens quick start

This guide loads the development version of LedeLens directly into Google Chrome.

## 1. Get the repository

Clone the repository and enter it:

```bash
git clone https://github.com/biaoxie/lede-lens.git
cd lede-lens
```

If you received the source another way, open its root folder—the folder containing `manifest.json`.

Install the article parser dependency:

```bash
npm ci
```

## 2. Load the extension

1. Open `chrome://extensions` in Google Chrome.
2. Enable **Developer mode** in the upper-right corner.
3. Select **Load unpacked**.
4. Choose the LedeLens repository folder.
5. Pin LedeLens from Chrome's extensions menu if you want one-click access.

## 3. Add a session API key

1. Open a regular news article.
2. Select the LedeLens toolbar icon to open the side panel.
3. Paste an OpenAI API key.
4. Select **Load available models**. LedeLens requests `/v1/models` directly from OpenAI and displays compatible GPT-5 models returned for that API project.
5. Choose a model from the returned list.
6. Select **Confirm settings**. LedeLens verifies the choice against OpenAI again before saving it.

The key is stored in `chrome.storage.session`. Chrome clears it when the browser session ends, so you will enter it again after fully closing and reopening Chrome.

## 4. Analyze a page

For a normal news article:

1. Choose **Full article**.
2. Select **Analyze article**.
3. Follow the live progress card as LedeLens extracts the source, waits for OpenAI, validates the response, and renders the report.
4. Select any paragraph badge such as `p4` to scroll to and highlight that source paragraph.

For a specific passage:

1. Select text on the web page.
2. Choose **Selected text** in LedeLens.
3. Select **Analyze selected text**.

## Troubleshooting

### The extension found little or no text

Some sites render articles inside unusual containers, interactive viewers, or inaccessible frames. Try selecting the relevant passage and use **Selected text**.

Full-article mode uses Mozilla Readability, the standalone article parser used by Firefox Reader View. It analyzes the page structure and text density rather than relying on site-specific CSS selectors. When reader-mode extraction cannot identify an article, LedeLens reports a partial extraction instead of silently applying a site-specific rule.

### Chrome will not allow analysis on the page

Chrome blocks extensions on internal pages such as `chrome://settings`, the Chrome Web Store, and some protected documents. Open a regular `http://` or `https://` page.

LedeLens uses Chrome's temporary `activeTab` permission instead of requesting permanent access to every website. When you switch to an article on a different site, click the LedeLens toolbar icon on that tab before selecting **Analyze article**.

### The API request fails

Confirm that:

- the session API key is current;
- the selected model is available to your OpenAI project;
- the project has sufficient API quota;
- the article is not exceptionally long.

LedeLens uses the OpenAI API, not a ChatGPT subscription. API usage is billed by the provider under the API project associated with the key.

### Changes do not appear during development

Return to `chrome://extensions`, find LedeLens, and select the reload icon. Refresh the article tab before running a new extraction.
