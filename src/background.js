import { fetchAnalysisModels, isAnalysisModel } from "./lib/models.js";
import {
  findCachedAnalysis,
  removeCachedAnalysis,
  upsertCachedAnalysis,
} from "./lib/cache.js";
import { validateModelSelection } from "./lib/settings.js";

const ANALYSIS_CACHE_KEY = "analysisCache";
const AVAILABLE_MODELS_KEY = "availableAnalysisModels";
const CONFIRMED_MODEL_KEY = "confirmedAnalysisModel";

function configureActionBehavior() {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
}

configureActionBehavior().catch(() => {});
chrome.runtime.onInstalled.addListener(() => configureActionBehavior().catch(() => {}));
chrome.runtime.onStartup.addListener(() => configureActionBehavior().catch(() => {}));

chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.sidePanel.open({ tabId: tab.id })
    .then(() => chrome.runtime.sendMessage({ type: "PAGE_ACCESS_GRANTED", tabId: tab.id }).catch(() => {}))
    .catch(() => {});
});

async function getSettings() {
  const [{ model = null }, { openaiApiKey, [CONFIRMED_MODEL_KEY]: confirmedModel }] = await Promise.all([
    chrome.storage.local.get("model"),
    chrome.storage.session.get(["openaiApiKey", CONFIRMED_MODEL_KEY]),
  ]);
  return {
    model: isAnalysisModel(model) && model === confirmedModel ? model : null,
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
  const models = await fetchAnalysisModels(resolvedKey);
  await chrome.storage.session.set({
    openaiApiKey: resolvedKey,
    [AVAILABLE_MODELS_KEY]: models,
  });
  await chrome.storage.session.remove(CONFIRMED_MODEL_KEY);
  return {
    models,
  };
}

async function saveSettings({ model, apiKey }) {
  const resolvedKey = await resolveApiKey(apiKey);
  const {
    openaiApiKey: listedApiKey,
    [AVAILABLE_MODELS_KEY]: models = [],
  } = await chrome.storage.session.get({
    openaiApiKey: null,
    [AVAILABLE_MODELS_KEY]: [],
  });
  validateModelSelection({
    model,
    resolvedApiKey: resolvedKey,
    listedApiKey,
    availableModels: models,
  });

  await Promise.all([
    chrome.storage.local.set({ model }),
    chrome.storage.session.set({
      openaiApiKey: resolvedKey,
      [CONFIRMED_MODEL_KEY]: model,
    }),
  ]);
  return getSettings();
}

async function getCachedAnalysis({ url, fingerprint } = {}) {
  const { [ANALYSIS_CACHE_KEY]: entries = [] } = await chrome.storage.local.get({
    [ANALYSIS_CACHE_KEY]: [],
  });
  const entry = findCachedAnalysis(entries, url, fingerprint);
  return entry
    ? { hit: true, result: entry.result, savedAt: entry.savedAt }
    : { hit: false };
}

async function saveCachedAnalysis({ url, fingerprint, result } = {}) {
  const { [ANALYSIS_CACHE_KEY]: entries = [] } = await chrome.storage.local.get({
    [ANALYSIS_CACHE_KEY]: [],
  });
  const savedAt = Date.now();
  const nextEntries = upsertCachedAnalysis(entries, {
    url,
    fingerprint,
    result,
    savedAt,
  });
  await chrome.storage.local.set({ [ANALYSIS_CACHE_KEY]: nextEntries });
  return { saved: true, savedAt };
}

async function removeCachedAnalysisEntry({ url, fingerprint, savedAt } = {}) {
  const { [ANALYSIS_CACHE_KEY]: entries = [] } = await chrome.storage.local.get({
    [ANALYSIS_CACHE_KEY]: [],
  });
  await chrome.storage.local.set({
    [ANALYSIS_CACHE_KEY]: removeCachedAnalysis(entries, url, fingerprint, savedAt),
  });
  return { removed: true };
}

async function getDataStatus() {
  const { [ANALYSIS_CACHE_KEY]: entries = [] } = await chrome.storage.local.get({
    [ANALYSIS_CACHE_KEY]: [],
  });
  return { savedReportCount: entries.length };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PAGE_ACCESS_GRANTED") return false;

  (async () => {
    switch (message?.type) {
      case "GET_SETTINGS":
        return getSettings();
      case "LIST_MODELS":
        return listModels(message.payload || {});
      case "SAVE_SETTINGS":
        return saveSettings(message.payload || {});
      case "GET_CACHED_ANALYSIS":
        return getCachedAnalysis(message.payload || {});
      case "SAVE_CACHED_ANALYSIS":
        return saveCachedAnalysis(message.payload || {});
      case "REMOVE_CACHED_ANALYSIS":
        return removeCachedAnalysisEntry(message.payload || {});
      case "GET_DATA_STATUS":
        return getDataStatus();
      case "CLEAR_ANALYSIS_CACHE":
        {
          const { savedReportCount } = await getDataStatus();
          await chrome.storage.local.remove(ANALYSIS_CACHE_KEY);
          return { cleared: true, deletedCount: savedReportCount };
        }
      case "CLEAR_API_KEY":
        await chrome.storage.session.remove([
          "openaiApiKey",
          AVAILABLE_MODELS_KEY,
          CONFIRMED_MODEL_KEY,
        ]);
        return getSettings();
      default:
        throw new Error("Unknown extension message.");
    }
  })()
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({ ok: false, error: error.message || "Unexpected extension error." }));

  return true;
});
