import test from "node:test";
import assert from "node:assert/strict";

import { EVIDENCE_RATINGS, PRESENTATION_RATINGS, findRating } from "../src/lib/ratings.js";

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
