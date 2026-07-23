import { analyzeArticle } from "../lib/openai.js";
import {
  EVIDENCE_RATINGS,
  PRESENTATION_RATINGS,
  findMetricStatusLabel,
  findRating,
} from "../lib/ratings.js";
import { fingerprintArticle } from "../lib/cache.js";
import {
  createAnalysisOperation,
  isCurrentAnalysisOperation,
  stopAnalysisOperation,
} from "../lib/request-lifecycle.js";
import {
  cacheDeletionPrompt,
  getArticlePreview,
  getConnectionState,
  getExtractionNotice,
  getPrivacyDisclosure,
  getReportProvenance,
  savedReportCountLabel,
} from "../lib/ui-state.js";
import {
  completedDuration,
  errorPresentation,
  progressEventKey,
  technicalDetailRows,
} from "../lib/analysis-flow.js";

const state = {
  mode: "article",
  article: null,
  articleFingerprint: null,
  settings: null,
  pageRevision: 0,
  activeAnalysis: null,
  pageReady: false,
  needsAccess: false,
  report: null,
  result: null,
  savedReportCount: 0,
};

const elements = {
  analyze: document.querySelector("#analyze"),
  apiKey: document.querySelector("#api-key"),
  articleMeta: document.querySelector("#article-meta"),
  articlePreview: document.querySelector("#article-preview"),
  articleTitle: document.querySelector("#article-title"),
  checkSelection: document.querySelector("#check-selection"),
  changeModel: document.querySelector("#change-model"),
  clearCache: document.querySelector("#clear-cache"),
  clearKey: document.querySelector("#clear-key"),
  cancelAnalysis: document.querySelector("#cancel-analysis"),
  dataDisclosure: document.querySelector("#data-disclosure"),
  errorAction: document.querySelector("#error-action"),
  errorDescription: document.querySelector("#error-description"),
  errorState: document.querySelector("#error-state"),
  errorTechnicalList: document.querySelector("#error-technical-list"),
  errorTitle: document.querySelector("#error-title"),
  emptyDescription: document.querySelector("#empty-description"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  extractionLimitations: document.querySelector("#extraction-limitations"),
  extractionWarning: document.querySelector("#extraction-warning"),
  keyStatus: document.querySelector("#key-status"),
  loadModels: document.querySelector("#load-models"),
  message: document.querySelector("#message"),
  model: document.querySelector("#model"),
  modelStatus: document.querySelector("#model-status"),
  passagePreview: document.querySelector("#passage-preview"),
  previewEyebrow: document.querySelector("#preview-eyebrow"),
  progress: document.querySelector("#progress"),
  progressAnnouncement: document.querySelector("#progress-announcement"),
  progressDetail: document.querySelector("#progress-detail"),
  progressElapsed: document.querySelector("#progress-elapsed"),
  progressTitle: document.querySelector("#progress-title"),
  analysisTechnical: document.querySelector("#analysis-technical"),
  analysisTechnicalList: document.querySelector("#analysis-technical-list"),
  results: document.querySelector("#results"),
  saveSettings: document.querySelector("#save-settings"),
  savedReportCount: document.querySelector("#saved-report-count"),
  settings: document.querySelector("#settings"),
  settingsForm: document.querySelector("#settings-form"),
  settingsToggle: document.querySelector("#settings-toggle"),
  useSelection: document.querySelector("#use-selection"),
};

const progressOrder = ["extract", "analyze", "validate", "render"];
const metricLabels = {
  evidence_coverage: "What supports the main point?",
  source_traceability: "Can you tell who says what?",
  causal_support: "Does the article support its cause-and-effect claims?",
  context_completeness: "Is there enough important context?",
  framing_uncertainty_separation: "Are reporting, interpretation, and uncertainty kept separate?",
};
const issueLabels = {
  unsupported_causation: "Cause not demonstrated",
  correlation_as_causation: "Correlation treated as cause",
  missing_baseline_or_denominator: "Missing baseline or denominator",
  selection_ambiguity: "Unclear selection",
  scope_shift: "The scope changes",
  one_sided_sourcing: "One-sided sourcing",
  unsupported_prediction: "Prediction lacks support",
  fact_commentary_blend: "Facts and commentary are blended",
  certainty_inflation: "Certainty is overstated",
  missing_method_detail: "Missing method details",
  other: "Other structural issue",
};
let progressInterval;
let narrativeTimers = [];
let progressStartedAt = 0;
let activeProgressStep = null;
let refreshTimer;
let ratingHelpId = 0;
let settingsReturnFocus = null;
let currentErrorAction = "retry";

function stopActiveAnalysis(reason = "page_changed", { invalidate = true } = {}) {
  const operation = state.activeAnalysis;
  if (!operation) return false;
  stopAnalysisOperation(operation, reason);
  if (invalidate && state.activeAnalysis === operation) state.activeAnalysis = null;
  return true;
}

function isCurrentAnalysis(operation) {
  return isCurrentAnalysisOperation(state.activeAnalysis, operation, state.pageRevision);
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "The extension did not respond.");
    return response.data;
  });
}

