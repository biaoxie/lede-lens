import type { Metadata } from "next";
import InfoPage from "../InfoPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Learn how LedeLens handles article text, page addresses, OpenAI API keys, and locally saved analysis reports.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Privacy by scope"
      title="What LedeLens handles—and where."
      introduction="LedeLens has no advertising, analytics, or maintainer-operated analysis server. The extension processes only what is needed for the analysis you request."
    >
      <section>
        <h2>Article data</h2>
        <p>When you select Analyze, the extracted article text, title, byline, publication date, and extraction notes are sent to OpenAI. The page address is not included in that request.</p>
      </section>

      <section>
        <h2>API-key handling</h2>
        <p>Your OpenAI API key is stored in Chrome session storage and is cleared when the browser session ends. It is not exposed to article pages, content scripts, the project maintainer, or advertising services.</p>
      </section>

      <section>
        <h2>Saved reports</h2>
        <p>Successful reports are saved locally in the browser profile so an unchanged article can be restored without another OpenAI request. They are not synchronized with Chrome Sync, and settings include a control for clearing them.</p>
      </section>

      <section className="install-callout">
        <h2>Read the full policy</h2>
        <p>The repository policy documents the exact data flow, storage choices, deletion controls, and third-party processing.</p>
        <a className="primary-info-link" href="https://github.com/biaoxie/lede-lens/blob/main/PRIVACY.md">Full privacy policy on GitHub ↗</a>
      </section>
    </InfoPage>
  );
}
