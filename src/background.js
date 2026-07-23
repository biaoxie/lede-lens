import { validateAnalysisResult } from "./lib/validator.js";
import { ALLOWED_MODELS, DEFAULT_MODEL } from "./lib/models.js";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

let assetsPromise;

function configureActionBehavior() {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

configureActionBehavior().catch(() => {});
chrome.runtime.onInstalled.addListener(() => configureActionBehavior().catch(() => {}));
chrome.runtime.onStartup.addListener(() => configureActionBehavior().catch(() => {}));

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

async function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      fetch(chrome.runtime.getURL("skills/analyze-news-structure/assets/system-prompt.md")).then((response) => response.text()),
      fetch(chrome.runtime.getURL("skills/analyze-news-structure/assets/output-schema.json")).then((response) => response.json()),
    ]).then(([systemPrompt, outputSchema]) => ({ systemPrompt, outputSchema }));
  }
  return assetsPromise;
}

async function getSettings() {
  const [{ model }, { openaiApiKey }] = await Promise.all([
    chrome.storage.local.get({ model: DEFAULT_MODEL }),
    chrome.storage.session.get("openaiApiKey"),
  ]);
  return {
    model: ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL,
    hasApiKey: Boolean(openaiApiKey),
  };
}

async function saveSettings({ model, apiKey }) {
  if (!ALLOWED_MODELS.has(model)) {
    throw new Error("Choose a supported OpenAI model.");
  }
  await chrome.storage.local.set({ model });

  const normalizedKey = (apiKey || "").trim();
  if (normalizedKey) {
    if (!normalizedKey.startsWith("sk-")) {
      throw new Error("The API key does not look like an OpenAI key.");
    }
    await chrome.storage.session.set({ openaiApiKey: normalizedKey });
  }

  return getSettings();
}

function readOutputText(response) {
  for (const output of response.output || []) {
    if (output.type !== "message") continue;
    for (const content of output.content || []) {
      if (content.type === "refusal") {
        throw new Error(`OpenAI declined the request: ${content.refusal}`);
      }
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  throw new Error("OpenAI returned no structured analysis.");
}

async function analyze(article) {
  if (!article?.paragraphs?.length) {
    throw new Error("No article paragraphs were extracted from this page.");
  }

  const [{ model }, { openaiApiKey }, { systemPrompt, outputSchema }] = await Promise.all([
    chrome.storage.local.get({ model: DEFAULT_MODEL }),
    chrome.storage.session.get("openaiApiKey"),
    loadAssets(),
  ]);

  if (!openaiApiKey) {
    throw new Error("Add an OpenAI API key before analyzing an article.");
  }
  if (!ALLOWED_MODELS.has(model)) {
    throw new Error("The selected model is not supported by this version of LedeLens.");
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: JSON.stringify(article),
      reasoning: { effort: "medium" },
      text: {
        format: {
          type: "json_schema",
          name: "news_structure_analysis",
          strict: true,
          schema: outputSchema,
        },
      },
      store: false,
    }),
  });

  const responseBody = await response.json().catch(() => null);
  if (!response.ok) {
    const message = responseBody?.error?.message || `OpenAI request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }

  let result;
  try {
    result = JSON.parse(readOutputText(responseBody));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("OpenAI returned malformed JSON.");
    }
    throw error;
  }

  const validation = validateAnalysisResult(
    result,
    outputSchema,
    article.paragraphs.map((paragraph) => paragraph.id),
  );
  if (!validation.valid) {
    throw new Error(`The model response failed local validation: ${validation.errors.slice(0, 3).join(" ")}`);
  }

  return result;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "GET_SETTINGS":
        return getSettings();
      case "SAVE_SETTINGS":
        return saveSettings(message.payload || {});
      case "CLEAR_API_KEY":
        await chrome.storage.session.remove("openaiApiKey");
        return getSettings();
      case "ANALYZE":
        return analyze(message.payload?.article);
      default:
        throw new Error("Unknown extension message.");
    }
  })()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "Unexpected extension error." }));

  return true;
});
