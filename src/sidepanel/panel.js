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

const state = {
  mode: "article",
  article: null,
  articleFingerprint: null,
  settings: null,
  pageRevision: 0,
  activeAnalysis: null,
};

const elements = {
  analyze: document.querySelector("#analyze"),
  apiKey: document.querySelector("#api-key"),
  articleMeta: document.querySelector("#article-meta"),
  articlePreview: document.querySelector("#article-preview"),
  articleTitle: document.querySelector("#article-title"),
  clearCache: document.querySelector("#clear-cache"),
  clearKey: document.querySelector("#clear-key"),
  cancelAnalysis: document.querySelector("#cancel-analysis"),
  emptyDescription: document.querySelector("#empty-description"),
  emptyState: document.querySelector("#empty-state"),
  emptyTitle: document.querySelector("#empty-title"),
  keyStatus: document.querySelector("#key-status"),
  loadModels: document.querySelector("#load-models"),
  message: document.querySelector("#message"),
  model: document.querySelector("#model"),
  modelStatus: document.querySelector("#model-status"),
  progress: document.querySelector("#progress"),
  progressDetail: document.querySelector("#progress-detail"),
  progressElapsed: document.querySelector("#progress-elapsed"),
  progressTitle: document.querySelector("#progress-title"),
  results: document.querySelector("#results"),
  saveSettings: document.querySelector("#save-settings"),
  settings: document.querySelector("#settings"),
  settingsForm: document.querySelector("#settings-form"),
  settingsToggle: document.querySelector("#settings-toggle"),
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
}

function defaultAnalyzeLabel() {
  return state.mode === "article" ? "Analyze article" : "Analyze selected text";
}

function setEmptyState(title, description) {
  elements.emptyTitle.textContent = title;
  elements.emptyDescription.textContent = description;
}

