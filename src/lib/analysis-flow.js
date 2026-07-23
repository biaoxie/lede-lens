export const ERROR_CATEGORIES = Object.freeze({
  BILLING: "billing",
  CANCELLED: "cancelled",
  EXTRACTION: "extraction",
  INVALID_KEY: "invalid_key",
  INVALID_OUTPUT: "invalid_output",
  NETWORK: "network",
  RATE_LIMIT: "rate_limit",
  UNKNOWN: "unknown",
});

export class AnalysisFlowError extends Error {
  constructor(category, message, details = {}, options = {}) {
    super(message, options);
    this.name = "AnalysisFlowError";
    this.category = category;
    this.details = details;
  }
}

export function analysisError(category, message, details = {}, cause) {
  return new AnalysisFlowError(category, message, details, cause ? { cause } : {});
}

export function isAbortError(error, signal) {
  return Boolean(
    signal?.aborted
    || error?.name === "AbortError"
    || error?.category === ERROR_CATEGORIES.CANCELLED,
  );
}

export function classifyAnalysisError(error) {
  if (error?.category && Object.values(ERROR_CATEGORIES).includes(error.category)) {
    return error.category;
  }

  const message = String(error?.message || "");
  if (/abort|cancel/i.test(message)) return ERROR_CATEGORIES.CANCELLED;
  if (/api key|authentication|unauthorized|incorrect.*key|invalid.*key/i.test(message)) {
    return ERROR_CATEGORIES.INVALID_KEY;
  }
  if (/billing|credit|quota|payment|required/i.test(message)) return ERROR_CATEGORIES.BILLING;
  if (/rate.?limit|too many requests/i.test(message)) return ERROR_CATEGORIES.RATE_LIMIT;
  if (/network|failed to fetch|connection|offline/i.test(message)) return ERROR_CATEGORIES.NETWORK;
  if (/extract|article text|paragraph|parser|selected passage|selection mode/i.test(message)) {
    return ERROR_CATEGORIES.EXTRACTION;
  }
  if (/malformed json|structured analysis|local validation|model response|response stream/i.test(message)) {
    return ERROR_CATEGORIES.INVALID_OUTPUT;
  }
  return ERROR_CATEGORIES.UNKNOWN;
}

const PRESENTATIONS = Object.freeze({
  [ERROR_CATEGORIES.INVALID_KEY]: {
    title: "API key needs attention",
    description: "OpenAI did not accept this API key. Update it, then choose an available model again.",
    action: { type: "settings", label: "Update API key" },
  },
  [ERROR_CATEGORIES.BILLING]: {
    title: "OpenAI billing needs attention",
    description: "This OpenAI project may need credits or an updated billing setup before analysis can continue.",
    action: { type: "settings", label: "Open settings" },
  },
  [ERROR_CATEGORIES.RATE_LIMIT]: {
    title: "OpenAI is receiving too many requests",
    description: "Wait a moment, then run the analysis again.",
    action: { type: "retry", label: "Try again" },
  },
  [ERROR_CATEGORIES.NETWORK]: {
    title: "Connection interrupted",
    description: "LedeLens lost its connection to OpenAI before the report finished.",
    action: { type: "retry", label: "Try again" },
  },
  [ERROR_CATEGORIES.EXTRACTION]: {
    title: "LedeLens couldn’t read this page",
    description: "Select the passage you want to inspect, then analyze only that selection.",
    action: { type: "selection", label: "Use selected passage" },
  },
  [ERROR_CATEGORIES.INVALID_OUTPUT]: {
    title: "The report couldn’t be checked",
    description: "OpenAI’s response was incomplete or did not match the report format. No result was saved.",
    action: { type: "retry", label: "Try again" },
  },
  [ERROR_CATEGORIES.CANCELLED]: {
    title: "Analysis stopped",
    description: "No report was saved.",
    action: { type: "retry", label: "Try again" },
  },
  [ERROR_CATEGORIES.UNKNOWN]: {
    title: "Analysis couldn’t finish",
    description: "LedeLens did not save a report. You can safely try the analysis again.",
    action: { type: "retry", label: "Try again" },
  },
});

export function errorPresentation(error) {
  const category = classifyAnalysisError(error);
  const presentation = PRESENTATIONS[category];
  const reason = error?.details?.reason;
  let description = presentation.description;
  if (category === ERROR_CATEGORIES.CANCELLED) {
    if (reason === "page_changed") {
      description = "Analysis stopped because you changed pages.";
    } else if (reason === "mode_changed") {
      description = "Analysis stopped because you changed the analysis source.";
    } else if (reason === "superseded") {
      description = "Analysis stopped because a newer analysis started.";
    } else {
      description = "You cancelled the analysis. No report was saved.";
    }
  }
  return { category, ...presentation, description };
}

export function technicalDetailRows({
  error,
  model,
  requestId,
  diagnostics,
  schemaVersion = "0.2.0",
} = {}) {
  const rows = [];
  const resolvedRequestId = requestId || error?.details?.requestId;
  const status = error?.details?.status;
  const firstOutputMs = diagnostics?.timeToFirstOutputMs;
  const totalMs = diagnostics?.totalMs;
  const reasoningTokens = diagnostics?.usage?.output_tokens_details?.reasoning_tokens;

  if (resolvedRequestId) rows.push(["Request ID", resolvedRequestId]);
  if (Number.isFinite(status)) rows.push(["HTTP status", String(status)]);
  if (model) rows.push(["Model", model]);
  rows.push(["Schema", schemaVersion]);
  if (Number.isFinite(firstOutputMs)) rows.push(["Time to first output", `${(firstOutputMs / 1000).toFixed(1)} seconds`]);
  if (Number.isFinite(totalMs)) rows.push(["Total request time", `${(totalMs / 1000).toFixed(1)} seconds`]);
  if (Number.isFinite(reasoningTokens)) rows.push(["Reasoning tokens", String(reasoningTokens)]);
  if (error?.message) rows.push(["Diagnostic", error.message]);
  return rows;
}

export function completedDuration(diagnostics) {
  return Number.isFinite(diagnostics?.totalMs)
    ? `Analysis completed in ${(diagnostics.totalMs / 1000).toFixed(1)} seconds.`
    : "Analysis completed.";
}

export function progressEventKey({ type, eventType } = {}) {
  if (type === "response_started") return "response_started";
  if (type === "first_output") return "first_output";
  if (type === "stream_event" && eventType === "response.output_text.delta") return "output_delta";
  if (type === "validating") return "validating";
  return null;
}
