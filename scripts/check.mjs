import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const requiredFiles = [
  "README.md",
  "quick-start.md",
  "LICENSE",
  "manifest.json",
  "src/background.js",
  "src/content.js",
  "node_modules/@mozilla/readability/Readability.js",
  "src/sidepanel/index.html",
  "src/sidepanel/panel.js",
  "src/sidepanel/styles.css",
  "skills/analyze-news-structure/assets/system-prompt.md",
  "skills/analyze-news-structure/assets/output-schema.json",
];

await Promise.all(requiredFiles.map((file) => access(file)));

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const packageMetadata = JSON.parse(await readFile("package.json", "utf8"));
const backgroundSource = await readFile("src/background.js", "utf8");
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.name, "LedeLens");
assert.equal(manifest.version, packageMetadata.version, "Manifest and package versions must match.");
assert.deepEqual(manifest.host_permissions, ["https://api.openai.com/*"]);
assert.ok(manifest.permissions.includes("storage"));
assert.ok(!manifest.permissions.includes("tabs"), "Avoid broad tabs permission.");
assert.match(backgroundSource, /chrome\.action\.onClicked\.addListener/);
assert.match(backgroundSource, /openPanelOnActionClick: false/);

const contentSource = await readFile("src/content.js", "utf8");
assert.match(contentSource, /new globalThis\.Readability\(document\.cloneNode\(true\)/);
assert.doesNotMatch(contentSource, /chinanews|cnn|cctv/i, "Article extraction must not contain site-specific rules.");

const schema = JSON.parse(
  await readFile("skills/analyze-news-structure/assets/output-schema.json", "utf8"),
);
assert.equal(schema.properties.schema_version.const, "0.1.0");
assert.equal(schema.additionalProperties, false);

const sourceFiles = [
  "src/background.js",
  "src/content.js",
  "src/lib/models.js",
  "src/lib/validator.js",
  "src/sidepanel/panel.js",
  "scripts/check.mjs",
  "tests/validator.test.js",
];

for (const file of sourceFiles) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  assert.equal(check.status, 0, `${file}: ${check.stderr}`);
}

console.log("Static checks passed.");
