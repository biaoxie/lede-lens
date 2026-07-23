import test from "node:test";
import assert from "node:assert/strict";

import {
  cacheDeletionPrompt,
  getArticlePreview,
  getConnectionState,
  getExtractionNotice,
  getPrivacyDisclosure,
  getReportProvenance,
  savedReportCountLabel,
} from "../src/lib/ui-state.js";

test("connection states stay consistent with analysis availability", () => {
  assert.deepEqual(getConnectionState(), {
    value: "disconnected",
    label: "Not connected",
    tone: "disconnected",
    canAnalyze: false,
  });
  assert.deepEqual(getConnectionState({ hasApiKey: true }), {
    value: "needs_model",
    label: "Key added · choose a model",
    tone: "pending",
    canAnalyze: false,
  });
  assert.deepEqual(getConnectionState({ hasApiKey: true, model: "gpt-5.2" }), {
    value: "connected",
    label: "Connected · gpt-5.2",
    tone: "ready",
    canAnalyze: true,
  });
  assert.equal(getConnectionState({ model: "gpt-5.2" }).canAnalyze, false);
});

test("article and selected-passage previews expose accurate, plain-text counts", () => {
  const article = {
    title: "A <b>literal</b> headline",
    byline: "Reporter",
    paragraphs: [
      { id: "p1", text: " First   paragraph. " },
      { id: "p2", text: "Second paragraph." },
    ],
  };
  assert.deepEqual(getArticlePreview(article, "article"), {
    eyebrow: "Detected article",
    title: "A <b>literal</b> headline",
    excerpt: "",
    meta: "Reporter · 2 paragraphs",
  });
  assert.deepEqual(getArticlePreview(article, "selection"), {
    eyebrow: "Selected passage",
    title: "A <b>literal</b> headline",
    excerpt: "First paragraph. Second paragraph.",
    meta: "34 characters · 2 paragraphs",
  });
});

test("preview defaults and singular labels remain readable for sparse captures", () => {
  assert.deepEqual(getArticlePreview(null), {
    eyebrow: "Detected article",
    title: "Untitled article",
    excerpt: "",
    meta: "0 paragraphs",
  });
  assert.deepEqual(getArticlePreview({
    paragraphs: [{ id: "p1", text: "X" }],
  }, "selection"), {
    eyebrow: "Selected passage",
    title: "Selected passage",
    excerpt: "X",
    meta: "1 character · 1 paragraph",
  });
  assert.equal(
    getArticlePreview({ title: "", paragraphs: [{ id: "p1" }] }, "selection").excerpt,
    "",
  );
});

test("partial extraction warning applies to entire-article mode only", () => {
  const partial = {
    extraction: {
      status: "partial",
      notes: ["Reader-mode extraction used a fallback.", "", null],
    },
  };
  assert.deepEqual(getExtractionNotice(partial, "article"), {
    visible: true,
    limitations: ["Reader-mode extraction used a fallback."],
    actionLabel: "Analyze detected text",
  });
  assert.deepEqual(getExtractionNotice(partial, "selection"), {
    visible: false,
    limitations: [],
    actionLabel: null,
  });
  assert.equal(getExtractionNotice({ extraction: { status: "complete", notes: [] } }).visible, false);
  assert.deepEqual(getExtractionNotice({ extraction: { status: "partial" } }), {
    visible: false,
    limitations: [],
    actionLabel: null,
  });
});

test("privacy disclosure distinguishes a local restore from a new request", () => {
  assert.match(getPrivacyDisclosure(), /article text, title, byline, and publication date/);
  assert.match(getPrivacyDisclosure(), /page address stays on this device/);
  assert.equal(
    getPrivacyDisclosure({ source: "restored" }),
    "This saved report was restored locally. Nothing was sent to OpenAI.",
  );
});

test("fresh, restored, cleared, and save-failure provenance is explicit", () => {
  assert.deepEqual(getReportProvenance({
    source: "fresh",
    savedAt: 123,
    persisted: true,
  }), {
    tone: "fresh",
    title: "New report",
    savedAt: 123,
    description: "Analysis requested from OpenAI and saved on this device.",
  });
  assert.deepEqual(getReportProvenance({
    source: "restored",
    savedAt: 456,
    persisted: true,
  }), {
    tone: "restored",
    title: "Saved report",
    savedAt: 456,
    description: "Restored locally—no OpenAI request was made.",
  });
  assert.match(getReportProvenance({ source: "restored" }).description, /deleted/);
  assert.match(getReportProvenance({ source: "fresh" }).description, /could not save/);
});

test("saved-report count and irreversible deletion copy are accurate", () => {
  assert.equal(savedReportCountLabel(0), "0 saved reports on this device");
  assert.equal(savedReportCountLabel(1), "1 saved report on this device");
  assert.equal(savedReportCountLabel(3), "3 saved reports on this device");
  assert.equal(savedReportCountLabel(-1), "0 saved reports on this device");
  assert.equal(savedReportCountLabel(1.5), "0 saved reports on this device");
  assert.equal(cacheDeletionPrompt(1), "Delete 1 saved report from this Chrome profile? This cannot be undone.");
  assert.equal(cacheDeletionPrompt(3), "Delete 3 saved reports from this Chrome profile? This cannot be undone.");
  assert.match(cacheDeletionPrompt(0), /no saved reports/);
  assert.match(cacheDeletionPrompt(Number.NaN), /no saved reports/);
});
