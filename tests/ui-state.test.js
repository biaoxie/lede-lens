import test from "node:test";
import assert from "node:assert/strict";

import {
  cacheDeletionPrompt,
  getConnectionState,
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
