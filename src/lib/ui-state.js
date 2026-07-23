export const CONNECTION_STATES = Object.freeze({
  disconnected: Object.freeze({
    value: "disconnected",
    label: "Not connected",
    tone: "disconnected",
    canAnalyze: false,
  }),
  needsModel: Object.freeze({
    value: "needs_model",
    label: "Key added · choose a model",
    tone: "pending",
    canAnalyze: false,
  }),
});

export function getConnectionState({ hasApiKey = false, model = null } = {}) {
  if (!hasApiKey) return CONNECTION_STATES.disconnected;
  if (!model) return CONNECTION_STATES.needsModel;
  return {
    value: "connected",
    label: `Connected · ${model}`,
    tone: "ready",
    canAnalyze: true,
  };
}

export function getReportProvenance({
  source = "fresh",
  savedAt = null,
  persisted = false,
} = {}) {
  if (!persisted) {
    return {
      tone: "unsaved",
      title: "Unsaved report",
      description: source === "fresh"
        ? "The analysis is readable, but Chrome could not save it on this device."
        : "This restored report is still readable, but its saved copy was deleted from this device.",
    };
  }

  if (source === "restored") {
    return {
      tone: "restored",
      title: "Saved report",
      savedAt,
      description: "Restored locally—no OpenAI request was made.",
    };
  }

  return {
    tone: "fresh",
    title: "New report",
    savedAt,
    description: "Analysis requested from OpenAI and saved on this device.",
  };
}

export function savedReportCountLabel(count) {
  const normalizedCount = Number.isInteger(count) && count > 0 ? count : 0;
  return `${normalizedCount} saved report${normalizedCount === 1 ? "" : "s"} on this device`;
}

export function cacheDeletionPrompt(count) {
  const normalizedCount = Number.isInteger(count) && count > 0 ? count : 0;
  return normalizedCount
    ? `Delete ${normalizedCount} saved report${normalizedCount === 1 ? "" : "s"} from this Chrome profile? This cannot be undone.`
    : "There are no saved reports to delete.";
}
