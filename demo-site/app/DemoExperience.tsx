"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import restrainedAnalysis from "./fixtures/library-analysis.json";
import wasteFramingAnalysis from "./fixtures/library-analysis-waste-framing.json";

type DemoStage = "closed" | "ready" | "loading" | "complete";
type ArticleVersion = "a" | "b";

const metricLabels: Record<string, string> = {
  evidence_coverage: "What supports the main point?",
  source_traceability: "Can you tell who says what?",
  causal_support: "Does the article support its cause-and-effect claims?",
  context_completeness: "Is there enough important context?",
  framing_uncertainty_separation: "Are reporting, interpretation, and uncertainty kept separate?",
};

const statusLabels: Record<string, string> = {
  present: "Strong",
  partial: "Limited",
  missing: "Missing",
  not_applicable: "Not applicable",
};

const issueLabels: Record<string, string> = {
  selection_ambiguity: "Unclear selection",
  scope_shift: "Conclusion outruns the evidence",
  fact_commentary_blend: "Reporting and commentary blend",
  missing_baseline_or_denominator: "Missing baseline or denominator",
  unsupported_causation: "Cause not demonstrated",
  one_sided_sourcing: "One-sided emphasis",
};

const verdictLabels: Record<string, string> = {
  structurally_solid: "Well supported",
  mostly_supported: "Mostly supported",
  evidence_limited: "Limited support",
  severely_under_supported: "Very little support",
};

const verdictSummaries: Record<string, string> = {
  structurally_solid: "The article presents strong support for its main takeaway.",
  mostly_supported: "The article presents reasonable support for its main takeaway, with some important limits.",
  evidence_limited: "The article's main takeaway goes beyond the support it presents.",
  severely_under_supported: "The article presents very little support for a major takeaway.",
};

const presentationStyleLabels: Record<string, string> = {
  restrained: "Restrained",
  interpretive: "Interpretive",
  framing_heavy: "Framing heavy",
  manipulation_risk_signals: "Manipulation risk signals",
};

const metricResultLabels: Record<string, Record<string, string>> = {
  evidence_coverage: { present: "Strong support", partial: "Some support", missing: "Very little support" },
  source_traceability: { present: "Clear", partial: "Partly clear", missing: "Unclear" },
  causal_support: { present: "Supported", partial: "Partly supported", missing: "Not supported" },
  context_completeness: { present: "Enough context", partial: "Some important gaps", missing: "Major gaps" },
  framing_uncertainty_separation: { present: "Clearly distinguished", partial: "Sometimes blurred", missing: "Blurred" },
};

