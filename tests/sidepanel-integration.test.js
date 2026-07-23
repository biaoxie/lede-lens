import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const panelSource = await readFile(
  new URL("../src/sidepanel/panel.js", import.meta.url),
  "utf8",
);

test("explicit cancellation updates the UI before aborting asynchronous work", () => {
  const handler = panelSource.match(
    /elements\.cancelAnalysis\.addEventListener\("click", \(\) => \{(?<body>[\s\S]*?)\n\}\);/,
  );
  assert.ok(handler?.groups?.body);
  assert.ok(
    handler.groups.body.indexOf("cancelProgress") < handler.groups.body.indexOf("stopAnalysisOperation"),
    "The cancellation state must render even when cache cleanup is still pending.",
  );
  assert.match(handler.groups.body, /No report was saved/);
});

test("cancelled request rejection remains distinct from failure progress", () => {
  assert.match(
    panelSource,
    /if \(error\?\.category === "cancelled"\) \{\s+cancelProgress/,
  );
});

test("cancellation during extraction cannot advance to analysis progress", () => {
  assert.match(
    panelSource,
    /const article = await extract\(analysisRevision\);\s+if \(!article\) return;\s+if \(!isCurrentAnalysis\(operation\)\) return;\s+setProgress\(/,
  );
});