function setMessage(text = "", isError = false) {
  elements.message.textContent = text;
  elements.message.classList.toggle("error", isError);
  elements.message.setAttribute("role", isError ? "alert" : "status");
  elements.message.setAttribute("aria-live", isError ? "assertive" : "polite");
}

function renderTechnicalDetails(list, context) {
  const rows = technicalDetailRows(context);
  list.replaceChildren(...rows.flatMap(([label, value]) => {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    return [term, description];
  }));
}

function clearErrorState() {
  elements.errorState.hidden = true;
  elements.errorState.classList.remove("cancelled");
}

function showAnalysisError(error) {
  const presentation = errorPresentation(error);
  currentErrorAction = presentation.action.type;
  elements.errorTitle.textContent = presentation.title;
  elements.errorDescription.textContent = presentation.description;
  elements.errorAction.textContent = presentation.action.label;
  elements.errorState.classList.toggle("cancelled", presentation.category === "cancelled");
  renderTechnicalDetails(elements.errorTechnicalList, {
    error,
    model: state.settings?.model,
  });
  elements.errorState.hidden = false;
  elements.errorState.focus();
}

function showAnalysisDiagnostics({ diagnostics, requestId }) {
  renderTechnicalDetails(elements.analysisTechnicalList, {
    diagnostics,
    requestId,
    model: state.settings?.model,
  });
  elements.analysisTechnical.hidden = false;
}

function defaultAnalyzeLabel() {
  const extractionNotice = getExtractionNotice(state.article, state.mode);
  if (extractionNotice.visible) return extractionNotice.actionLabel;
  return state.mode === "article" ? "Analyze article" : "Analyze selected passage";
}

function updateAnalyzeUi() {
  const connection = getConnectionState(state.settings || {});
  const hasVisibleReport = Boolean(state.report);
  if (state.needsAccess) {
    elements.analyze.textContent = "Select toolbar icon first";
  } else if (hasVisibleReport) {
    elements.analyze.textContent = "Run a new analysis";
  } else if (!connection.canAnalyze) {
    elements.analyze.textContent = "Connect OpenAI to analyze";
  } else {
    elements.analyze.textContent = defaultAnalyzeLabel();
  }
  elements.analyze.disabled = state.needsAccess || !state.pageReady || !connection.canAnalyze;
}

function setEmptyState(title, description) {
  elements.emptyTitle.textContent = title;
  elements.emptyDescription.textContent = description;
}

function updateDisclosure() {
  elements.dataDisclosure.textContent = getPrivacyDisclosure(state.report);
}

function renderExtractionNotice(article) {
  const notice = getExtractionNotice(article, state.mode);
  elements.extractionWarning.hidden = !notice.visible;
  elements.extractionLimitations.replaceChildren();
  for (const limitation of notice.limitations) {
    const item = document.createElement("li");
    item.textContent = limitation;
    elements.extractionLimitations.append(item);
  }
}

function renderArticlePreview(article) {
  const preview = getArticlePreview(article, state.mode);
  elements.previewEyebrow.textContent = preview.eyebrow;
  elements.articleTitle.textContent = preview.title;
  elements.articleMeta.textContent = preview.meta;
  elements.passagePreview.textContent = preview.excerpt;
  elements.passagePreview.hidden = !preview.excerpt;
  elements.articlePreview.hidden = false;
  elements.emptyState.hidden = true;
  elements.checkSelection.hidden = true;
  renderExtractionNotice(article);
}

function resetPageUi({ needsAccess = false } = {}) {
  stopActiveAnalysis("page_changed");
  state.pageRevision += 1;
  state.article = null;
  state.articleFingerprint = null;
  state.pageReady = false;
  state.needsAccess = needsAccess;
  state.report = null;
  state.result = null;
  clearProgressTimers();
  elements.progress.hidden = true;
  elements.articlePreview.hidden = true;
  elements.extractionWarning.hidden = true;
  elements.results.hidden = true;
  elements.analysisTechnical.hidden = true;
  clearErrorState();
  elements.emptyState.hidden = false;
  elements.checkSelection.hidden = true;
  updateDisclosure();
  if (needsAccess) {
    setEmptyState(
      "Allow LedeLens to read this tab",
      "Select the LedeLens icon in Chrome’s toolbar to connect this page. You don’t need to reload the page. If the icon isn’t visible, open Chrome’s Extensions menu and select LedeLens.",
    );
  } else if (state.mode === "selection") {
    setEmptyState(
      "Select a passage on the page",
      "Highlight the text you want to examine, then return here.",
    );
    elements.checkSelection.hidden = false;
  } else {
    setEmptyState(
      "Inspect this article's reasoning",
      "Examine its evidence, causal reasoning, context, and framing—without fact-checking.",
    );
  }
  updateAnalyzeUi();
}