const articles = {
  a: {
    label: "Version A",
    shortLabel: "Restrained reporting",
    title: "City library extends weekend hours",
    dek: "Attendance records and a visitor survey supported the change, while officials said seasonal events may also have influenced the results.",
    analysis: restrainedAnalysis,
    timing: "OpenAI total 8.7s",
    paragraphs: [
      "The Arbor City Library will make later Saturday hours permanent after a six-month pilot, extending service until 8 p.m. beginning next month.",
      "The library board approved the schedule after reviewing pilot attendance, visitor feedback, and the cost of keeping the building open for three additional hours.",
      "Library records show Saturday entries rose 18% during the pilot compared with the same six-month period last year. The entry counts show when people arrived, but not why attendance changed.",
      "A voluntary survey offered inside the library on Saturdays received 642 responses. Seventy-two percent of respondents wanted the later hours to continue, 14% preferred the earlier closing time, and the rest expressed no preference.",
      "Library director Elena Park said the attendance records and survey informed the recommendation. She said the data did not prove that longer hours alone caused the increase in visits.",
      "The city council approved funding for two additional weekend staff shifts. The library estimates that the permanent schedule will add $46,000 in annual staffing and utility costs.",
      "Park said later hours could make the library easier to use for residents who work during the day, while noting that the pilot did not measure visitors' work schedules.",
      "The library said a winter reading festival, three community workshops, and seasonal changes may also have affected attendance. Because the survey reached only Saturday visitors, it did not capture the views of non-visitors or other residents.",
      "Council member David Lin supported the funding but asked the library to publish quarterly attendance and cost figures. He said the schedule should be reconsidered if visits return to their earlier level.",
      "The library will review attendance, staffing costs, and visitor feedback after one year. Officials said the pilot supports that visits rose while later hours were offered and that many surveyed visitors favored the schedule, but it does not establish that the schedule itself caused the increase.",
    ],
  },
  b: {
    label: "Version B",
    shortLabel: "Government waste framing",
    title: "City wastes $46,000 a year on library hours backed by just 462 survey responses",
    dek: "A modest attendance increase and feedback from a tiny share of the city are being used to justify another permanent taxpayer expense.",
    analysis: wasteFramingAnalysis,
    timing: "OpenAI total 12.0s",
    paragraphs: [
      "Arbor City officials have decided to spend an additional $46,000 every year to keep the public library open three hours later on Saturdays.",
      "The city is presenting the decision as a response to community demand. But only about 462 survey respondents said they wanted the later schedule to continue in a city of approximately 85,000 residents.",
      "That amounts to barely one-half of one percent of the population. Nevertheless, officials treated those responses as sufficient public support for making the schedule permanent.",
      "The library also reported an 18% increase in Saturday entries during its six-month pilot. A percentage increase sounds impressive, but officials did not publish the underlying attendance number or show how many individual residents actually benefited.",
      "Taxpayers will now spend nearly $300 for every additional hour the library remains open. At the same annual rate, the schedule could cost $230,000 over five years.",
      "The city has not shown that the later hours attracted new library users. It has not shown that working residents needed the change, and it has not demonstrated that the additional expense will produce lasting benefits.",
      "Even Council member David Lin, who supported the funding, requested quarterly attendance and cost reports and said the schedule should be reconsidered if visits decline.",
      "Officials say they will review the program after one year. By that point, taxpayers will already have paid for a policy approved without clear evidence of broad public demand.",
      "The council could have required convincing evidence before committing public money. Instead, it approved the spending first and left the proof for later.",
      "The conclusion is difficult to avoid: Arbor City has created a permanent expense before demonstrating that a meaningful problem existed. This is not a proven investment in public access. It is a $46,000 annual gamble with taxpayer money.",
    ],
  },
} as const;

const progressCopy = [
  ["Extracting the article", "Finding the main text and assigning source paragraphs."],
  ["Reading the evidence", "Comparing the main takeaway with the material on the page."],
  ["Checking the reasoning", "Reviewing sources, cause and effect, context, and framing."],
  ["Validating the report", "Making sure every finding links back to the article."],
];

function StatusDot({ tone = "green" }: { tone?: "green" | "amber" | "red" }) {
  return <span className={`status-dot ${tone}`} aria-hidden="true" />;
}

type ArticleData = (typeof articles)[ArticleVersion];

