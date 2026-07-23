import assert from "node:assert/strict";
import test from "node:test";

import {
  createAnalysisOperation,
  isCurrentAnalysisOperation,
  stopAnalysisOperation,
} from "../src/lib/request-lifecycle.js";

test("stops an active operation with a distinguishable cancellation reason", () => {
  const operation = createAnalysisOperation(4);
  assert.equal(stopAnalysisOperation(operation, "page_changed"), true);
  assert.equal(operation.controller.signal.aborted, true);
  assert.equal(operation.controller.signal.reason, "page_changed");
  assert.equal(stopAnalysisOperation(operation, "user_cancelled"), false);
});

test("prevents aborted, stale, and superseded operations from committing results", () => {
  const first = createAnalysisOperation(7);
  const second = createAnalysisOperation(7);

  assert.equal(isCurrentAnalysisOperation(first, first, 7), true);
  assert.equal(isCurrentAnalysisOperation(second, first, 7), false);
  assert.equal(isCurrentAnalysisOperation(first, first, 8), false);

  stopAnalysisOperation(first, "page_changed");
  assert.equal(isCurrentAnalysisOperation(first, first, 7), false);
});
