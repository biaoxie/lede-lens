import Link from "next/link";
import InfoPage from "../../InfoPage";
import { createPageMetadata } from "../../seo";

export const metadata = createPageMetadata({
  title: "How to Evaluate Evidence in a News Article",
  description:
    "A practical six-step guide to evaluating a news article’s evidence, sources, causal claims, context, framing, and strongest supportable conclusion.",
  path: "/guides/evaluate-evidence-in-a-news-article",
});

export default function EvaluateEvidenceGuidePage() {
  return (
    <InfoPage
      eyebrow="Critical-reading guide"
      title="How to Evaluate Evidence in a News Article"
      introduction="A useful article analysis starts with a narrow question: how well does the material presented in this article support the conclusion it asks you to accept?"
    >
      <section>
        <h2>1. State the main takeaway</h2>
        <p>Write one sentence describing what the article wants a reader to conclude—not merely its topic. A report can contain many accurate details while still asking those details to carry a broader claim.</p>
      </section>

      <section>
        <h2>2. Inventory the support inside the article</h2>
        <p>Mark the material offered in support: records, direct observations, quotations, data, examples, documents, or attributed expert interpretation. Then ask which parts directly support the takeaway and which only provide background.</p>
      </section>

      <section>
        <h2>3. Separate reporting from interpretation</h2>
        <ul className="guide-list">
          <li><strong>Reported fact:</strong> a claim presented as having happened or being measurable.</li>
          <li><strong>Attribution:</strong> what a named or unnamed source says.</li>
          <li><strong>Interpretation:</strong> what the author or source thinks the facts mean.</li>
          <li><strong>Uncertainty:</strong> what remains unknown, estimated, predicted, or disputed.</li>
        </ul>
      </section>

      <section>
        <h2>4. Test cause-and-effect claims</h2>
        <p>If an outcome happened after a change, the sequence alone does not show that the change caused it. Look for comparison groups, a baseline, a plausible mechanism, alternative explanations, and language that matches the strength of the evidence.</p>
      </section>

      <section>
        <h2>5. Look for context that could change the conclusion</h2>
        <p>Useful context is not every fact the article omitted. Focus on missing denominators, time frames, selection methods, relevant alternatives, and limitations that could materially change how a reader understands the main takeaway.</p>
      </section>

      <section>
        <h2>6. Write the strongest bounded conclusion</h2>
        <p>Finish with the strongest conclusion the article can support if its reported material is accurate. Preserve important limits: do not turn association into causation, one example into a population-wide rule, or a source’s judgment into established fact.</p>
      </section>

      <section>
        <h2>Worked example: later library hours</h2>
        <div className="example-card">
          <h3>The broad claim</h3>
          <p>“Later Saturday hours caused an 18% increase in library visits and clearly meet community demand.”</p>
        </div>
        <div className="example-card">
          <h3>What the article presents</h3>
          <p>Entries rose 18% during a six-month pilot, 72% of 642 voluntary survey respondents preferred later hours, and the article notes that events and seasonal changes may also have influenced attendance. The survey reached Saturday visitors, not a representative sample of the city.</p>
        </div>
        <div className="example-card">
          <h3>The bounded conclusion</h3>
          <p>“Visits rose while later hours were offered, and most surveyed Saturday visitors favored continuing them. The material does not establish that the schedule caused the increase or that the survey represents the whole community.”</p>
        </div>
      </section>

      <section>
        <h2>Use the checklist while you read</h2>
        <p>LedeLens applies these questions to the article in your browser and links important findings back to its paragraphs. <Link href="/">Try the interactive demo</Link>, explore the <Link href="/features">evidence and reasoning analysis features</Link>, or <Link href="/install">install the Chrome extension</Link>.</p>
      </section>
    </InfoPage>
  );
}
