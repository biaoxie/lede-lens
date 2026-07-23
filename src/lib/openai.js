import { ALLOWED_MODELS, DEFAULT_MODEL } from "./models.js";
import { validateAnalysisResult } from "./validator.js";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

let assetsPromise;

async function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      fetch(chrome.runtime.getURL("skills/analyze-news-structure/assets/system-prompt.md"))
        .then((response) => response.text()),
      fetch(chrome.runtime.getURL("skills/analyze-news-structure/assets/output-schema.json"))
        .then((response) => response.json()),
    ]).then(([systemPrompt, outputSchema]) => ({ systemPrompt, outputSchema }));
  }
  return assetsPromise;
}

export function readOutputText(response) {
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

export function withRequestReference(message, requestId) {
  return requestId ? `${message} Request ID: ${requestId}.` : message;
}

export async function analyzeArticle(article, onProgress = () => {}) {
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

  const clientRequestId = crypto.randomUUID();
  onProgress({ type: "request_sent", clientRequestId, model });

  let response;
  try {
    response = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": clientRequestId,
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
  } catch (error) {
    throw new Error(withRequestReference(
      "The network connection ended before LedeLens received OpenAI's response.",
      clientRequestId,
    ), { cause: error });
  }

  const serverRequestId = response.headers.get("x-request-id");
  const requestId = serverRequestId || clientRequestId;
  onProgress({ type: "response_received", requestId });

  const responseText = await response.text();
  let responseBody = null;
  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    throw new Error(withRequestReference("OpenAI returned an unreadable response.", requestId));
  }

  if (!response.ok) {
    const message = responseBody?.error?.message || `OpenAI request failed with HTTP ${response.status}.`;
    throw new Error(withRequestReference(message, requestId));
  }

  let result;
  try {
    result = JSON.parse(readOutputText(responseBody));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(withRequestReference("OpenAI returned malformed JSON.", requestId));
    }
    throw new Error(withRequestReference(error.message, requestId), { cause: error });
  }

  onProgress({ type: "validating", requestId });
  const validation = validateAnalysisResult(
    result,
    outputSchema,
    article.paragraphs.map((paragraph) => paragraph.id),
  );
  if (!validation.valid) {
    const message = `The model response failed local validation: ${validation.errors.slice(0, 3).join(" ")}`;
    throw new Error(withRequestReference(message, requestId));
  }

  return { result, requestId };
}
