import assert from "node:assert/strict";
import test from "node:test";

import {
  ERROR_CATEGORIES,
  analysisError,
  classifyAnalysisError,
  completedDuration,
  errorPresentation,
  isAbortError,
  progressEventKey,
  technicalDetailRows,
} from "../src/lib/analysis-flow.js";

test("classifies every expected failure and gives it a primary recovery action", () => {
  const cases = [
    [analysisError(ERROR_CATEGORIES.INVALID_KEY, "Rejected"), "invalid_key", "Update API key"],
    [new Error("Billing credits are unavailable"), "billing", "Open settings"],
    [new Error("Too many requests: rate limit"), "rate_limit", "Try again"],
    [new TypeError("Failed to fetch because the network is offline"), "network", "Try again"],
    [new Error("No article text was extracted"), "extraction", "Use selected passage"],
    [new Error("The model response failed local validation"), "invalid_output", "Try again"],
    [new Error("An unexpected condition occurred"), "unknown", "Try again"],
  ];

  for (const [error, category, actionLabel] of cases) {
    assert.equal(classifyAnalysisError(error), category);
    const presentation = errorPresentation(error);
    assert.equal(presentation.category, category);
    assert.equal(presentation.action.label, actionLabel);
    assert.ok(presentation.title);
    assert.ok(presentation.description);
  }
});

test("presents cancellation reasons separately from network failures", () => {
  for (const [reason, expected] of [
    ["page_changed", "changed pages"],
    ["mode_changed", "analysis source"],
    ["superseded", "newer analysis"],
    ["user_cancelled", "You cancelled"],
  ]) {
    const error = analysisError(
      ERROR_CATEGORIES.CANCELLED,
      "Cancelled",
      { reason },
    );
    const presentation = errorPresentation(error);
    assert.equal(presentation.category, ERROR_CATEGORIES.CANCELLED);
    assert.match(presentation.description, new RegExp(expected, "i"));
  }

  assert.equal(classifyAnalysisError(new DOMException("Aborted", "AbortError")), "cancelled");
  assert.equal(isAbortError(new DOMException("Aborted", "AbortError")), true);
  assert.equal(isAbortError(new Error("Other"), AbortSignal.abort()), true);
  assert.equal(isAbortError(new Error("Other")), false);
});

test("keeps support diagnostics available as structured technical rows", () => {
  const error = analysisError(ERROR_CATEGORIES.RATE_LIMIT, "Raw diagnostic", {
    requestId: "req_123",
    status: 429,
  });
  const rows = technicalDetailRows({
    error,
    model: "gpt-5",
    diagnostics: {
      timeToFirstOutputMs: 1250,
      totalMs: 3450,
      usage: { output_tokens_details: { reasoning_tokens: 42 } },
    },
  });
  assert.deepEqual(rows, [
    ["Request ID", "req_123"],
    ["HTTP status", "429"],
    ["Model", "gpt-5"],
    ["Schema", "0.2.0"],
    ["Time to first output", "1.3 seconds"],
    ["Total request time", "3.5 seconds"],
    ["Reasoning tokens", "42"],
    ["Diagnostic", "Raw diagnostic"],
  ]);
  assert.deepEqual(technicalDetailRows({ requestId: "req_override" }).slice(0, 2), [
    ["Request ID", "req_override"],
    ["Schema", "0.2.0"],
  ]);
});

test("shows a simple completion duration and de-duplicates progress event phases", () => {
  assert.equal(completedDuration({ totalMs: 2345 }), "Analysis completed in 2.3 seconds.");
  assert.equal(completedDuration(), "Analysis completed.");
  assert.equal(progressEventKey({ type: "response_started" }), "response_started");
  assert.equal(progressEventKey({ type: "first_output" }), "first_output");
  assert.equal(
    progressEventKey({ type: "stream_event", eventType: "response.output_text.delta" }),
    "output_delta",
  );
  assert.equal(progressEventKey({ type: "validating" }), "validating");
  assert.equal(progressEventKey({ type: "stream_event", eventType: "response.created" }), null);
  assert.equal(progressEventKey(), null);
});
