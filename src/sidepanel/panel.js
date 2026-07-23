import { analyzeArticle } from "../lib/openai.js";
import { EVIDENCE_RATINGS, PRESENTATION_RATINGS, findRating } from "../lib/ratings.js";

const state = {
  mode: "article",
  article: null,
  settings: null,
};

const elements = {
  analyze: document.querySelector("#analyze"),
  apiKey: document.querySelector("#api-key"),
  articleMeta: document.querySelector("#article-meta"),
  articlePreview: document.querySelector("#article-preview"),
  articleTitle: document.querySelector("#article-title"),
  clearKey: document.querySelector("#clear-key"),
  emptyState: document.querySelector("#empty-state"),
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
let progressInterval;
let narrativeTimers = [];
let progressStartedAt = 0;
let activeProgressStep = null;

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
  elements.progress.classList.remove("failed");
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
  elements.progress.classList.add("failed");
  elements.progressTitle.textContent = "Analysis stopped";
  elements.progressDetail.textContent = "See the error below. Your article page was not changed.";
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
      files: ["node_modules/@mozilla/readability/Readability.js", "src/content.js"],
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

async function extract() {
  state.article = await runContentFunction("extract", state.mode);
  elements.articleTitle.textContent = state.article.title;
  const details = [state.article.byline, `${state.article.paragraphs.length} paragraphs`].filter(Boolean);
  elements.articleMeta.textContent = details.join(" · ");
  elements.articlePreview.hidden = false;
  elements.emptyState.hidden = true;
  return state.article;
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
  eyebrow.textContent = "Overall finding";

  const verdictRow = document.createElement("div");
  verdictRow.className = "verdict-row";
  const verdict = document.createElement("h2");
  verdict.className = "verdict-value";
  verdict.textContent = evidence.label;
  verdictRow.append(verdict, ratingHelp("Evidence strength", EVIDENCE_RATINGS, evidence.value));

  const plainMeaning = document.createElement("p");
  plainMeaning.className = "verdict-meaning";
  plainMeaning.textContent = evidence.summary;

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

  const summary = document.createElement("p");
  summary.className = "assessment-summary";
  summary.textContent = result.structural_assessment.one_sentence;
  container.append(eyebrow, verdictRow, plainMeaning, styleRow, summary);
  return container;
}

function renderMetrics(metrics) {
  const container = section("Five structural metrics");
  for (const [name, metric] of Object.entries(metrics)) {
    const item = document.createElement("article");
    item.className = "metric";
    const titleRow = document.createElement("div");
    titleRow.className = "metric-title";
    const heading = document.createElement("h3");
    heading.textContent = name.replaceAll("_", " ");
    titleRow.append(heading, tag(metric.status, metric.status));
    const rationale = document.createElement("p");
    rationale.textContent = metric.rationale;
    item.append(titleRow, rationale, paragraphLinks(metric.paragraph_ids));
    container.append(item);
  }
  return container;
}

function renderIssues(issues) {
  const container = section(`Material issues (${issues.length})`);
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
    heading.textContent = issue.type.replaceAll("_", " ");
    heading.append(" ", tag(issue.severity, issue.severity));
    const description = document.createElement("p");
    description.textContent = issue.description;
    item.append(heading, description, paragraphLinks(issue.paragraph_ids));
    container.append(item);
  }
  return container;
}

function renderConclusion(result) {
  const container = section("Bounded conclusion");
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
  elements.analyze.disabled = true;
  elements.results.hidden = true;
  setMessage("");
  startProgress();
  try {
    const article = await extract();
    setProgress(
      "analyze",
      "Analyzing article structure",
      `Prepared ${article.paragraphs.length} source paragraphs and sending them to OpenAI.`,
    );
    narrateModelWait(article.paragraphs.length);
    const { result, diagnostics } = await analyzeArticle(article, ({ type, eventType, elapsedMs }) => {
      if (type === "response_started") {
        setProgress("analyze", "OpenAI accepted the request", "The live response stream is connected. The model is reasoning and preparing the report.");
      } else if (type === "first_output") {
        setProgress("analyze", "Receiving the structured report", `OpenAI began returning the report after ${formatSeconds(elapsedMs)}.`);
      } else if (type === "stream_event" && eventType === "response.output_text.delta") {
        setProgress("analyze", "Receiving the structured report", "OpenAI is streaming the analysis back to LedeLens.");
      } else if (type === "validating") {
        setProgress("validate", "Validating every reference", "Checking the schema, metrics, issues, and paragraph references.");
      }
    });
    setProgress("render", "Building the report", "Organizing the assessment, metrics, issues, and source links.");
    renderResults(result);
    completeProgress();
    setMessage(formatDiagnostics(diagnostics));
  } catch (error) {
    failProgress();
    setMessage(error.message, true);
    if (!state.settings?.hasApiKey) elements.settings.hidden = false;
  } finally {
    elements.analyze.disabled = false;
  }
}

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    document.querySelectorAll(".mode").forEach((candidate) => candidate.classList.toggle("active", candidate === button));
    elements.analyze.textContent = state.mode === "article" ? "Analyze article" : "Analyze selected text";
    elements.articlePreview.hidden = true;
    elements.emptyState.hidden = false;
    elements.results.hidden = true;
    setMessage("");
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
}

initialize();
