import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "README.md",
  "quick-start.md",
  "LICENSE",
  "PRIVACY.md",
  "manifest.json",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-48.png",
  "assets/icons/icon-128.png",
  "design/README.md",
  "design/brand/open-frame.svg",
  "design/brand/open-frame-16.svg",
  "docs/assets/analysis-flow.webp",
  "docs/assets/lede-lens-hero.webp",
  "docs/assets/source-traceability.webp",
  "src/background.js",
  "src/content.js",
  "src/lib/cache.js",
  "src/lib/openai.js",
  "src/lib/ratings.js",
  "src/vendor/mozilla-readability/Readability.js",
  "src/vendor/mozilla-readability/LICENSE.md",
  "src/vendor/mozilla-readability/UPSTREAM.md",
  "src/sidepanel/index.html",
  "src/sidepanel/panel.js",
  "src/sidepanel/styles.css",
  "skills/analyze-news-structure/assets/system-prompt.md",
  "skills/analyze-news-structure/assets/output-schema.json",
  "tests/fixtures/analysis-result-0.2.0.json",
];

await Promise.all(requiredFiles.map((file) => access(file)));

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const packageMetadata = JSON.parse(await readFile("package.json", "utf8"));
const backgroundSource = await readFile("src/background.js", "utf8");
const openaiSource = await readFile("src/lib/openai.js", "utf8");
const panelSource = await readFile("src/sidepanel/panel.js", "utf8");
const systemPrompt = await readFile("skills/analyze-news-structure/assets/system-prompt.md", "utf8");
assert.equal(
  await readFile("src/vendor/mozilla-readability/Readability.js", "utf8"),
  await readFile("node_modules/@mozilla/readability/Readability.js", "utf8"),
  "Vendored Readability.js must match the installed upstream dependency.",
);
assert.equal(
  await readFile("src/vendor/mozilla-readability/LICENSE.md", "utf8"),
  await readFile("node_modules/@mozilla/readability/LICENSE.md", "utf8"),
  "The vendored Readability license must match the upstream dependency.",
);
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, "LedeLens");
assert.equal(manifest.version, packageMetadata.version, "Manifest and package versions must match.");
assert.deepEqual(manifest.host_permissions, ["https://api.openai.com/*"]);
assert.ok(manifest.permissions.includes("storage"));
assert.ok(!manifest.permissions.includes("tabs"), "Avoid broad tabs permission.");
assert.match(backgroundSource, /chrome\.action\.onClicked\.addListener/);
assert.match(backgroundSource, /openPanelOnActionClick: false/);
assert.match(backgroundSource, /PAGE_ACCESS_GRANTED/);
assert.match(backgroundSource, /GET_CACHED_ANALYSIS/);
assert.match(backgroundSource, /SAVE_CACHED_ANALYSIS/);
assert.match(backgroundSource, /CLEAR_ANALYSIS_CACHE/);
assert.doesNotMatch(backgroundSource, /api\.openai\.com/, "Long OpenAI requests must not run in the service worker.");
assert.match(openaiSource, /X-Client-Request-Id/);
assert.match(openaiSource, /stream: true/);
assert.match(openaiSource, /response\.output_text\.delta/);
assert.doesNotMatch(openaiSource, /\breasoning\s*:/, "Do not override the selected model's reasoning effort.");
assert.match(openaiSource, /verbosity: "low"/);
assert.match(panelSource, /Allow LedeLens to read this tab/);
assert.match(panelSource, /You don’t need to reload the page/);
assert.match(panelSource, /Select toolbar icon first/);
assert.doesNotMatch(panelSource, /Refresh access for this page|refresh page access|Refreshing this page/);
assert.doesNotMatch(systemPrompt, /^# Calibration$/m);
assert.match(systemPrompt, /Lack of outside corroboration is not automatically an internal structural defect/);
assert.match(systemPrompt, /Use `not_applicable` for `causal_support` when the article makes no material causal inference/);
assert.match(systemPrompt, /Attributed opinion alone does not establish its underlying causal, predictive, evaluative, or normative inference/);
assert.match(systemPrompt, /Do not derive the verdict by counting metric statuses or issue severities/);
assert.match(systemPrompt, /Distinguish reporting that a source offered an explanation from the article endorsing that explanation/);
assert.match(systemPrompt, /Surface no more than three distinct issues/);
assert.match(systemPrompt, /Do not require every element in every news report/);
assert.match(systemPrompt, /Do not penalize an article for omitting merely desirable background/);
assert.match(systemPrompt, /Use plain language for ordinary readers/);
assert.match(systemPrompt, /A proposition can remain central when presented through attributed experts or commentators/);
assert.match(systemPrompt, /If the bounded conclusion must materially retreat from a prominent causal, predictive, evaluative, or normative takeaway, `evidence_limited` will usually fit better/);
assert.match(systemPrompt, /Judge presentation style by the cumulative effect of headline language, word choice, source selection, repetition, placement, attribution, and treatment of uncertainty/);
assert.match(systemPrompt, /Preserve attribution: “sources argue X” must not become “X.”/);
assert.match(systemPrompt, /Do not mix English analytical terminology into prose when a clear expression exists in the requested language/);

const contentSource = await readFile("src/content.js", "utf8");
assert.match(contentSource, /new globalThis\.Readability\(document\.cloneNode\(true\)/);
assert.doesNotMatch(contentSource, /chinanews|cnn|cctv/i, "Article extraction must not contain site-specific rules.");

const schema = JSON.parse(
  await readFile("skills/analyze-news-structure/assets/output-schema.json", "utf8"),
);
const analysisFixture = JSON.parse(
  await readFile("tests/fixtures/analysis-result-0.2.0.json", "utf8"),
);
assert.equal(schema.properties.schema_version.const, "0.2.0");
assert.equal(
  analysisFixture.schema_version,
  schema.properties.schema_version.const,
  "The valid analysis fixture must match the canonical schema version.",
);
assert.equal(schema.additionalProperties, false);
assert.equal(Object.hasOwn(schema.properties, "claims"), false);
assert.equal(Object.hasOwn(schema.properties, "relationships"), false);
assert.equal(schema.properties.issues.maxItems, 3);

const testFiles = (await readdir("tests"))
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => `tests/${name}`)
  .sort();

const sourceFiles = [
  "src/background.js",
  "src/content.js",
  "src/lib/cache.js",
  "src/lib/models.js",
  "src/lib/openai.js",
  "src/lib/ratings.js",
  "src/lib/validator.js",
  "src/sidepanel/panel.js",
  "scripts/check.mjs",
  "scripts/check-release.mjs",
  "scripts/check-store-assets.mjs",
  "scripts/package-extension.mjs",
  ...testFiles,
];

for (const file of sourceFiles) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(check.status, 0, `${file}: ${check.stderr}`);
}

console.log("Static checks passed.");