function VersionToggle({
  version,
  onChange,
}: {
  version: ArticleVersion;
  onChange: (version: ArticleVersion) => void;
}) {
  return (
    <div className="version-compare">
      <div className="version-copy">
        <strong>Same reported facts. Different framing.</strong>
        <span>Switch versions, then compare what LedeLens finds.</span>
      </div>
      <div className="version-toggle" role="group" aria-label="Choose article version">
        {(["a", "b"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={version === id ? "active" : ""}
            aria-pressed={version === id}
            onClick={() => onChange(id)}
          >
            <strong>{articles[id].label}</strong>
            <span>{articles[id].shortLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BrowserArticle({
  article,
  highlighted,
}: {
  article: ArticleData;
  highlighted: string[];
}) {
  return (
    <div className="article-page">
      <div className="fiction-banner">Fictional demonstration article</div>
      <header className="publication-header">
        <button type="button" aria-label="Open menu" className="hamburger"><i /><i /><i /></button>
        <div className="publication-name"><small>The</small> Meridian Ledger</div>
        <span className="publication-action">Subscribe</span>
      </header>
      <nav className="publication-nav" aria-label="Article sections">
        <span>Latest</span><span>Community</span><span>Culture</span><span>Science</span><span>Ideas</span>
      </nav>
      <article className="mock-article">
        <p className="article-section">Community</p>
        <h1>{article.title}</h1>
        <p className="article-dek">{article.dek}</p>
        <p className="article-byline">By Maya Chen · July 18, 2026 · 5 min read</p>
        <div className="mini-library" aria-label="Stylized library reading room">
          <div className="mini-window" /><div className="mini-shelf left" /><div className="mini-shelf right" />
          <div className="mini-table" /><div className="mini-lamp" />
        </div>
        <div className="article-copy">
          {article.paragraphs.map((paragraph, index) => {
            const id = `p${index + 1}`;
            return (
              <p id={`article-${id}`} key={id} className={highlighted.includes(id) ? "paragraph-highlighted" : ""}>
                <span className="paragraph-anchor">{id}</span>
                {paragraph}
              </p>
            );
          })}
          <div className="article-demo-end">This story is fictional and exists only to demonstrate LedeLens.</div>
        </div>
      </article>
    </div>
  );
}

function ReadyPanel({ article, onAnalyze }: { article: ArticleData; onAnalyze: () => void }) {
  return (
    <>
      <div className="panel-modes"><span className="active">Full article</span><span>Selected text</span></div>
      <section className="source-card">
        <p className="panel-eyebrow">Detected source</p>
        <h2>{article.title}</h2>
        <p>By Maya Chen · July 18, 2026 · 5 min read · 10 paragraphs</p>
      </section>
      <div className="panel-empty">
        <div className="lens-mark mini"><span /><span /></div>
        <h3>Inspect this article&apos;s reasoning</h3>
        <p>Examine its evidence, causal reasoning, context, and framing—without fact-checking.</p>
      </div>
      <p className="demo-data-note">This demo loads a saved LedeLens result. It does not call the OpenAI API or send article text. The Chrome extension uses your OpenAI API key, sends extracted article text and metadata to OpenAI when you analyze, and OpenAI charges may apply.</p>
      <button className="analyze-button" type="button" onClick={onAnalyze}>Analyze article</button>
    </>
  );
}

function LoadingPanel({ step }: { step: number }) {
  return (
    <div className="loading-panel" aria-live="polite">
      <div className="loading-orbit"><span /><span /></div>
      <p className="panel-eyebrow">Demo analysis in progress</p>
      <h2>{progressCopy[step][0]}</h2>
      <p>{progressCopy[step][1]}</p>
      <ol className="progress-list">
        {progressCopy.map(([title], index) => (
          <li key={title} className={index < step ? "done" : index === step ? "current" : ""}>
            <span>{index < step ? "✓" : index + 1}</span>{title}
          </li>
        ))}
      </ol>
      <p className="loading-note">This simulated analysis does not use an API key, call the OpenAI API, or send article text.</p>
    </div>
  );
}

function ResultsPanel({
  article,
  onHighlight,
  onAnalyze,
  onReset,
}: {
  article: ArticleData;
  onHighlight: (ids: string[]) => void;
  onAnalyze: () => void;
  onReset: () => void;
}) {
  const analysis = article.analysis;
  const verdict = analysis.structural_assessment.evidence_structure;
  const isRestrained = verdict === "structurally_solid";
  const rating = verdictLabels[verdict];
  const ratingSummary = verdictSummaries[verdict];
  const style = presentationStyleLabels[analysis.structural_assessment.presentation_style];
  const strongMetrics = Object.values(analysis.article_metrics).filter((metric) => metric.status === "present").length;

  return (
    <div className="results-panel">
      <div className="panel-modes"><span className="active">Full article</span><span>Selected text</span></div>
      <section className="source-card">
        <p className="panel-eyebrow">Detected source</p>
        <h2>{article.title}</h2>
        <p>By Maya Chen · July 18, 2026 · 5 min read · 10 paragraphs</p>
      </section>
      <p className="demo-data-note">This demo loads a saved LedeLens result. It does not call the OpenAI API or send article text. The Chrome extension uses your OpenAI API key, sends extracted article text and metadata to OpenAI when you analyze, and OpenAI charges may apply.</p>
      <button className="analyze-button" type="button" onClick={onAnalyze}>Re-analyze article</button>
      <p className="demo-data-note">Saved result timing: {article.timing}.</p>
      <section className="overall-card">
        <p className="panel-eyebrow">How well does this article support its main takeaway?</p>
        <div className={`overall-rating ${isRestrained ? "" : "warning"}`}>
          <StatusDot tone={isRestrained ? "green" : "amber"} />
          <strong>{rating}</strong>
          <button className="rating-help" type="button" aria-label="About this rating" aria-describedby="rating-explainer">?</button>
          <span id="rating-explainer" className="rating-tooltip" role="tooltip">{ratingSummary}</span>
        </div>
        <p>{ratingSummary}</p>
        <p>This looks only at support presented in the article. It does not check whether the reported claims are true.</p>
        <div className="style-row">
          <span>Presentation style</span>
          <strong className={isRestrained ? "" : "warning"}>{style}</strong>
          <button className="rating-help" type="button" aria-label="About presentation style" aria-describedby="style-explainer">?</button>
          <span id="style-explainer" className="rating-tooltip" role="tooltip">Presentation style describes how the article is written, not whether it is true.</span>
        </div>
        <p>{analysis.structural_assessment.one_sentence}</p>
      </section>

      <section className="result-section conclusion-card">
        <h2>What the article can support</h2>
        <p>{analysis.bounded_conclusion}</p>
      </section>

      <section className="result-section">
        <div className="section-title-row"><h2>Five questions to ask</h2><span>{strongMetrics} strong</span></div>
        <div className="metric-list">
          {Object.entries(analysis.article_metrics).map(([name, metric]) => (
            <article className="metric-card" key={name}>
              <div className="metric-heading">
                <h3>{metricLabels[name]}</h3>
                <span className={`metric-status ${metric.status}`}>
                  <StatusDot tone={metric.status === "present" ? "green" : metric.status === "missing" ? "red" : "amber"} />
                  {metricResultLabels[name]?.[metric.status] ?? statusLabels[metric.status]}
                </span>
              </div>
              <p>{metric.rationale}</p>
              <div className="paragraph-links">
                {metric.paragraph_ids.map((id) => (
                  <button type="button" key={id} onClick={() => onHighlight(metric.paragraph_ids)}>{id}</button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="result-section">
        <h2>What to watch ({analysis.issues.length})</h2>
        {analysis.issues.map((issue) => (
          <article className="issue-card" key={issue.type}>
            <div className="metric-heading">
              <h3>{issueLabels[issue.type]}</h3>
              <span className={`severity ${issue.severity}`}>{issue.severity[0].toUpperCase() + issue.severity.slice(1)}</span>
            </div>
            <p>{issue.description}</p>
            <div className="paragraph-links">
              {issue.paragraph_ids.map((id) => (
                <button type="button" key={id} onClick={() => onHighlight(issue.paragraph_ids)}>{id}</button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <div className="result-disclaimer">
        <strong>DISCLAIMER:</strong> LedeLens looks at how well an article supports its conclusions and separates reporting from interpretation. It does not fact-check the article or judge its political viewpoint.
      </div>
      <p className="demo-data-note">Schema 0.2.0</p>
      <button className="reset-button" type="button" onClick={onReset}>Replay demo</button>
    </div>
  );
}

export default function DemoExperience() {
  const [stage, setStage] = useState<DemoStage>("closed");
  const [version, setVersion] = useState<ArticleVersion>("a");
  const [step, setStep] = useState(0);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const browserRef = useRef<HTMLDivElement>(null);
  const article = articles[version];

  useEffect(() => {
    if (stage !== "loading") return;
    const timers = [
      window.setTimeout(() => setStep(1), 850),
      window.setTimeout(() => setStep(2), 1700),
      window.setTimeout(() => setStep(3), 2550),
      window.setTimeout(() => setStage("complete"), 3450),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [stage]);

  const highlightParagraphs = (ids: string[]) => {
    setHighlighted(ids);
    window.setTimeout(() => document.getElementById(`article-${ids[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    window.setTimeout(() => setHighlighted([]), 6000);
  };

  const openDemo = () => {
    setStage("ready");
    window.setTimeout(() => browserRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const resetDemo = () => {
    setHighlighted([]);
    setStep(0);
    setStage("ready");
  };

  const startAnalysis = () => {
    setStep(0);
    setStage("loading");
  };

  const changeVersion = (nextVersion: ArticleVersion) => {
    if (nextVersion === version) return;
    setVersion(nextVersion);
    setHighlighted([]);
    setStep(0);
    if (stage === "loading") setStage("ready");
  };

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <a className="demo-brand" href="#">
          <span className="lens-mark"><i /><i /></span>
          <span><strong>LedeLens</strong><small>News evidence analysis</small></span>
        </a>
        <nav className="demo-actions" aria-label="Project links">
          <a
            className="github-link"
            href="https://github.com/biaoxie/lede-lens"
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub <span>↗</span>
          </a>
          <a className="store-link" href="https://github.com/biaoxie/lede-lens/releases/latest">
            Download extension <span>↗</span>
          </a>
        </nav>
      </header>

      <section className="demo-intro">
        <p className="intro-kicker">Critical-reading Chrome extension</p>
        <h1>See whether an article&apos;s evidence<br />supports its conclusions.</h1>
        <p>LedeLens is an open-source news article evidence and reasoning analyzer. Inspect sourcing, cause and effect, context, and framing in Chrome—without fact-checking or political bias scores.</p>
        <button type="button" onClick={openDemo}>Try the interactive demo <span>↓</span></button>
        <div className="intro-proof">
          <span><StatusDot /> Saved demo result · no API key used</span>
          <span><StatusDot /> Fictional article</span>
          <span><StatusDot /> Saved LedeLens result</span>
        </div>
      </section>

      <section className="browser-stage" ref={browserRef} aria-label="Interactive LedeLens demonstration">
        <VersionToggle version={version} onChange={changeVersion} />
        <div className={`browser-window panel-${stage}`}>
          <div className="browser-tabs">
            <div className="window-controls"><i /><i /><i /></div>
            <div className="browser-tab active"><span className="tab-favicon">M</span><span>{article.title}</span><b>×</b></div>
            <button className="new-tab" type="button" aria-label="New tab">+</button>
          </div>
          <div className="browser-toolbar">
            <div className="browser-nav"><span>←</span><span>→</span><span>↻</span></div>
            <div className="address-bar"><span>◉</span><span>meridian-ledger.example/community/library-hours</span><b>☆</b></div>
            <button
              className={`extension-button ${stage !== "closed" ? "selected" : ""}`}
              type="button"
              aria-label={stage === "closed" ? "Open LedeLens" : "Close LedeLens"}
              onClick={() => setStage(stage === "closed" ? "ready" : "closed")}
            >
              <span className="lens-mark toolbar-mark"><i /><i /></span>
              <span className="extension-tooltip">{stage === "closed" ? "Open LedeLens" : "Close LedeLens"}</span>
            </button>
            <span className="browser-menu">⋮</span>
          </div>
          <div className="browser-content">
            <div className="article-viewport"><BrowserArticle article={article} highlighted={highlighted} /></div>
            {stage !== "closed" && (
              <aside className="lede-panel">
                <header className="panel-header">
                  <div><p className="panel-eyebrow">Article structure audit</p><h2>LedeLens</h2></div>
                  <button type="button" aria-label="Close side panel" onClick={() => setStage("closed")}>×</button>
                </header>
                <div className="panel-scroll">
                  {stage === "ready" && <ReadyPanel article={article} onAnalyze={startAnalysis} />}
                  {stage === "loading" && <LoadingPanel step={step} />}
                  {stage === "complete" && (
                    <ResultsPanel
                      article={article}
                      onHighlight={highlightParagraphs}
                      onAnalyze={startAnalysis}
                      onReset={resetDemo}
                    />
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
        {stage === "closed" && <div className="demo-hint"><span>↑</span> Select the LedeLens icon to begin</div>}
      </section>

      <section className="demo-explainer">
        <div>
          <p className="intro-kicker">A reading aid, not a verdict</p>
          <h2>Ask better questions about what you read.</h2>
        </div>
        <div className="explainer-grid">
          <article><span>01</span><h3>Open any article</h3><p>Use the full page or select a passage you want to inspect more closely.</p></article>
          <article><span>02</span><h3>Analyze its structure</h3><p>Review internal evidence, sourcing, causal reasoning, missing context, and framing.</p></article>
          <article><span>03</span><h3>Return to the source</h3><p>Every important finding links back to the paragraphs that support it.</p></article>
        </div>
        <div className="context-links">
          <Link href="/features">Explore the evidence and reasoning analysis features</Link>
          <Link href="/how-it-works">See how source-linked article analysis works</Link>
          <Link href="/guides/evaluate-evidence-in-a-news-article">Learn how to evaluate evidence in a news article</Link>
          <Link href="/install">Install the LedeLens Chrome extension</Link>
        </div>
      </section>

      <footer className="demo-footer">
        <span>© 2026 LedeLens</span>
        <nav aria-label="Learn more about LedeLens">
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/guides/evaluate-evidence-in-a-news-article">Reading guide</Link>
          <Link href="/install">Install</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/biaoxie/lede-lens" target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
      </footer>
    </main>
  );
}