function clearProgressTimers() {
  clearInterval(progressInterval);
  progressInterval = null;
  narrativeTimers.forEach(clearTimeout);
  narrativeTimers = [];
}

function formatElapsed(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function setProgress(step, title, detail) {
  const stageChanged = activeProgressStep !== step;
  activeProgressStep = step;
  const activeIndex = progressOrder.indexOf(step);
  document.querySelectorAll("[data-progress-step]").forEach((element) => {
    const index = progressOrder.indexOf(element.dataset.progressStep);
    element.classList.toggle("complete", index < activeIndex);
    element.classList.toggle("active", index === activeIndex);
  });
  elements.progressTitle.textContent = title;
  elements.progressDetail.textContent = detail;
  if (stageChanged) elements.progressAnnouncement.textContent = title;
}

function startProgress() {
  clearProgressTimers();
  progressStartedAt = Date.now();
  elements.progress.hidden = false;
  elements.progress.classList.remove("failed", "cancelled");
  elements.analysisTechnical.hidden = true;
  clearErrorState();
  elements.progressElapsed.textContent = "0:00";
  setProgress("extract", "Reading page", "Finding article text and preserving links to its paragraphs.");
  progressInterval = setInterval(() => {
    elements.progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
  }, 1000);
}

function narrateModelWait(paragraphCount) {
  const updates = [
    [6_000, `OpenAI accepted ${paragraphCount} source paragraphs and is preparing a response.`],
    [16_000, "The analysis is still in progress."],
    [32_000, "Longer articles and some models may take more time."],
    [60_000, "Still waiting for OpenAI to finish the report. You can keep reading this tab."],
  ];
  narrativeTimers = updates.map(([delay, detail]) => setTimeout(() => {
    if (activeProgressStep === "analyze") elements.progressDetail.textContent = detail;
  }, delay));
}

function completeProgress() {
  clearProgressTimers();
  document.querySelectorAll("[data-progress-step]").forEach((element) => {
    element.classList.add("complete");
    element.classList.remove("active");
  });
  elements.progressTitle.textContent = "Results ready";
  elements.progressDetail.textContent = "The report passed local checks and is ready to review.";
  elements.progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
  elements.progressAnnouncement.textContent = "Analysis ready";
  setTimeout(() => {
    if (!progressInterval && !elements.progress.classList.contains("failed")) elements.progress.hidden = true;
  }, 1200);
}

function failProgress() {
  clearProgressTimers();
  elements.progress.classList.remove("cancelled");
  elements.progress.classList.add("failed");
  elements.progressTitle.textContent = "Analysis stopped";
  elements.progressDetail.textContent = "See the error below. Your article page was not changed.";
  elements.progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
  elements.progressAnnouncement.textContent = "";
}

function cancelProgress(reason = "user_cancelled") {
  clearProgressTimers();
  elements.progress.classList.remove("failed");
  elements.progress.classList.add("cancelled");
  elements.progressTitle.textContent = "Analysis stopped";
  elements.progressDetail.textContent = reason === "page_changed"
    ? "Analysis stopped because you changed pages."
    : "You cancelled the analysis. No report was saved.";
  elements.progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
}

function updateSettingsUi() {
  const connection = getConnectionState(state.settings || {});
  if (state.settings.model && ![...elements.model.options].some((option) => option.value === state.settings.model)) {
    const confirmedOption = document.createElement("option");
    confirmedOption.value = state.settings.model;
    confirmedOption.textContent = state.settings.model;
    elements.model.replaceChildren(confirmedOption);
    elements.model.disabled = true;
  }
  if (state.settings.model) elements.model.value = state.settings.model;
  elements.keyStatus.textContent = connection.label;
  elements.keyStatus.className = `status-pill ${connection.tone}`;
  elements.clearKey.disabled = !state.settings.hasApiKey;
  elements.changeModel.hidden = !connection.canAnalyze;
  if (connection.canAnalyze && elements.model.disabled) {
    elements.modelStatus.textContent = "This confirmed model is used without contacting OpenAI when the panel opens.";
  }
  updateAnalyzeUi();
}

function updateDataStatus(count) {
  state.savedReportCount = Number.isInteger(count) && count > 0 ? count : 0;
  elements.savedReportCount.textContent = savedReportCountLabel(state.savedReportCount);
  elements.clearCache.disabled = state.savedReportCount === 0;
  elements.clearCache.textContent = state.savedReportCount
    ? `Delete ${state.savedReportCount} saved report${state.savedReportCount === 1 ? "" : "s"}`
    : "Delete saved reports";
}

function populateModelOptions(models, selectedModel = null) {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a model";
  const options = models.map((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    return option;
  });
  elements.model.replaceChildren(placeholder, ...options);
  elements.model.disabled = false;
  elements.model.value = models.includes(selectedModel) ? selectedModel : "";
  elements.saveSettings.disabled = !elements.model.value;
  elements.modelStatus.textContent = `${models.length} compatible model${models.length === 1 ? "" : "s"} returned by OpenAI.`;
}

function resetModelOptions() {
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Load models from OpenAI first";
  elements.model.replaceChildren(placeholder);
  elements.model.disabled = true;
  elements.saveSettings.disabled = true;
  elements.modelStatus.textContent = "Load the models available to this API key, then choose one.";
}

async function loadAvailableModels() {
  elements.loadModels.disabled = true;
  elements.saveSettings.disabled = true;
  elements.model.disabled = true;
  setMessage("Loading models from OpenAI…");
  try {
    const { models } = await sendMessage({
      type: "LIST_MODELS",
      payload: { apiKey: elements.apiKey.value },
    });
    state.settings = {
      ...state.settings,
      hasApiKey: true,
      model: null,
    };
    populateModelOptions(models);
    updateSettingsUi();
    setMessage("Key added. Choose a model, then select Save and continue.");
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    elements.loadModels.disabled = false;
  }
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab is available.");
  return tab;
}

async function runContentFunction(functionName, ...args) {
  const tab = await activeTab();
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/vendor/mozilla-readability/Readability.js", "src/content.js"],
    });
    const [execution] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (name, values) => globalThis.__ledeLens[name](...values),
      args: [functionName, args],
    });
    return execution.result;
  } catch (error) {
    if (/cannot access|missing host permission|extensions gallery cannot be scripted/i.test(error.message)) {
      throw new Error("Click the LedeLens toolbar icon on this tab to grant page access, then try again.");
    }
    throw error;
  }
}

