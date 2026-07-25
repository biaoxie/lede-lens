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
      introduction="LedeLens is awaiting Chrome Web Store approval. Until the listing is available, install the packaged extension from the latest GitHub release."
    >
      <section className="install-callout">
        <h2>Download the latest release</h2>
        <p>The release includes a Chrome-ready ZIP and an installation guide. No source-code build is required.</p>
        <a className="primary-info-link" href="https://github.com/biaoxie/lede-lens/releases/latest">Download from GitHub Releases ↗</a>
      </section>

      <ol className="process-list compact">
        <li><span>01</span><div><h2>Extract the ZIP</h2><p>Download the latest packaged release and expand it on your computer.</p></div></li>
        <li><span>02</span><div><h2>Open Chrome Extensions</h2><p>Visit <code>chrome://extensions</code> and enable Developer mode.</p></div></li>
        <li><span>03</span><div><h2>Load LedeLens</h2><p>Select “Load unpacked,” choose the extracted folder, and pin LedeLens from Chrome’s Extensions menu.</p></div></li>
        <li><span>04</span><div><h2>Choose a model</h2><p>Enter a restricted OpenAI project key, load the compatible GPT-5 models available to it, and confirm your selection.</p></div></li>
      </ol>

      <section>
        <h2>Requirements</h2>
        <p>Google Chrome 116 or newer and an OpenAI API key are required. API usage may incur charges on your OpenAI account.</p>
      </section>
    </InfoPage>
  );
}
