import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
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

test("server-renders the interactive LedeLens demo", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>City library extends weekend hours/);
  assert.match(html, /See how an article/);
  assert.match(html, /Try the interactive demo/);
  assert.match(html, /Fictional demonstration article/);
  assert.match(html, /No API key needed/);
  assert.match(html, /Open LedeLens/);
  assert.match(html, /City library extends weekend hours after six-month pilot/);
  assert.match(html, /saved analysis fixture/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Starter Project/);
});

test("ships a complete, static analysis fixture and social card", async () => {
  const fixture = JSON.parse(
    await readFile(new URL("../app/fixtures/library-analysis.json", import.meta.url), "utf8"),
  );

  assert.equal(fixture.schema_version, "0.2.0");
  assert.equal(fixture.structural_assessment.evidence_structure, "structurally_solid");
  assert.equal(fixture.structural_assessment.presentation_style, "restrained");
  assert.equal(fixture.article_metrics.causal_support.status, "not_applicable");
  assert.deepEqual(Object.keys(fixture.article_metrics), [
    "evidence_coverage",
    "source_traceability",
    "causal_support",
    "context_completeness",
    "framing_uncertainty_separation",
  ]);
  assert.equal(fixture.issues.length, 1);
  await access(new URL("../public/og.png", import.meta.url));
});