async function extract(expectedRevision = state.pageRevision) {
  const article = await runContentFunction("extract", state.mode);
  if (expectedRevision !== state.pageRevision) return null;

  state.article = article;
  state.articleFingerprint = fingerprintArticle(article);
  renderArticlePreview(article);
  state.pageReady = true;
  updateAnalyzeUi();
  return article;
}

async function loadCachedAnalysis(article, expectedRevision) {
  const cached = await sendMessage({
    type: "GET_CACHED_ANALYSIS",
    payload: {
      url: article.url,
      fingerprint: state.articleFingerprint,
    },
  });
  if (expectedRevision !== state.pageRevision || !cached.hit) return false;

  state.report = {
    source: "restored",
    savedAt: cached.savedAt,
    persisted: true,
  };
  renderResults(cached.result, state.report);
  updateDisclosure();
  updateAnalyzeUi();
  setMessage("");
  return true;
}

function showAccessPrompt(message = "") {
  resetPageUi({ needsAccess: true });
  setMessage(message);
}

async function refreshCurrentPage() {
  resetPageUi();
  const expectedRevision = state.pageRevision;
  setMessage("Checking this page for a saved analysis…");
  try {
    const article = await extract(expectedRevision);
    if (!article || expectedRevision !== state.pageRevision) return;
    const loaded = await loadCachedAnalysis(article, expectedRevision);
    if (expectedRevision !== state.pageRevision) return;
    if (!loaded) setMessage(
      getConnectionState(state.settings || {}).canAnalyze
        ? "This page is ready to analyze."
        : "Connect OpenAI in settings before starting a new analysis.",
    );
    updateAnalyzeUi();
  } catch (error) {
    if (expectedRevision !== state.pageRevision) return;
    if (/Click the LedeLens toolbar icon|cannot access|missing host permission/i.test(error.message)) {
      showAccessPrompt();
    } else {
      resetPageUi();
      showAnalysisError(error);
    }
  }
}

