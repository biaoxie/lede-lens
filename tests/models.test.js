import assert from "node:assert/strict";
import test from "node:test";

import { ALLOWED_MODELS, DEFAULT_MODEL, MODEL_CATALOG } from "../src/lib/models.js";

test("model catalog includes GPT-5.4", () => {
  assert.ok(ALLOWED_MODELS.has("gpt-5.4"));
  assert.ok(MODEL_CATALOG.some((model) => model.id === "gpt-5.4"));
});

test("default model is included in the catalog", () => {
  assert.ok(ALLOWED_MODELS.has(DEFAULT_MODEL));
});
