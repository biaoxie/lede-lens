import InfoPage from "../InfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Install the LedeLens Chrome Extension",
  description:
    "Download and install the open-source LedeLens Chrome extension to analyze article evidence, causality, context, sourcing, and framing.",
  path: "/install",
});

export default function InstallPage() {
  return (
    <InfoPage
      eyebrow="Chrome extension"
      title="Install LedeLens."
      introduction="LedeLens is available from the Chrome Web Store. Install it in one click, then choose the OpenAI model you want to use for analysis."
    >
      <section className="install-callout">
        <h2>Get LedeLens from the Chrome Web Store</h2>
        <p>Install the published extension directly in Chrome. No source-code download or build step is required.</p>
        <a
          className="primary-info-link"
          href="https://chromewebstore.google.com/detail/aedlaaeahdhcklnbojnhhghikdjimkei"
          target="_blank"
          rel="noreferrer"
        >
          Add to Chrome ↗
        </a>
      </section>

      <ol className="process-list compact">
        <li><span>01</span><div><h2>Install the extension</h2><p>Open the Chrome Web Store listing and select “Add to Chrome.”</p></div></li>
        <li><span>02</span><div><h2>Open an article</h2><p>Select the LedeLens toolbar icon while viewing an article-like webpage.</p></div></li>
        <li><span>03</span><div><h2>Choose a model</h2><p>Enter a restricted OpenAI project key, load the compatible GPT-5 models available to it, and confirm your selection.</p></div></li>
        <li><span>04</span><div><h2>Analyze the article</h2><p>Choose “Analyze article” to open a source-linked report beside the page.</p></div></li>
      </ol>

      <section>
        <h2>Prefer a manual install?</h2>
        <p>Download the latest Chrome-ready ZIP from <a href="https://github.com/biaoxie/lede-lens/releases/latest">GitHub Releases</a> and follow the included installation guide.</p>
      </section>

      <section>
        <h2>Requirements</h2>
        <p>Google Chrome 116 or newer and an OpenAI API key are required. API usage may incur charges on your OpenAI account.</p>
      </section>

      <section>
        <h2>Review before installing</h2>
        <p>Explore the <a href="/features">article evidence and reasoning analysis features</a> and read <a href="/privacy">how LedeLens handles article text, API keys, and saved reports</a>.</p>
      </section>
    </InfoPage>
  );
}
