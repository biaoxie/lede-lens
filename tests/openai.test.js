import test from "node:test";
import assert from "node:assert/strict";

import { readOutputText, withRequestReference } from "../src/lib/openai.js";

test("reads structured output text from a Responses API body", () => {
  const text = readOutputText({
    output: [{
      type: "message",
      content: [{ type: "output_text", text: "{\"ok\":true}" }],
    }],
  });
  assert.equal(text, "{\"ok\":true}");
});

test("surfaces a model refusal", () => {
  assert.throws(
    () => readOutputText({
      output: [{
        type: "message",
        content: [{ type: "refusal", refusal: "Cannot comply." }],
      }],
    }),
    /OpenAI declined the request/,
  );
});

test("adds a traceable request ID to an error", () => {
  assert.equal(
    withRequestReference("Network failed.", "request-123"),
    "Network failed. Request ID: request-123.",
  );
});
