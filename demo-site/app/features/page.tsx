import InfoPage from "../InfoPage";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Article Analysis Features",
  description:
    "Explore how LedeLens analyzes article evidence, sourcing, causality, missing context, framing, and uncertainty with paragraph-linked explanations.",
  path: "/features",
});

export default function FeaturesPage() {
  return (
    <InfoPage
      eyebrow="Critical-reading features"
      title="Understand the reasoning behind an article."
      introduction="LedeLens examines the support an article provides for its own conclusions. It is designed for news reports, opinion pieces, explainers, essays, and blog posts."
    >
      <section>
        <h2>Five practical questions</h2>
        <div className="info-grid">
          <article><h3>Evidence</h3><p>What material inside the article supports its main takeaway—and where does the conclusion go further?</p></article>
          <article><h3>Sources</h3><p>Can readers tell who says what, while keeping attribution separate from real-world credibility?</p></article>
          <article><h3>Cause and effect</h3><p>Does the article show enough to support an important “because A, therefore B” move?</p></article>
          <article><h3>Context</h3><p>Is important background missing that could materially change how the conclusion is understood?</p></article>
          <article><h3>Framing and uncertainty</h3><p>Are reporting, interpretation, prediction, and uncertainty kept distinguishable?</p></article>
        </div>
      </section>

      <section>
        <h2>A bounded conclusion</h2>
        <p>LedeLens states the strongest conclusion the article can support on its own terms, assuming the reported material is accurate. It does not upgrade association to causation or turn attributed opinion into established fact.</p>
      </section>

      <section>
        <h2>Trace every important finding</h2>
        <p>Paragraph references connect the analysis back to the article. Select a reference in the side panel to return to the relevant passage instead of accepting an unexplained score.</p>
      </section>
    </InfoPage>
  );
}
