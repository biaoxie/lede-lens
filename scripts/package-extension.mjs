import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, utimes } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
const releaseName = `lede-lens-${manifest.version}.zip`;
const outputDirectory = join(root, "dist");
const outputPath = join(outputDirectory, releaseName);
const stagingRoot = await mkdtemp(join(tmpdir(), "ledelens-release-"));
const stagingDirectory = join(stagingRoot, "extension");

const releaseFiles = [
  "manifest.json",
  "assets/icons/icon-16.png",
  "assets/icons/icon-32.png",
  "assets/icons/icon-48.png",
  "assets/icons/icon-128.png",
  "src",
  "skills/analyze-news-structure/assets/system-prompt.md",
  "skills/analyze-news-structure/assets/output-schema.json",
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(path));
    } else {
      files.push(relative(stagingDirectory, path));
    }
  }

  return files;
}

try {
  await mkdir(stagingDirectory, { recursive: true });

  for (const relativePath of releaseFiles) {
    const source = join(root, relativePath);
    const destination = join(stagingDirectory, relativePath);
    await mkdir(join(destination, ".."), { recursive: true });
    await cp(source, destination, { recursive: true });
  }

  const stagedFiles = await listFiles(stagingDirectory);
  const fixedTimestamp = new Date("2026-01-01T00:00:00.000Z");
  await Promise.all(
    stagedFiles.map((file) => utimes(join(stagingDirectory, file), fixedTimestamp, fixedTimestamp)),
  );

  await mkdir(outputDirectory, { recursive: true });
  await rm(outputPath, { force: true });

  const result = spawnSync(
    "zip",
    ["-X", "-q", outputPath, ...stagedFiles],
    { cwd: stagingDirectory, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || "Unable to create release ZIP.");

  console.log(`Created ${basename(outputPath)}`);
} finally {
  await rm(stagingRoot, { recursive: true, force: true });
}
