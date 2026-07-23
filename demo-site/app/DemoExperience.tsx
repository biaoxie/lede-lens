"use client";

import { useEffect, useRef, useState } from "react";
import analysis from "./fixtures/library-analysis.json";

type DemoStage = "closed" | "ready" | "loading" | "complete";

const metricLabels: Record<string, string> = {
  evidence_coverage: "What supports the main point?",
  source_traceability: "Who says this?",
  causal_support: "Does the article show why?",
  context_completeness: "What important context is missing?",
  framing_uncertainty_separation: "Are facts, interpretation, and uncertainty kept separate?",
};

const metricStatusLabels: Record<string, string> = {
  present: "Clear",
  partial: "Some gaps",
  missing: "Missing",
  not_applicable: "Not needed",
};

const issueLabels: Record<string, string> = {
  selection_ambiguity: "Who the survey represents",
};

const articleParagraphs = [
  "The Arbor City Library will keep its doors open until 8 p.m. on Saturdays after completing a six-month pilot of longer weekend hours.",
  "Library records show an 18% increase in Saturday visits compared with the same six months last year. The records count entries but do not show why each visitor came to the building.",
  "A survey offered to weekend visitors received 642 responses. Seventy-two percent of respondents said they wanted the extended schedule to continue, while 14% preferred the earlier closing time and the remainder had no preference.",
  "Library director Elena Park said the attendance records and survey informed the decision. She also noted that a winter reading festival and three community workshops may have contributed to the increase.",
  "The city council approved funding for two additional weekend staff shifts. The library estimates that the longer schedule will add $46,000 to annual staffing and utility costs.",
  "Council member David Lin supported the funding but asked the library to publish quarterly attendance and cost figures. He said the decision should be revisited if visits return to their earlier level.",
  "The visitor survey was voluntary and was offered only inside the library on Saturdays. People who already used the building on weekends may therefore be more likely to appear in the results than residents who did not visit.",
  "The library will review attendance, staffing costs, and visitor feedback again after the schedule has been in place for one year. Officials said weekday hours will not change during that period.",
  "The available records support that Saturday use rose during the pilot and that many surveyed visitors favored later hours. They do not establish that the schedule change alone caused the increase.",
];

const progressCopy = [
  ["Extracting the article", "Finding the main text and assigning source paragraphs."],
  ["Reading the evidence", "Comparing the main takeaway with the material on the page."],
  ["Checking the reasoning", "Reviewing sources, cause and effect, context, and framing."],
  ["Validating the report", "Making sure every finding links back to the article."],
];

function StatusDot({ tone = "green" }: { tone?: "green" | "amber" | "red" }) {
  return <span className={`status-dot ${tone}`} aria-hidden="true" />;
}

