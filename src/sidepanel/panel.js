import { MODEL_CATALOG } from "../lib/models.js";

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
  message: document.querySelector("#message"),
  model: document.querySelector("#model"),
  results: document.querySelector("#results"),
  settings: document.querySelector("#settings"),
  settingsForm: document.querySelector("#settings-form"),
  settingsToggle: document.querySelector("#settings-toggle"),
};

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

function updateSettingsUi() {
  elements.model.value = state.settings.model;
  elements.keyStatus.textContent = state.settings.hasApiKey ? "Session key ready" : "Not configured";
  elements.keyStatus.classList.toggle("ready", state.settings.hasApiKey);
  elements.clearKey.disabled = !state.settings.hasApiKey;
  elements.settings.hidden = state.settings.hasApiKey;
}

function populateModelOptions() {
  const options = MODEL_CATALOG.map(({ id, label }) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = label;
    return option;
  });
  elements.model.replaceChildren(...options);
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab is available.");
  if (!/^https?:/.test(tab.url || "")) throw new Error("Open a regular web page to use LedeLens.");
  return tab;
}

async function runContentFunction(functionName, ...args) {
  const tab = await activeTab();
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/content.js"] });
  const [execution] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (name, values) => globalThis.__ledeLens[name](...values),
    args: [functionName, args],
  });
  return execution.result;
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

function renderAssessment(result) {
  const container = section("Structural assessment", "assessment");
  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Overall finding";
  container.prepend(eyebrow);
  container.append(
    tag(result.structural_assessment.evidence_structure),
    tag(result.structural_assessment.presentation_style),
  );
  const summary = document.createElement("p");
  summary.textContent = result.structural_assessment.one_sentence;
  container.append(summary);
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

function renderClaims(claims) {
  const container = section(`Claims (${claims.length})`);
  for (const claim of claims) {
    const item = document.createElement("article");
    item.className = "claim";
    const heading = document.createElement("h3");
    heading.textContent = `${claim.id} · ${claim.type}`;
    const text = document.createElement("p");
    text.textContent = claim.text;
    item.append(heading, text, paragraphLinks(claim.paragraph_ids));
    container.append(item);
  }
  return container;
}

function renderRelationships(relationships) {
  const container = section(`Claim relationships (${relationships.length})`);
  if (!relationships.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No explicit relationships were identified.";
    container.append(empty);
  }
  for (const relationship of relationships) {
    const item = document.createElement("article");
    item.className = "relationship";
    const heading = document.createElement("h3");
    heading.textContent = `${relationship.from_claim_id} ${relationship.type} ${relationship.to_claim_id}`;
    const rationale = document.createElement("p");
    rationale.textContent = relationship.rationale;
    item.append(heading, rationale, paragraphLinks(relationship.paragraph_ids));
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
    renderClaims(result.claims),
    renderRelationships(result.relationships),
  );
  elements.results.hidden = false;
}

async function analyze() {
  elements.analyze.disabled = true;
  elements.results.hidden = true;
  setMessage("Extracting the visible article…");
  try {
    const article = await extract();
    setMessage("Auditing claims, evidence, causality, and framing…");
    const result = await sendMessage({ type: "ANALYZE", payload: { article } });
    renderResults(result);
    setMessage("");
  } catch (error) {
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
  setMessage("Saving settings…");
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
  updateSettingsUi();
  elements.settings.hidden = false;
  setMessage("Session API key cleared.");
});

elements.analyze.addEventListener("click", analyze);

async function initialize() {
  try {
    populateModelOptions();
    state.settings = await sendMessage({ type: "GET_SETTINGS" });
    updateSettingsUi();
  } catch (error) {
    setMessage(error.message, true);
  }
}

initialize();
