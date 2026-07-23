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
  changed.article_metrics.evidence_coverage.paragraph_ids = ["p999"];
  const result = validateAnalysisResult(changed, schema, paragraphIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Unknown paragraph reference: p999/);
});

test("rejects unknown issue paragraph references", () => {
  const changed = structuredClone(fixture);
  changed.issues[0].paragraph_ids = ["p999"];
  const result = validateAnalysisResult(changed, schema, paragraphIds);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Unknown paragraph reference: p999/);
});

test("validates primitive, nullable, numeric, and object types", () => {
  const typedSchema = {
    type: "object",
    additionalProperties: false,
    required: ["integer", "number", "nullable", "flag"],
    properties: {
      integer: { type: "integer" },
      number: { type: "number" },
      nullable: { type: ["string", "null"] },
      flag: { type: "boolean" },
    },
  };
  assert.equal(validateJsonSchema({
    integer: 2,
    number: 2.5,
    nullable: null,
    flag: true,
  }, typedSchema).valid, true);
  assert.equal(validateJsonSchema({
    integer: 2.5,
    number: Number.NaN,
    nullable: 4,
    flag: "yes",
  }, typedSchema).errors.length, 4);
});

test("validates constants, string constraints, arrays, and required fields", () => {
  const constrainedSchema = {
    type: "object",
    additionalProperties: false,
    required: ["version", "codes", "name"],
    properties: {
      version: { type: "string", const: "1" },
      name: { type: "string", minLength: 3, pattern: "^[A-Z]" },
      codes: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: { type: "string", pattern: "^p[0-9]+$" },
      },
    },
  };
  const result = validateJsonSchema({ version: "2", name: "ab", codes: ["wrong"] }, constrainedSchema);
  const errors = result.errors.join("\n");
  assert.match(errors, /must equal/);
  assert.match(errors, /shorter/);
  assert.match(errors, /does not match/);
  assert.match(errors, /at least 2/);

  const tooMany = validateJsonSchema({
    version: "1",
    name: "Abc",
    codes: ["p1", "p2", "p3", "p4"],
  }, constrainedSchema);
  assert.match(tooMany.errors.join("\n"), /no more than 3/);
});

test("reports unsupported and unresolved schema references", () => {
  assert.throws(
    () => validateJsonSchema("value", { $ref: "https://example.com/schema" }),
    /Unsupported schema reference/,
  );
  const result = validateJsonSchema("value", { $ref: "#/$defs/missing", $defs: {} });
  assert.match(result.errors.join("\n"), /unresolved schema reference/);
});

test("reports missing fields", () => {
  const missing = validateJsonSchema({}, {
    type: "object",
    required: ["name"],
    properties: { name: { type: "string" } },
  });
  assert.match(missing.errors.join("\n"), /missing required field name/);
});

test("covers permissive containers and invalid analysis short-circuiting", () => {
  assert.equal(validateJsonSchema([], { type: "array" }).valid, true);
  assert.equal(validateJsonSchema({ extra: true }, { type: "object" }).valid, true);
  assert.equal(validateJsonSchema(1, { const: 1 }).valid, true);

  const result = validateAnalysisResult({}, schema, []);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing required field/);
});
