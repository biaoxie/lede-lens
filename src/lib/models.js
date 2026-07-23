export const DEFAULT_MODEL = "gpt-5.6-terra";

export const MODEL_CATALOG = Object.freeze([
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol — highest capability" },
  { id: "gpt-5.6-terra", label: "GPT-5.6 Terra — balanced" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna — fastest" },
  { id: "gpt-5.4", label: "GPT-5.4 — legacy frontier" },
]);

export const ALLOWED_MODELS = new Set(MODEL_CATALOG.map((model) => model.id));