function BrowserArticle({ highlighted }: { highlighted: string[] }) {
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
        <h1>City library extends weekend hours after six-month pilot</h1>
        <p className="article-dek">Attendance records and a visitor survey supported the change, while officials said seasonal events may also have influenced the results.</p>
        <p className="article-byline">By Maya Chen · July 18, 2026 · 5 min read</p>
        <div className="mini-library" aria-label="Stylized library reading room">
          <div className="mini-window" /><div className="mini-shelf left" /><div className="mini-shelf right" />
          <div className="mini-table" /><div className="mini-lamp" />
        </div>
        <div className="article-copy">
          {articleParagraphs.map((paragraph, index) => {
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

function ReadyPanel({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <>
      <div className="panel-modes"><span className="active">Full article</span><span>Selected text</span></div>
      <section className="source-card">
        <p className="panel-eyebrow">Detected source</p>
        <h2>City library extends weekend hours after six-month pilot</h2>
        <p>Maya Chen · 9 paragraphs</p>
      </section>
      <div className="panel-empty">
        <div className="lens-mark mini"><span /><span /></div>
        <h3>Inspect this article&apos;s reasoning</h3>
        <p>Examine its evidence, causal reasoning, context, and framing—without fact-checking.</p>
      </div>
      <p className="demo-data-note">Demo mode uses a saved fixture. No article text is sent anywhere.</p>
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
      <p className="loading-note">This is a simulated workflow. No API key or network request is used.</p>
    </div>
  );
}

function ResultsPanel({ onHighlight, onReset }: { onHighlight: (ids: string[]) => void; onReset: () => void }) {
  return (
    <div className="results-panel">
      <section className="overall-card">
        <p className="panel-eyebrow">Overall finding</p>
        <div className="overall-rating">
          <StatusDot />
          <strong>Well supported</strong>
          <button className="rating-help" type="button" aria-label="About this rating" aria-describedby="rating-explainer">?</button>
          <span id="rating-explainer" className="rating-tooltip" role="tooltip">The article&apos;s main takeaway is well supported by material presented within the article, with only minor limitations.</span>
        </div>
        <p>{analysis.structural_assessment.one_sentence}</p>
        <div className="style-row"><span>Presentation style</span><strong>Restrained</strong></div>
      </section>

      <section className="result-section conclusion-card">
        <h2>What the article can support</h2>
        <p>{analysis.bounded_conclusion}</p>
      </section>

      <section className="result-section">
        <div className="section-title-row"><h2>Five questions to ask</h2><span>4 clear · 1 not needed</span></div>
        <div className="metric-list">
          {Object.entries(analysis.article_metrics).map(([name, metric]) => (
            <article className="metric-card" key={name}>
              <div className="metric-heading">
                <h3>{metricLabels[name]}</h3>
                <span className={`metric-status ${metric.status}`}><StatusDot />{metricStatusLabels[metric.status]}</span>
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
              <span className="severity low">Low</span>
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
        <strong>DISCLAIMER:</strong> LedeLens evaluates internal support and presentation. It does not fact-check the article or judge its viewpoint.
      </div>
      <button className="reset-button" type="button" onClick={onReset}>Replay demo</button>
    </div>
  );
}

export default function DemoExperience() {
  const [stage, setStage] = useState<DemoStage>("closed");
  const [step, setStep] = useState(0);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const browserRef = useRef<HTMLDivElement>(null);

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

  return (
    <main className="demo-shell">
      <header className="demo-header">
        <a className="demo-brand" href="#">
          <span className="lens-mark"><i /><i /></span>
          <span><strong>LedeLens</strong><small>Interactive product demo</small></span>
        </a>
        <a className="store-link" href="https://chromewebstore.google.com/detail/aedlaaeahdhcklnbojnhhghikdjimkei">Get the extension <span>↗</span></a>
      </header>

      <section className="demo-intro">
        <p className="intro-kicker">Structure, not truth.</p>
        <h1>See how an article<br />supports its conclusions.</h1>
        <p>LedeLens helps readers inspect evidence, sourcing, cause and effect, context, and framing—without fact-checking or political bias ratings.</p>
        <button type="button" onClick={openDemo}>Try the interactive demo <span>↓</span></button>
        <div className="intro-proof">
          <span><StatusDot /> No API key needed</span>
          <span><StatusDot /> Fictional article</span>
          <span><StatusDot /> Real LedeLens schema</span>
        </div>
      </section>

      <section className="browser-stage" ref={browserRef} aria-label="Interactive LedeLens demonstration">
        <div className={`browser-window panel-${stage}`}>
          <div className="browser-tabs">
            <div className="window-controls"><i /><i /><i /></div>
            <div className="browser-tab active"><span className="tab-favicon">M</span><span>City library extends weekend hours</span><b>×</b></div>
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
            <div className="article-viewport"><BrowserArticle highlighted={highlighted} /></div>
            {stage !== "closed" && (
              <aside className="lede-panel">
                <header className="panel-header">
                  <div><p className="panel-eyebrow">Article structure audit</p><h2>LedeLens</h2></div>
                  <button type="button" aria-label="Close side panel" onClick={() => setStage("closed")}>×</button>
                </header>
                <div className="panel-scroll">
                  {stage === "ready" && <ReadyPanel onAnalyze={() => { setStep(0); setStage("loading"); }} />}
                  {stage === "loading" && <LoadingPanel step={step} />}
                  {stage === "complete" && <ResultsPanel onHighlight={highlightParagraphs} onReset={resetDemo} />}
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
      </section>

      <footer className="demo-footer">
        <span>© 2026 LedeLens</span>
        <span>This demo uses fictional content and a saved analysis fixture. No API request is made.</span>
      </footer>
    </main>
  );
}
