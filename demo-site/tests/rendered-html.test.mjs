import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the interactive LedeLens demo", async (t) => {
  try {
    await access(new URL("../dist/server/index.js", import.meta.url));
  } catch {
    t.skip("Build the demo before running its server-render test.");
    return;
  }

  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>LedeLens — Article Structure Analysis/);
  assert.match(html, /rel="canonical" href="https:\/\/ledelens\.app\/"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /SoftwareApplication/);
  assert.match(html, /og-ledelens\.png/);
  assert.match(
    html,
    /name="google-site-verification" content="waYEp3PQsJmQy5xnEGpo-WfuQPom7fXAYXrZW17WxBU"/,
  );
  assert.match(html, /See how an article/);
  assert.match(html, /open-source Chrome extension/);
  assert.match(html, /Try the interactive demo/);
  assert.match(html, /Fictional demonstration article/);
  assert.match(html, /Saved demo result · no API key used/);
  assert.match(html, /Same reported facts\. Different framing\./);
  assert.match(html, /Version A/);
  assert.match(html, /Version B/);
  assert.match(html, /Government waste framing/);
  assert.match(html, /Open LedeLens/);
  assert.match(html, /City library extends weekend hours/);
  assert.match(html, /Saved LedeLens result/);
  assert.match(html, /href="\/features"/);
  assert.match(html, /href="\/how-it-works"/);
  assert.match(html, /href="\/install"/);
  assert.match(html, /href="\/privacy"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("serves indexable SEO routes and information pages", async (t) => {
  try {
    await access(new URL("../dist/server/index.js", import.meta.url));
  } catch {
    t.skip("Build the demo before running its server-render test.");
    return;
  }

  const robots = await render("/robots.txt");
  assert.equal(robots.status, 200);
  assert.match(await robots.text(), /Allow: \/\s+Sitemap: https:\/\/ledelens\.app\/sitemap\.xml/);

  const sitemap = await render("/sitemap.xml");
  assert.equal(sitemap.status, 200);
  const sitemapXml = await sitemap.text();
  assert.match(sitemapXml, /<loc>https:\/\/ledelens\.app\/<\/loc>/);
  for (const route of ["/features", "/how-it-works", "/install", "/privacy"]) {
    assert.match(sitemapXml, new RegExp(`<loc>https:\\/\\/ledelens\\.app${route}<\\/loc>`));
  }

  const expectedPages = [
    ["/features", /Understand the reasoning behind an article/],
    ["/how-it-works", /From article to source-linked analysis/],
    ["/install", /Install LedeLens/],
    ["/privacy", /What LedeLens handles/],
  ];

  for (const [path, heading] of expectedPages) {
    const response = await render(path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, heading);
    assert.match(html, new RegExp(`rel="canonical" href="https:\\/\\/ledelens\\.app${path}"`));
    assert.match(html, new RegExp(`property="og:url" content="https:\\/\\/ledelens\\.app${path}"`));
  }
});

test("ships a complete, static analysis fixture and social card", async () => {
  const componentSource = await readFile(
    new URL("../app/DemoExperience.tsx", import.meta.url),
    "utf8",
  );
  const stylesheetSource = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const fixture = JSON.parse(
    await readFile(new URL("../app/fixtures/library-analysis.json", import.meta.url), "utf8"),
  );
  const wasteFramingFixture = JSON.parse(
    await readFile(new URL("../app/fixtures/library-analysis-waste-framing.json", import.meta.url), "utf8"),
  );

  assert.equal(fixture.schema_version, "0.2.0");
  assert.equal(fixture.structural_assessment.evidence_structure, "structurally_solid");
  assert.equal(fixture.structural_assessment.presentation_style, "restrained");
  assert.equal(fixture.article_metrics.causal_support.status, "present");
  assert.deepEqual(Object.keys(fixture.article_metrics), [
    "evidence_coverage",
    "source_traceability",
    "causal_support",
    "context_completeness",
    "framing_uncertainty_separation",
  ]);
  assert.equal(fixture.issues.length, 1);
  assert.equal(fixture.issues[0].severity, "medium");
  assert.equal(
    fixture.article_metrics.context_completeness.rationale,
    "It includes key limits that could change interpretation, such as other events affecting attendance and the survey reaching only Saturday visitors.",
  );
  assert.equal(
    fixture.article_metrics.framing_uncertainty_separation.rationale,
    "Observed numbers, source statements, and uncertainty are kept distinct, especially around what the data can and cannot show.",
  );
  assert.equal(wasteFramingFixture.schema_version, "0.2.0");
  assert.equal(wasteFramingFixture.structural_assessment.evidence_structure, "evidence_limited");
  assert.equal(wasteFramingFixture.structural_assessment.presentation_style, "framing_heavy");
  assert.equal(wasteFramingFixture.article_metrics.causal_support.status, "missing");
  assert.equal(wasteFramingFixture.article_metrics.context_completeness.status, "missing");
  assert.equal(wasteFramingFixture.article_metrics.framing_uncertainty_separation.status, "partial");
  assert.equal(wasteFramingFixture.issues.length, 3);
  const referencedParagraphs = [
    ...Object.values(fixture.article_metrics).flatMap((metric) => metric.paragraph_ids),
    ...fixture.issues.flatMap((issue) => issue.paragraph_ids),
  ];
  assert.ok(referencedParagraphs.every((id) => /^p(?:[1-9]|10)$/.test(id)));
  const wasteFramingParagraphs = [
    ...Object.values(wasteFramingFixture.article_metrics).flatMap((metric) => metric.paragraph_ids),
    ...wasteFramingFixture.issues.flatMap((issue) => issue.paragraph_ids),
  ];
  assert.ok(wasteFramingParagraphs.every((id) => /^p(?:[1-9]|10)$/.test(id)));
  assert.match(componentSource, /Chrome extension uses your OpenAI API key/);
  assert.match(componentSource, /City wastes \$46,000 a year on library hours/);
  assert.match(componentSource, /Same reported facts\. Different framing\./);
  assert.match(componentSource, /10 paragraphs/);
  assert.match(componentSource, /OpenAI total 8\.7s/);
  assert.match(componentSource, /OpenAI total 12\.0s/);
  assert.match(componentSource, /Schema 0\.2\.0/);
  assert.match(
    stylesheetSource,
    /\.article-viewport\s*\{[^}]*\bisolation:\s*isolate;/s,
  );
  assert.match(
    stylesheetSource,
    /\.lede-panel\s*\{[^}]*\bz-index:\s*1;/s,
  );
  await access(new URL("../public/og.png", import.meta.url));
  await access(new URL("../public/og-ledelens.png", import.meta.url));
  await access(new URL("../public/icon.png", import.meta.url));
});