function schedulePageRefresh({ accessGranted = false } = {}) {
  clearTimeout(refreshTimer);
  const stopped = stopActiveAnalysis("page_changed");
  resetPageUi({ needsAccess: !accessGranted });
  setMessage(stopped
    ? "Analysis stopped because you changed pages."
    : (accessGranted ? "Reading this page…" : ""));
  if (accessGranted) {
    refreshTimer = setTimeout(refreshCurrentPage, 50);
  }
}

function paragraphLinks(ids) {
  const container = document.createElement("div");
  container.className = "paragraph-links";
  for (const id of ids) {
    const button = document.createElement("button");
    button.className = "paragraph-link";
    button.type = "button";
    button.textContent = id;
    const paragraphNumber = id.replace(/^p/, "");
    button.setAttribute("aria-label", `Highlight source paragraph ${paragraphNumber}`);
    button.addEventListener("click", async () => {
      try {
        const highlighted = await runContentFunction("highlight", id);
        setMessage(
          highlighted
            ? `Highlighted source paragraph ${paragraphNumber}.`
            : `Source paragraph ${paragraphNumber} is no longer available on the page.`,
          !highlighted,
        );
      } catch (error) {
        setMessage(`Could not highlight source paragraph ${paragraphNumber}: ${error.message}`, true);
      }
    });
    container.append(button);
  }
  return container;
}

function tag(text, className = "") {
  const span = document.createElement("span");
  span.className = `tag ${className}`.trim();
  span.textContent = text.replaceAll("_", " ");
  return span;
}

function section(title, className = "") {
  const container = document.createElement("section");
  container.className = `result-section ${className}`.trim();
  const heading = document.createElement("h2");
  heading.textContent = title;
  container.append(heading);
  return container;
}

function formatSavedAt(savedAt) {
  if (!Number.isFinite(savedAt)) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(savedAt));
}

function renderReportProvenance(report) {
  const provenance = getReportProvenance(report);
  const container = document.createElement("section");
  container.className = `report-provenance ${provenance.tone}`;
  container.setAttribute("aria-live", "polite");
  const title = document.createElement("strong");
  title.textContent = provenance.savedAt
    ? `${provenance.title} · ${formatSavedAt(provenance.savedAt)}`
    : provenance.title;
  const description = document.createElement("p");
  description.textContent = provenance.description;
  container.append(title, description);
  return container;
}

function closeRatingHelp(exceptButton = null, { returnFocus = false } = {}) {
  document.querySelectorAll(".rating-help-button[aria-expanded='true']").forEach((button) => {
    if (button === exceptButton) return;
    button.setAttribute("aria-expanded", "false");
    const popover = document.querySelector(`#${CSS.escape(button.getAttribute("aria-controls"))}`);
    if (popover) popover.hidden = true;
    if (returnFocus) button.focus();
  });
}

function ratingHelp(title, ratings, activeValue) {
  const wrapper = document.createElement("span");
  wrapper.className = "rating-help";

  const button = document.createElement("button");
  button.className = "rating-help-button";
  button.type = "button";
  button.textContent = "?";
  button.setAttribute("aria-label", `Explain ${title.toLowerCase()} ratings`);
  button.setAttribute("aria-expanded", "false");

  const popover = document.createElement("span");
  popover.className = "rating-popover";
  popover.id = `rating-help-${++ratingHelpId}`;
  popover.hidden = true;
  popover.setAttribute("role", "region");
  popover.setAttribute("aria-label", `${title} rating guide`);
  button.setAttribute("aria-controls", popover.id);

  const heading = document.createElement("strong");
  heading.textContent = title;
  const activeRating = ratings.find((rating) => rating.value === activeValue);
  const current = document.createElement("span");
  current.className = "current-rating";
  current.textContent = `Current rating: ${activeRating?.label || activeValue}.`;
  const list = document.createElement("span");
  list.className = "rating-options";

  for (const rating of ratings) {
    const option = document.createElement("span");
    option.className = `rating-option tone-${rating.tone}`;
    if (rating.value === activeValue) {
      option.classList.add("current");
      option.setAttribute("aria-current", "true");
    }
    const label = document.createElement("b");
    label.textContent = rating.label;
    const explanation = document.createElement("span");
    explanation.textContent = rating.explanation;
    option.append(label, explanation);
    list.append(option);
  }

  button.addEventListener("click", () => {
    const willOpen = button.getAttribute("aria-expanded") !== "true";
    closeRatingHelp(button);
    button.setAttribute("aria-expanded", String(willOpen));
    popover.hidden = !willOpen;
  });

  button.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || button.getAttribute("aria-expanded") !== "true") return;
    event.stopPropagation();
    button.setAttribute("aria-expanded", "false");
    popover.hidden = true;
    button.focus();
  });

  popover.append(heading, current, list);
  wrapper.append(button, popover);
  return wrapper;
}

