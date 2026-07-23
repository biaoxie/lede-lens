import { ALLOWED_MODELS, DEFAULT_MODEL } from "./lib/models.js";

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
      default:
        throw new Error("Unknown extension message.");
    }
  })()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "Unexpected extension error." }));

  return true;
});
