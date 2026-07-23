import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [panelSource, backgroundSource, panelMarkup, uiStateSource] = await Promise.all([
  readFile(new URL("../src/sidepanel/panel.js", import.meta.url), "utf8"),
  readFile(new URL("../src/background.js", import.meta.url), "utf8"),
  readFile(new URL("../src/sidepanel/index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/ui-state.js", import.meta.url), "utf8"),
]);

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

test("startup restores settings and local data without requesting OpenAI models", () => {
  const initializeBody = panelSource.match(/async function initialize\(\) \{([\s\S]*?)\n\}\n\ninitialize\(\);/)?.[1];
  assert.ok(initializeBody, "initialize function should be present");
  assert.match(initializeBody, /GET_SETTINGS/);
  assert.match(initializeBody, /GET_DATA_STATUS/);
  assert.doesNotMatch(initializeBody, /LIST_MODELS/);
});

test("model listing is an explicit user action and saves the session key", () => {
  assert.match(panelSource, /elements\.loadModels\.addEventListener\("click", loadAvailableModels\)/);
  assert.match(panelSource, /elements\.changeModel\.addEventListener\("click"/);
  assert.match(backgroundSource, /AVAILABLE_MODELS_KEY/);
  assert.match(backgroundSource, /CONFIRMED_MODEL_KEY/);
  assert.match(backgroundSource, /openaiApiKey: resolvedKey/);
});

test("settings separate connection setup from destructive local-data controls", () => {
  assert.match(panelMarkup, /OpenAI connection/);
  assert.match(panelMarkup, /Data on this device/);
  assert.match(panelMarkup, /Save and continue/);
  assert.match(panelMarkup, /Delete session API key/);
  assert.match(panelMarkup, /Delete saved reports/);
  assert.match(uiStateSource, /Restored locally—no OpenAI request was made/);
  assert.match(panelSource, /confirm\(cacheDeletionPrompt/);
});
