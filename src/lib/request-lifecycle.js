export function createAnalysisOperation(revision) {
  return {
    controller: new AbortController(),
    revision,
  };
}

export function stopAnalysisOperation(operation, reason) {
  if (!operation || operation.controller.signal.aborted) return false;
  operation.controller.abort(reason);
  return true;
}

export function isCurrentAnalysisOperation(activeOperation, operation, revision) {
  return activeOperation === operation
    && operation?.revision === revision
    && !operation.controller.signal.aborted;
}
