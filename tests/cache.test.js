import assert from "node:assert/strict";
import test from "node:test";

import {
  ANALYSIS_SCHEMA_VERSION,
  findCachedAnalysis,
  fingerprintArticle,
  normalizeArticleUrl,
  upsertCachedAnalysis,
} from "../src/lib/cache.js";

test("normalizes article URLs without queries or fragments", () => {
  assert.equal(
    normalizeArticleUrl("https://example.com/story?edition=1#comments"),
    "https://example.com/story",
  );
  assert.equal(normalizeArticleUrl("not a url"), null);
});

test("fingerprints article content deterministically", () => {
  const article = {
    title: "Headline",
    paragraphs: [{ text: "First" }, { text: "Second" }],
  };
  assert.equal(fingerprintArticle(article), fingerprintArticle(structuredClone(article)));
  assert.notEqual(
    fingerprintArticle(article),
    fingerprintArticle({ ...article, paragraphs: [{ text: "Changed" }] }),
  );
  assert.equal(typeof fingerprintArticle(), "string");
});

test("finds only matching current-schema cache entries", () => {
  const entry = {
    url: "https://example.com/story",
    fingerprint: "10:abc",
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    result: { ok: true },
  };
  assert.equal(
    findCachedAnalysis([entry], "https://example.com/story#top", "10:abc"),
    entry,
  );
  assert.equal(findCachedAnalysis([entry], "https://example.com/other", "10:abc"), null);
  assert.equal(findCachedAnalysis([entry], "https://example.com/story", "different"), null);
  assert.equal(findCachedAnalysis([{ ...entry, schemaVersion: "0.1.0" }], entry.url, "10:abc"), null);
  assert.equal(findCachedAnalysis([], "bad url", "10:abc"), null);
  assert.equal(findCachedAnalysis([], entry.url, ""), null);
});

test("upserts, orders, replaces, and bounds cached analyses", () => {
  const first = upsertCachedAnalysis([], {
    url: "https://example.com/one#top",
    fingerprint: "one",
    result: { value: 1 },
    savedAt: 10,
  });
  const second = upsertCachedAnalysis(first, {
    url: "https://example.com/two",
    fingerprint: "two",
    result: { value: 2 },
    savedAt: 20,
  });
  assert.deepEqual(second.map((entry) => entry.fingerprint), ["two", "one"]);

  const replaced = upsertCachedAnalysis(second, {
    url: "https://example.com/two",
    fingerprint: "two",
    result: { value: 3 },
    savedAt: 30,
  });
  assert.equal(replaced.length, 2);
  assert.deepEqual(replaced[0].result, { value: 3 });

  const bounded = upsertCachedAnalysis(replaced, {
    url: "https://example.com/three",
    fingerprint: "three",
    result: { value: 4 },
    savedAt: 40,
  }, 2);
  assert.deepEqual(bounded.map((entry) => entry.fingerprint), ["three", "two"]);
});

test("rejects incomplete cache entries", () => {
  assert.throws(
    () => upsertCachedAnalysis([], { url: "bad", fingerprint: "x", result: {} }),
    /valid article URL/,
  );
  assert.throws(
    () => upsertCachedAnalysis([], { url: "https://example.com", fingerprint: "", result: {} }),
    /valid article URL/,
  );
  assert.throws(
    () => upsertCachedAnalysis([], { url: "https://example.com", fingerprint: "x" }),
    /valid article URL/,
  );
});
