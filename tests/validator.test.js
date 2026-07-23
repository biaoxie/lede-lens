import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateAnalysisResult, validateJsonSchema } from "../src/lib/validator.js";

const schema = JSON.parse(
  await readFile(new URL("../skills/analyze-news-structure/assets/output-schema.json", import.meta.url), "utf8"),
);
const fixture = JSON.parse(await readFile(new URL("../test.json", import.meta.url), "utf8"));
const paragraphIds = Array.from({ length: 33 }, (_, index) => `p${index + 1}`);

test("accepts the canonical example", () => {
  const result = validateAnalysisResult(fixture, schema, paragraphIds);
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects undeclared output fields", () => {
  const changed = structuredClone(fixture);
  changed.score = 91;
  const result = validateJsonSchema(changed, schema);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /undeclared field score/);
});

test("rejects an invalid metric status", () => {
  const changed = structuredClone(fixture);
  changed.article_metrics.causal_support.status = "strong";
  const result = validateJsonSchema(changed, schema);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must be one of/);
});

test("rejects unknown paragraph references", () => {
  const changed = structuredClone(fixture);
  changed.claims[0].paragraph_ids = ["p999"];
  const result = validateAnalysisResult(changed, schema, paragraphIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Unknown paragraph reference: p999/);
});

test("rejects relationships that reference unknown claims", () => {
  const changed = structuredClone(fixture);
  changed.relationships[0].to_claim_id = "c999";
  const result = validateAnalysisResult(changed, schema, paragraphIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Unknown relationship target: c999/);
});
