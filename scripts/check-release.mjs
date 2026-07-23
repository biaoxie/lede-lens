import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const archivePath = `dist/lede-lens-${manifest.version}.zip`;
const archive = await readFile(archivePath);
const listing = spawnSync("unzip", ["-Z1", archivePath], { encoding: "utf8" });

assert.equal(listing.status, 0, listing.stderr || "Unable to inspect release ZIP.");

const files = listing.stdout
  .split("\n")
  .map((file) => file.trim())
  .filter((file) => file && !file.endsWith("/"));

const requiredFiles = [
  "INSTALL.md",
  "manifest.json",
  ...Object.values(manifest.icons),
  "src/background.js",
  "src/content.js",
  "src/sidepanel/index.html",
  "src/sidepanel/panel.js",
  "src/sidepanel/styles.css",
  "src/vendor/mozilla-readability/Readability.js",
  "src/vendor/mozilla-readability/LICENSE.md",
  "src/vendor/mozilla-readability/UPSTREAM.md",
  "skills/analyze-news-structure/assets/system-prompt.md",
  "skills/analyze-news-structure/assets/output-schema.json",
];

for (const file of requiredFiles) {
  assert.ok(files.includes(file), `Release ZIP is missing ${file}.`);
}

for (const file of files) {
  assert.ok(
    file === "manifest.json"
      || file === "INSTALL.md"
      || file.startsWith("assets/icons/")
      || file.startsWith("src/")
      || file === "skills/analyze-news-structure/assets/system-prompt.md"
      || file === "skills/analyze-news-structure/assets/output-schema.json",
    `Unexpected release file: ${file}`,
  );
  assert.ok(!file.includes("node_modules/"), "Release ZIP must not contain node_modules.");
  assert.ok(!file.startsWith("tests/"), "Release ZIP must not contain tests.");
}

const digest = createHash("sha256").update(archive).digest("hex");
console.log(`Release ZIP checks passed: ${archivePath}`);
console.log(`SHA-256: ${digest}`);
