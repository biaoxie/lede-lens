export function validateModelSelection({
  model,
  resolvedApiKey,
  listedApiKey,
  availableModels,
} = {}) {
  if (!resolvedApiKey || resolvedApiKey !== listedApiKey) {
    throw new Error("This API key has not loaded the current model list. Load models again, then choose a model.");
  }
  if (!(availableModels || []).includes(model)) {
    throw new Error("Load the model list, then choose a model returned for this OpenAI API key.");
  }
}
