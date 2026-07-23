import test from "node:test";
import assert from "node:assert/strict";

import {
  EVIDENCE_RATINGS,
  METRIC_STATUS_LABELS,
  PRESENTATION_RATINGS,
  findMetricStatusLabel,
  findRating,
} from "../src/lib/ratings.js";

test("defines every evidence-structure rating in schema order", () => {
  assert.deepEqual(
    EVIDENCE_RATINGS.map((rating) => rating.value),
    ["structurally_solid", "mostly_supported", "evidence_limited", "severely_under_supported"],
  );
});

test("defines every presentation-style rating in schema order", () => {
  assert.deepEqual(
    PRESENTATION_RATINGS.map((rating) => rating.value),
    ["restrained", "interpretive", "framing_heavy", "manipulation_risk_signals"],
  );
});

test("findRating returns display metadata and rejects unknown values", () => {
  assert.equal(findRating(EVIDENCE_RATINGS, "mostly_supported").tone, "positive");
  assert.throws(() => findRating(EVIDENCE_RATINGS, "unknown"), /Unknown assessment rating/);
});

test("maps evidence values to editor-approved reader labels without changing schema values", () => {
  assert.deepEqual(
    EVIDENCE_RATINGS.map(({ value, label }) => [value, label]),
    [
      ["structurally_solid", "Well supported"],
      ["mostly_supported", "Mostly supported"],
      ["evidence_limited", "Limited support"],
      ["severely_under_supported", "Very little support"],
    ],
  );
});

test("maps every metric status to question-specific reader language", () => {
  for (const labels of Object.values(METRIC_STATUS_LABELS)) {
    assert.deepEqual(Object.keys(labels), ["present", "partial", "missing", "not_applicable"]);
  }
  assert.equal(findMetricStatusLabel("causal_support", "present"), "Supported");
  assert.equal(
    findMetricStatusLabel("causal_support", "not_applicable"),
    "No cause-and-effect claim",
  );
  assert.throws(
    () => findMetricStatusLabel("causal_support", "unknown"),
    /Unknown metric status/,
  );
});