function resetPageUi({ needsAccess = false } = {}) {
  stopActiveAnalysis("page_changed");
  state.pageRevision += 1;
  state.article = null;
  state.articleFingerprint = null;
  clearProgressTimers();
  elements.progress.hidden = true;
  elements.articlePreview.hidden = true;
  elements.results.hidden = true;
  elements.emptyState.hidden = false;
  elements.analyze.disabled = needsAccess;
  if (needsAccess) {
    elements.analyze.textContent = "Select toolbar icon first";
    setEmptyState(
      "Allow LedeLens to read this tab",
      "Select the LedeLens icon in Chrome’s toolbar to connect this page. You don’t need to reload the page. If the icon isn’t visible, open Chrome’s Extensions menu and select LedeLens.",
    );
  } else {
    elements.analyze.textContent = defaultAnalyzeLabel();
    setEmptyState(
      "Inspect this article's reasoning",
      "Examine its evidence, causal reasoning, context, and framing—without fact-checking.",
    );
  }
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

function formatSeconds(milliseconds) {
  return Number.isFinite(milliseconds) ? `${(milliseconds / 1000).toFixed(1)}s` : "not reported";
}

function formatDiagnostics(diagnostics) {
  const reasoningTokens = diagnostics?.usage?.output_tokens_details?.reasoning_tokens;
  const parts = [
    `first output ${formatSeconds(diagnostics?.timeToFirstOutputMs)}`,
    `total ${formatSeconds(diagnostics?.totalMs)}`,
  ];
  if (Number.isFinite(reasoningTokens)) parts.push(`${reasoningTokens} reasoning tokens`);
  return `OpenAI timing: ${parts.join(" · ")}.`;
}

function setProgress(step, title, detail) {
  activeProgressStep = step;
  const activeIndex = progressOrder.indexOf(step);
  document.querySelectorAll("[data-progress-step]").forEach((element) => {
    const index = progressOrder.indexOf(element.dataset.progressStep);
    element.classList.toggle("complete", index < activeIndex);
    element.classList.toggle("active", index === activeIndex);
  });
  elements.progressTitle.textContent = title;
  elements.progressDetail.textContent = detail;
}

function startProgress() {
  clearProgressTimers();
  progressStartedAt = Date.now();
  elements.progress.hidden = false;
  elements.progress.classList.remove("failed", "cancelled");
  elements.progressElapsed.textContent = "0:00";
  setProgress("extract", "Reading the article", "Finding the main article and preserving source links.");
  progressInterval = setInterval(() => {
    elements.progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
  }, 1000);
}

function narrateModelWait(paragraphCount) {
  const updates = [
    [6_000, `OpenAI is working through ${paragraphCount} source paragraphs. This can take a minute.`],
    [16_000, "Still working—checking evidence, causal reasoning, and missing context."],
    [32_000, "Still working. Deeper reasoning may take longer; LedeLens has not timed out."],
    [60_000, "Waiting for OpenAI to finish the structured report. You can keep reading this tab."],
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
  elements.progressTitle.textContent = "Analysis ready";
  elements.progressDetail.textContent = "The report passed local validation and is ready to review.";
  elements.progressElapsed.textContent = formatElapsed(Date.now() - progressStartedAt);
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
  if ([...elements.model.options].some((option) => option.value === state.settings.model)) {
    elements.model.value = state.settings.model;
  }
  elements.keyStatus.textContent = state.settings.hasApiKey && state.settings.model
    ? "Model confirmed"
    : "Not configured";
  elements.keyStatus.classList.toggle("ready", state.settings.hasApiKey);
  elements.clearKey.disabled = !state.settings.hasApiKey;
  elements.settings.hidden = Boolean(state.settings.hasApiKey && state.settings.model);
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
  elements.modelStatus.textContent = "Choose a model returned for this API key, then confirm the settings.";
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
    populateModelOptions(models, state.settings?.model);
    setMessage("Choose a model from the OpenAI list, then confirm settings.");
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
  elements.articleTitle.textContent = article.title;
  const details = [article.byline, `${article.paragraphs.length} paragraphs`].filter(Boolean);
  elements.articleMeta.textContent = details.join(" · ");
  elements.articlePreview.hidden = false;
  elements.emptyState.hidden = true;
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

  renderResults(cached.result);
  elements.analyze.textContent = state.mode === "article" ? "Re-analyze article" : "Re-analyze selected text";
  setMessage("Loaded the saved analysis for this page.");
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
    if (!loaded) setMessage("This page is ready to analyze.");
    elements.analyze.disabled = false;
  } catch (error) {
    if (expectedRevision !== state.pageRevision) return;
    if (/Click the LedeLens toolbar icon|cannot access|missing host permission/i.test(error.message)) {
      showAccessPrompt();
    } else {
      resetPageUi();
      setMessage(error.message, true);
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
    button.addEventListener("click", () => runContentFunction("highlight", id).catch((error) => setMessage(error.message, true)));
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

function ratingHelp(title, ratings, activeValue) {
  const wrapper = document.createElement("span");
  wrapper.className = "rating-help";

  const button = document.createElement("button");
  button.className = "rating-help-button";
  button.type = "button";
  button.textContent = "?";
  button.setAttribute("aria-label", `Explain ${title.toLowerCase()} ratings`);

  const popover = document.createElement("span");
  popover.className = "rating-popover";
  popover.setAttribute("role", "tooltip");

  const heading = document.createElement("strong");
  heading.textContent = title;
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

  popover.append(heading, list);
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

function renderResults(result) {
  elements.results.replaceChildren(
    renderAssessment(result),
    renderConclusion(result),
    renderMetrics(result.article_metrics),
    renderIssues(result.issues),
  );
  elements.results.hidden = false;
}

async function analyze() {
  stopActiveAnalysis("superseded");
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
      "Analyzing article structure",
      `Prepared ${article.paragraphs.length} source paragraphs and sending them to OpenAI.`,
    );
    narrateModelWait(article.paragraphs.length);
    const { result, diagnostics } = await analyzeArticle(article, ({ type, eventType, elapsedMs }) => {
      if (!isCurrentAnalysis(operation)) return;
      if (type === "response_started") {
        setProgress("analyze", "OpenAI accepted the request", "The live response stream is connected. The model is reasoning and preparing the report.");
      } else if (type === "first_output") {
        setProgress("analyze", "Receiving the structured report", `OpenAI began returning the report after ${formatSeconds(elapsedMs)}.`);
      } else if (type === "stream_event" && eventType === "response.output_text.delta") {
        setProgress("analyze", "Receiving the structured report", "OpenAI is streaming the analysis back to LedeLens.");
      } else if (type === "validating") {
        setProgress("validate", "Validating every reference", "Checking the schema, metrics, issues, and paragraph references.");
      }
    }, { signal: operation.controller.signal });
    if (!isCurrentAnalysis(operation)) return;
    let cacheWarning = "";
    const cacheIdentity = {
      url: article.url,
      fingerprint: fingerprintArticle(article),
    };
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
    } catch {
      cacheWarning = "Analysis ready, but Chrome could not save it for this page.";
    }
    if (!isCurrentAnalysis(operation)) return;
    setProgress("render", "Building the report", "Organizing the assessment, metrics, issues, and source links.");
    renderResults(result);
    elements.analyze.textContent = state.mode === "article" ? "Re-analyze article" : "Re-analyze selected text";
    completeProgress();
    setMessage(cacheWarning || formatDiagnostics(diagnostics));
  } catch (error) {
    if (state.activeAnalysis !== operation || analysisRevision !== state.pageRevision) return;
    if (error?.category === "cancelled") {
      cancelProgress(error.details?.reason);
      setMessage(
        error.details?.reason === "page_changed"
          ? "Analysis stopped because you changed pages."
          : "Analysis cancelled. No report was saved.",
      );
    } else {
      failProgress();
      setMessage(error.message, true);
    }
    if (!state.settings?.hasApiKey) elements.settings.hidden = false;
  } finally {
    if (state.activeAnalysis === operation) {
      state.activeAnalysis = null;
      elements.analyze.disabled = false;
    }
  }
}

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    const stopped = stopActiveAnalysis("mode_changed");
    state.mode = button.dataset.mode;
    document.querySelectorAll(".mode").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    refreshCurrentPage().then(() => {
      if (stopped) setMessage("Analysis stopped because you changed the analysis source.");
    });
  });
});