function renderAssessment(result) {
  const evidence = findRating(EVIDENCE_RATINGS, result.structural_assessment.evidence_structure);
  const presentation = findRating(PRESENTATION_RATINGS, result.structural_assessment.presentation_style);
  const container = document.createElement("section");
  container.className = `result-section assessment verdict-${evidence.tone}`;

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "How well does this article support its main takeaway?";

  const verdictRow = document.createElement("div");
  verdictRow.className = "verdict-row";
  const verdict = document.createElement("h2");
  verdict.className = "verdict-value";
  verdict.textContent = evidence.label;
  verdictRow.append(verdict, ratingHelp("Evidence strength", EVIDENCE_RATINGS, evidence.value));

  const plainMeaning = document.createElement("p");
  plainMeaning.className = "verdict-meaning";
  plainMeaning.textContent = evidence.summary;

  const scopeNote = document.createElement("p");
  scopeNote.className = "assessment-scope";
  scopeNote.textContent = "This looks only at support presented in the article. It does not check whether the reported claims are true.";

  const styleRow = document.createElement("div");
  styleRow.className = "presentation-row";
  const styleLabel = document.createElement("span");
  styleLabel.textContent = "Presentation style";
  const styleValue = document.createElement("strong");
  styleValue.className = `presentation-value tone-${presentation.tone}`;
  styleValue.textContent = presentation.label;
  styleRow.append(
    styleLabel,
    styleValue,
    ratingHelp("Presentation style", PRESENTATION_RATINGS, presentation.value),
  );

  const styleNote = document.createElement("p");
  styleNote.className = "presentation-note";
  styleNote.textContent = "Presentation style describes how the article is written, not whether it is true.";

  const summary = document.createElement("p");
  summary.className = "assessment-summary";
  summary.textContent = result.structural_assessment.one_sentence;
  container.append(eyebrow, verdictRow, plainMeaning, scopeNote, styleRow, styleNote, summary);
  return container;
}

function renderMetrics(metrics) {
  const container = section("Five questions to ask");
  for (const [name, metric] of Object.entries(metrics)) {
    const item = document.createElement("article");
    item.className = "metric";
    const titleRow = document.createElement("div");
    titleRow.className = "metric-title";
    const heading = document.createElement("h3");
    heading.textContent = metricLabels[name] || name.replaceAll("_", " ");
    titleRow.append(heading, tag(findMetricStatusLabel(name, metric.status), metric.status));
    const rationale = document.createElement("p");
    rationale.textContent = metric.rationale;
    item.append(titleRow, rationale, paragraphLinks(metric.paragraph_ids));
    container.append(item);
  }
  return container;
}

function renderIssues(issues) {
  const container = section(`What to watch (${issues.length})`);
  if (!issues.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No material structural issues were identified.";
    container.append(empty);
  }
  for (const issue of issues) {
    const item = document.createElement("article");
    item.className = "issue";
    const heading = document.createElement("h3");
    heading.textContent = issueLabels[issue.type] || issue.type.replaceAll("_", " ");
    heading.append(" ", tag(issue.severity, issue.severity));
    const description = document.createElement("p");
    description.textContent = issue.description;
    item.append(heading, description, paragraphLinks(issue.paragraph_ids));
    container.append(item);
  }
  return container;
}

function renderConclusion(result) {
  const container = section("What the article can support");
  const conclusion = document.createElement("p");
  conclusion.className = "bounded-conclusion";
  conclusion.textContent = result.bounded_conclusion;
  container.append(conclusion);
  return container;
}

function renderResults(result, report) {
  state.result = result;
  state.report = report;
  updateDisclosure();
  elements.results.replaceChildren(
    renderReportProvenance(report),
    renderAssessment(result),
    renderConclusion(result),
    renderMetrics(result.article_metrics),
    renderIssues(result.issues),
  );
  elements.results.hidden = false;
}

