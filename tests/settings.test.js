import test from "node:test";
import assert from "node:assert/strict";

import { validateModelSelection } from "../src/lib/settings.js";

test("accepts a model loaded by the exact API key being saved", () => {
  assert.doesNotThrow(() => validateModelSelection({
    model: "gpt-5.2",
    resolvedApiKey: "sk-project-a",
    listedApiKey: "sk-project-a",
    availableModels: ["gpt-5.2", "gpt-5.1"],
  }));
});

test("rejects reusing key A's model list while saving key B", () => {
  assert.throws(
    () => validateModelSelection({
      model: "gpt-5.2",
      resolvedApiKey: "sk-project-b",
      listedApiKey: "sk-project-a",
      availableModels: ["gpt-5.2"],
    }),
    /API key has not loaded the current model list.*Load models again/,
  );
});

test("rejects missing key provenance and models outside the loaded list", () => {
  assert.throws(
    () => validateModelSelection({
      model: "gpt-5.2",
      resolvedApiKey: "sk-project-a",
      availableModels: ["gpt-5.2"],
    }),
    /Load models again/,
  );
  assert.throws(
    () => validateModelSelection({
      model: "gpt-5.3",
      resolvedApiKey: "sk-project-a",
      listedApiKey: "sk-project-a",
      availableModels: ["gpt-5.2"],
    }),
    /choose a model returned for this OpenAI API key/,
  );
  assert.throws(
    () => validateModelSelection({
      model: "gpt-5.2",
      resolvedApiKey: "sk-project-a",
      listedApiKey: "sk-project-a",
    }),
    /choose a model returned for this OpenAI API key/,
  );
});
