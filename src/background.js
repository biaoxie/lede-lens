import { fetchAnalysisModels, isAnalysisModel } from "./lib/models.js";

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

async function getSettings() {
  const [{ model = null }, { openaiApiKey }] = await Promise.all([
    chrome.storage.local.get("model"),
    chrome.storage.session.get("openaiApiKey"),
  ]);
  return {
    model: isAnalysisModel(model) ? model : null,
    hasApiKey: Boolean(openaiApiKey),
  };
}

async function resolveApiKey(apiKey) {
  const providedKey = (apiKey || "").trim();
  if (providedKey) return providedKey;
  const { openaiApiKey } = await chrome.storage.session.get("openaiApiKey");
  if (!openaiApiKey) throw new Error("Enter an OpenAI API key to load models.");
  return openaiApiKey;
}

async function listModels({ apiKey } = {}) {
  const resolvedKey = await resolveApiKey(apiKey);
  return {
    models: await fetchAnalysisModels(resolvedKey),
  };
}

async function saveSettings({ model, apiKey }) {
  const resolvedKey = await resolveApiKey(apiKey);
  const models = await fetchAnalysisModels(resolvedKey);
  if (!models.includes(model)) {
    throw new Error("Choose a model returned for this OpenAI API key.");
  }

  await Promise.all([
    chrome.storage.local.set({ model }),
    chrome.storage.session.set({ openaiApiKey: resolvedKey }),
  ]);
  return getSettings();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "GET_SETTINGS":
        return getSettings();
      case "LIST_MODELS":
        return listModels(message.payload || {});
      case "SAVE_SETTINGS":
        return saveSettings(message.payload || {});
      case "CLEAR_API_KEY":
        await chrome.storage.session.remove("openaiApiKey");
        return getSettings();
      default:
        throw new Error("Unknown extension message.");
    }
  })()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "Unexpected extension error." }));

  return true;
});
