const OPENAI_MODELS_ENDPOINT = "https://api.openai.com/v1/models";
const UNSUITABLE_MODEL_MARKERS = [
  "audio",
  "codex",
  "image",
  "realtime",
  "search",
  "transcribe",
  "tts",
];

export function isAnalysisModel(modelId) {
  if (typeof modelId !== "string" || !/^gpt-5(?:[.-]|$)/.test(modelId)) return false;
  return !UNSUITABLE_MODEL_MARKERS.some((marker) => modelId.includes(marker));
}

export function filterAnalysisModels(models) {
  return [...new Set(
    (models || [])
      .map((model) => model?.id)
      .filter(isAnalysisModel),
  )].sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
}

export async function fetchAnalysisModels(apiKey, fetchImpl = fetch) {
  const normalizedKey = (apiKey || "").trim();
  if (!normalizedKey) throw new Error("Enter an OpenAI API key to load models.");

  let response;
  try {
    response = await fetchImpl(OPENAI_MODELS_ENDPOINT, {
      headers: { Authorization: `Bearer ${normalizedKey}` },
    });
  } catch (error) {
    throw new Error("LedeLens could not connect to OpenAI to load models.", { cause: error });
  }

  let body;
  try {
    body = await response.json();
  } catch (error) {
    throw new Error("OpenAI returned an unreadable model-list response.", { cause: error });
  }

  if (!response.ok) {
    throw new Error(body?.error?.message || `OpenAI model listing failed with HTTP ${response.status}.`);
  }

  const models = filterAnalysisModels(body?.data);
  if (!models.length) {
    throw new Error("This OpenAI project returned no GPT-5 models suitable for LedeLens.");
  }
  return models;
}
