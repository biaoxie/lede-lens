import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [panelSource, backgroundSource, panelMarkup, panelStyles, contentSource, uiStateSource] = await Promise.all([
  readFile(new URL("../src/sidepanel/panel.js", import.meta.url), "utf8"),
  readFile(new URL("../src/background.js", import.meta.url), "utf8"),
  readFile(new URL("../src/sidepanel/index.html", import.meta.url), "utf8"),
  readFile(new URL("../src/sidepanel/styles.css", import.meta.url), "utf8"),
  readFile(new URL("../src/content.js", import.meta.url), "utf8"),
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

test("selected-passage mode provides a preflight preview and actionable empty states", () => {
  assert.match(panelMarkup, />Entire article</);
  assert.match(panelMarkup, />Selected passage</);
  assert.match(panelMarkup, /role="radiogroup"/);
  assert.match(panelMarkup, /aria-checked="true"/);
  assert.match(panelMarkup, /Check selected text/);
  assert.match(panelSource, /Select a passage on the page/);
  assert.match(panelSource, /renderArticlePreview\(article\)/);
  assert.match(panelSource, /passagePreview\.textContent = preview\.excerpt/);
  assert.match(panelSource, /window\.addEventListener\("focus"/);
  assert.match(contentSource, /pageSelection\.isCollapsed/);
  assert.match(contentSource, /selected text is not accessible on this page/);
  assert.match(panelStyles, /-webkit-line-clamp: 2/);
  assert.doesNotMatch(panelSource, /passagePreview\.innerHTML/);
});

test("partial extraction and privacy copy are visible before a paid request", () => {
  assert.match(panelMarkup, /Partial article detected/);
  assert.match(panelMarkup, /Use selected passage instead/);
  assert.match(panelMarkup, /article text, title, byline, and publication date/);
  assert.match(panelMarkup, /Read the privacy policy/);
  assert.match(uiStateSource, /Analyze detected text/);
  assert.match(uiStateSource, /This saved report was restored locally\. Nothing was sent to OpenAI\./);
  assert.match(panelMarkup, /Internal structure only—not fact-checking\./);
  assert.doesNotMatch(panelMarkup, /extracted article text and metadata/);
});

test("interactive controls expose keyboard, status, and reduced-motion semantics", () => {
  assert.match(panelMarkup, /aria-controls="settings" aria-expanded="false"/);
  assert.match(panelMarkup, /progress-elapsed" aria-hidden="true"/);
  assert.match(panelMarkup, /progress-announcement".*role="status"/);
  assert.match(panelSource, /candidate\.setAttribute\("aria-checked"/);
  assert.match(panelSource, /"ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"/);
  assert.match(panelSource, /setAttribute\("aria-expanded", String\(willOpen\)\)/);
  assert.match(panelSource, /setAttribute\("role", isError \? "alert" : "status"\)/);
  assert.match(panelSource, /Highlight source paragraph/);
  assert.match(panelSource, /Highlighted source paragraph/);
  assert.match(panelStyles, /prefers-reduced-motion: reduce/);
  assert.match(contentSource, /prefers-reduced-motion: reduce/);
  assert.match(panelStyles, /\.rating-help-button \{[\s\S]*?width: 32px;[\s\S]*?height: 32px;/);
  assert.match(panelStyles, /\.paragraph-link \{[\s\S]*?min-height: 32px;/);
});