async function analyze() {
  stopActiveAnalysis("superseded");
  if (!getConnectionState(state.settings || {}).canAnalyze) {
    setSettingsOpen(true, { focus: true });
    setMessage("Complete the OpenAI connection before starting an analysis.", true);
    return;
  }
  const analysisRevision = state.pageRevision;
  const operation = createAnalysisOperation(analysisRevision);
  state.activeAnalysis = operation;
  elements.analyze.disabled = true;
  elements.results.hidden = true;
  setMessage("");
  startProgress();
  try {
    const article = await extract(analysisRevision);
    if (!article) return;
    if (!isCurrentAnalysis(operation)) return;
    setProgress(
      "analyze",
      "Analyzing structure",
      `Sending ${article.paragraphs.length} source paragraphs to OpenAI.`,
    );
    narrateModelWait(article.paragraphs.length);
    let lastProgressEvent = null;
    const { result, diagnostics, requestId } = await analyzeArticle(article, ({ type, eventType }) => {
      if (!isCurrentAnalysis(operation)) return;
      const eventKey = progressEventKey({ type, eventType });
      if (!eventKey || eventKey === lastProgressEvent) return;
      lastProgressEvent = eventKey;
      if (eventKey === "response_started") {
        setProgress("analyze", "Analyzing structure", "OpenAI accepted the request and is preparing a response.");
      } else if (eventKey === "first_output" || eventKey === "output_delta") {
        setProgress("analyze", "Analyzing structure", "OpenAI has started returning the report.");
      } else if (eventKey === "validating") {
        setProgress("validate", "Checking report", "Checking the report format, metrics, issues, and paragraph links.");
      }
    }, { signal: operation.controller.signal });
    if (!isCurrentAnalysis(operation)) return;
    let cacheWarning = "";
    const cacheIdentity = {
      url: article.url,
      fingerprint: fingerprintArticle(article),
    };
    let savedAt = null;
    try {
      const saved = await sendMessage({
        type: "SAVE_CACHED_ANALYSIS",
        payload: {
          ...cacheIdentity,
          result,
        },
      });
      if (!isCurrentAnalysis(operation)) {
        await sendMessage({
          type: "REMOVE_CACHED_ANALYSIS",
          payload: { ...cacheIdentity, savedAt: saved.savedAt },
        }).catch(() => {});
        return;
      }
      savedAt = saved.savedAt;
      const { savedReportCount } = await sendMessage({ type: "GET_DATA_STATUS" });
      if (!isCurrentAnalysis(operation)) {
        await sendMessage({
          type: "REMOVE_CACHED_ANALYSIS",
          payload: { ...cacheIdentity, savedAt },
        }).catch(() => {});
        return;
      }
      updateDataStatus(savedReportCount);
    } catch {
      cacheWarning = "Analysis ready, but Chrome could not save it for this page.";
    }
    if (!isCurrentAnalysis(operation)) return;
    setProgress("render", "Preparing results", "Organizing the assessment, metrics, issues, and source links.");
    state.report = {
      source: "fresh",
      savedAt,
      persisted: Boolean(savedAt),
    };
    renderResults(result, state.report);
    updateAnalyzeUi();
    completeProgress();
    setMessage(`${completedDuration(diagnostics)}${cacheWarning ? ` ${cacheWarning}` : ""}`);
    showAnalysisDiagnostics({ diagnostics, requestId });
  } catch (error) {
    if (state.activeAnalysis !== operation || analysisRevision !== state.pageRevision) return;
    if (error?.category === "cancelled") {
      cancelProgress(error.details?.reason);
    } else {
      failProgress();
    }
    setMessage("");
    showAnalysisError(error);
    if (!getConnectionState(state.settings || {}).canAnalyze) setSettingsOpen(true);
  } finally {
    if (state.activeAnalysis === operation) {
      state.activeAnalysis = null;
      updateAnalyzeUi();
    }
  }
}

function setMode(mode, { focus = false } = {}) {
  if (!["article", "selection"].includes(mode)) return;
  const stopped = stopActiveAnalysis("mode_changed");
  state.mode = mode;
  document.querySelectorAll(".mode").forEach((candidate) => {
    const selected = candidate.dataset.mode === mode;
    candidate.classList.toggle("active", selected);
    candidate.setAttribute("aria-checked", String(selected));
    candidate.tabIndex = selected ? 0 : -1;
    if (selected && focus) candidate.focus();
  });
  return refreshCurrentPage().then(() => {
    if (stopped) setMessage("Analysis stopped because you changed the analysis source.");
  });
}

function setSettingsOpen(open, { focus = false, returnFocus = false } = {}) {
  if (open && elements.settings.hidden) settingsReturnFocus = document.activeElement;
  elements.settings.hidden = !open;
  elements.settingsToggle.setAttribute("aria-expanded", String(open));
  elements.settingsToggle.setAttribute("aria-label", open ? "Close settings" : "Open settings");
  if (open && focus) elements.settings.focus();
  if (!open && returnFocus) (settingsReturnFocus || elements.settingsToggle).focus();
}

document.querySelectorAll(".mode").forEach((button, index, buttons) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
  button.addEventListener("keydown", (event) => {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (index + direction + buttons.length) % buttons.length;
    setMode(buttons[nextIndex].dataset.mode, { focus: true });
  });
});

