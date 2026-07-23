# Install LedeLens in Chrome

This download is ready to load directly into Chrome. You do not need Node.js,
Git, or a build step.

## Install

1. Extract the ZIP into a permanent folder. Do not delete that folder while
   you use the extension.
2. Open `chrome://extensions` in Google Chrome.
3. Turn on **Developer mode** in the upper-right corner.
4. Select **Load unpacked**.
5. Choose the extracted folder that contains `manifest.json`.
6. Optional: open Chrome's Extensions menu and pin **LedeLens – Article
   Analysis**.

## Start an analysis

1. Open a regular article on an `http://` or `https://` page.
2. Select the LedeLens toolbar icon. This opens the side panel and grants
   access to the current tab.
3. Open **Settings**.
4. Enter an OpenAI API key with API billing or credits.
5. Select **Load available models**, choose a compatible GPT-5 model, and then
   select **Save and continue**.
6. Choose **Entire article** and select **Analyze article**.

To analyze only part of an article, highlight visible text on the page first,
then choose **Selected passage** in LedeLens.

## Important notes

- A ChatGPT subscription does not include OpenAI API usage.
- Your API key is stored only for the current Chrome session.
- Analysis can incur OpenAI API charges.
- LedeLens examines an article's internal reasoning structure. It does not
  fact-check the article.

## Update or remove

To update a manually installed copy, replace the extracted files with a newer
release, open `chrome://extensions`, select **Reload** for LedeLens, and refresh
the article tab.

To remove it, open `chrome://extensions` and select **Remove** for LedeLens.

For help, visit https://github.com/biaoxie/lede-lens.