elements.settingsToggle.addEventListener("click", () => {
  elements.settings.hidden = !elements.settings.hidden;
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
    setMessage("Settings saved for this browser session.");
  } catch (error) {
    setMessage(error.message, true);
  }
});

elements.clearKey.addEventListener("click", async () => {
  state.settings = await sendMessage({ type: "CLEAR_API_KEY" });
  resetModelOptions();
  updateSettingsUi();
  elements.settings.hidden = false;
  setMessage("Session API key cleared.");
});

elements.clearCache.addEventListener("click", async () => {
  elements.clearCache.disabled = true;
  try {
    await sendMessage({ type: "CLEAR_ANALYSIS_CACHE" });
    setMessage("Saved analyses cleared from this Chrome profile.");
  } catch (error) {
    setMessage(error.message, true);
  } finally {
    elements.clearCache.disabled = false;
  }
});

elements.loadModels.addEventListener("click", loadAvailableModels);
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
    state.settings = await sendMessage({ type: "GET_SETTINGS" });
    if (state.settings.hasApiKey) {
      const { models } = await sendMessage({ type: "LIST_MODELS" });
      populateModelOptions(models, state.settings.model);
    }
    updateSettingsUi();
  } catch (error) {
    setMessage(error.message, true);
  }
  await refreshCurrentPage();
}

initialize();
