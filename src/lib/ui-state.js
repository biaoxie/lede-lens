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

export function getArticlePreview(article, mode = "article") {
  const paragraphs = Array.isArray(article?.paragraphs) ? article.paragraphs : [];
  const text = paragraphs
    .map(({ text = "" }) => String(text).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
  const characterCount = text.length;
  const paragraphLabel = `${paragraphs.length} paragraph${paragraphs.length === 1 ? "" : "s"}`;
  const characterLabel = `${characterCount.toLocaleString("en-US")} character${characterCount === 1 ? "" : "s"}`;

  return mode === "selection"
    ? {
        eyebrow: "Selected passage",
        title: article?.title || "Selected passage",
        excerpt: text,
        meta: `${characterLabel} · ${paragraphLabel}`,
      }
    : {
        eyebrow: "Detected article",
        title: article?.title || "Untitled article",
        excerpt: "",
        meta: [article?.byline, paragraphLabel].filter(Boolean).join(" · "),
      };
}

export function getExtractionNotice(article, mode = "article") {
  const limitations = Array.isArray(article?.extraction?.notes)
    ? article.extraction.notes.filter((note) => typeof note === "string" && note.trim())
    : [];
  const isPartialArticle = mode === "article"
    && article?.extraction?.status === "partial"
    && limitations.length > 0;
  return {
    visible: isPartialArticle,
    limitations: isPartialArticle ? limitations : [],
    actionLabel: isPartialArticle ? "Analyze detected text" : null,
  };
}

export function getPrivacyDisclosure(report = null) {
  return report?.source === "restored"
    ? "This saved report was restored locally. Nothing was sent to OpenAI."
    : "When you analyze, LedeLens sends the detected article text, title, byline, and publication date to OpenAI. The page address stays on this device. OpenAI API charges may apply.";
}