elements.checkSelection.addEventListener("click", refreshCurrentPage);
elements.useSelection.addEventListener("click", () => setMode("selection", { focus: true }));

elements.settingsToggle.addEventListener("click", () => {
  setSettingsOpen(elements.settings.hidden, { focus: elements.settings.hidden, returnFocus: !elements.settings.hidden });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".rating-help")) closeRatingHelp();
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const expandedHelp = document.querySelector(".rating-help-button[aria-expanded='true']");
  if (expandedHelp) {
    closeRatingHelp(null, { returnFocus: true });
  } else if (!elements.settings.hidden) {
    setSettingsOpen(false, { returnFocus: true });
  }
});

window.addEventListener("focus", () => {
  if (state.mode === "selection" && elements.progress.hidden) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshCurrentPage, 100);
  }
});

elements.settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("Confirming this model with OpenAI…");
  try {
    state.settings = await sendMessage({
      type: "SAVE_SETTINGS",
      payload: { model: elements.model.value, apiKey: elements.apiKey.value },
    });
    elements.apiKey.value = "";
    updateSettingsUi();
    setSettingsOpen(false, { returnFocus: true });
    setMessage(`Connected to OpenAI with ${state.settings.model}.`);
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.clearKey.addEventListener("click", async () => {
  if (!confirm("Delete the OpenAI API key from this browser session? You will need to enter it again before running a new analysis.")) return;
  try {
    state.settings = await sendMessage({ type: "CLEAR_API_KEY" });
    resetModelOptions();
    updateSettingsUi();
    setSettingsOpen(true);
    setMessage("Session API key deleted. Saved reports remain on this device.");
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.clearCache.addEventListener("click", async () => {
  if (!state.savedReportCount) {
    setMessage("There are no saved reports to delete.");
    return;
  }
  if (!confirm(cacheDeletionPrompt(state.savedReportCount))) return;
  elements.clearCache.disabled = true;
  try {
    const { deletedCount } = await sendMessage({ type: "CLEAR_ANALYSIS_CACHE" });
    updateDataStatus(0);
    if (state.report?.persisted && state.result) {
      state.report = { ...state.report, persisted: false };
      renderResults(state.result, state.report);
    }
    setMessage(`${deletedCount} saved report${deletedCount === 1 ? "" : "s"} deleted from this Chrome profile.`);
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    elements.clearCache.disabled = state.savedReportCount === 0;
  }
});

elements.loadModels.addEventListener("click", loadAvailableModels);
elements.changeModel.addEventListener("click", async () => {
  elements.loadModels.textContent = "Refresh model list";
  await loadAvailableModels();
});
elements.model.addEventListener("change", () => {
  elements.saveSettings.disabled = !elements.model.value;
});
elements.apiKey.addEventListener("input", () => {
  if (!elements.apiKey.value.trim()) return;
  resetModelOptions();
  elements.modelStatus.textContent = "Load models again to verify this API key.";
});
elements.analyze.addEventListener("click", analyze);
elements.cancelAnalysis.addEventListener("click", () => {
  const operation = state.activeAnalysis;
  if (!operation || operation.controller.signal.aborted) return;
  cancelProgress("user_cancelled");
  setMessage("Analysis cancelled. No report was saved.");
  stopAnalysisOperation(operation, "user_cancelled");
});
elements.errorAction.addEventListener("click", async () => {
  if (currentErrorAction === "settings") {
    setSettingsOpen(true);
    elements.apiKey.focus();
    return;
  }
  if (currentErrorAction === "selection") {
    await setMode("selection", { focus: true });
    clearErrorState();
    setMessage("Select a passage on the page, then choose Analyze selected text.");
    elements.analyze.focus();
    return;
  }
  clearErrorState();
  analyze();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "PAGE_ACCESS_GRANTED") {
    schedulePageRefresh({ accessGranted: true });
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTab()
    .then((tab) => {
      if (tab.id === tabId) schedulePageRefresh();
    })
    .catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== "loading" && !changeInfo.url) return;
  activeTab()
    .then((tab) => {
      if (tab.id === tabId) schedulePageRefresh();
    })
    .catch(() => {});
});

async function initialize() {
  try {
    const [settings, dataStatus] = await Promise.all([
      sendMessage({ type: "GET_SETTINGS" }),
      sendMessage({ type: "GET_DATA_STATUS" }),
    ]);
    state.settings = settings;
    updateDataStatus(dataStatus.savedReportCount);
    updateSettingsUi();
    setSettingsOpen(!getConnectionState(state.settings || {}).canAnalyze);
  } catch (error) {
    setMessage(error.message, true);
  }
  await refreshCurrentPage();
}

initialize();
