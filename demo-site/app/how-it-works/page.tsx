import type { Metadata } from "next";
import InfoPage from "../InfoPage";

export const metadata: Metadata = {
  title: "How LedeLens Works",
  description:
    "See how LedeLens extracts readable article text, assigns paragraph IDs, requests structured analysis, validates it locally, and links findings to the source.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <InfoPage
      eyebrow="Transparent workflow"
      title="From article to source-linked analysis."
      introduction="LedeLens runs when you ask it to analyze a full article or a selected passage. The report appears beside the page in Chrome."
    >
      <ol className="process-list">
        <li><span>01</span><div><h2>Extract the readable article</h2><p>Mozilla Readability processes a cloned page locally. LedeLens keeps stable paragraph IDs so findings can link back to the source.</p></div></li>
        <li><span>02</span><div><h2>Request structured analysis</h2><p>The article text and metadata are sent separately from the analysis instructions. The current extension integration uses a GPT-5 model selected with your OpenAI API key.</p></div></li>
        <li><span>03</span><div><h2>Validate before rendering</h2><p>The response must match the project’s published analysis schema and reference real paragraph IDs. Invalid output is not shown as a report.</p></div></li>
        <li><span>04</span><div><h2>Return to the evidence</h2><p>The side panel presents an overall finding, five reader questions, material issues, and the strongest conclusion supported by the article.</p></div></li>
      </ol>

      <section>
        <h2>What LedeLens does not do</h2>
        <p>It does not fact-check events, rate a publisher’s credibility, identify political bias, or infer that an author intended to manipulate readers. Its findings are prompts for closer reading, not verdicts on truth.</p>
      </section>
    </InfoPage>
  );
}
