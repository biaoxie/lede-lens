import { isAnalysisModel } from "./models.js";
import { validateAnalysisResult } from "./validator.js";
import {
  ERROR_CATEGORIES,
  analysisError,
  isAbortError,
} from "./analysis-flow.js";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

let assetsPromise;

function cancelledRequest(signal, requestId, cause) {
  return analysisError(
    ERROR_CATEGORIES.CANCELLED,
    "The analysis request was cancelled.",
    { reason: signal?.reason || "user_cancelled", requestId },
    cause,
  );
}

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

export function parseSseBuffer(buffer) {
  const events = [];
  let remaining = buffer;

  while (true) {
    const boundary = remaining.match(/\r?\n\r?\n/);
    if (!boundary?.index && boundary?.index !== 0) break;

    const block = remaining.slice(0, boundary.index);
    remaining = remaining.slice(boundary.index + boundary[0].length);
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data || data === "[DONE]") continue;
    events.push(JSON.parse(data));
  }

  return { events, remaining };
}

async function readResponseStream(response, onProgress, requestStartedAt) {
  if (!response.body) throw new Error("OpenAI returned an empty response stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let outputText = "";
  let completedResponse = null;
  let firstOutputAt = null;
  const requestId = response.headers.get("x-request-id");

  const consume = (events) => {
    for (const event of events) {
      onProgress({ type: "stream_event", eventType: event.type, responseId: event.response?.id });

      if (event.type === "response.output_text.delta") {
        if (!firstOutputAt) {
          firstOutputAt = Date.now();
          onProgress({ type: "first_output", elapsedMs: firstOutputAt - requestStartedAt });
        }
        outputText += event.delta || "";
      } else if (event.type === "response.completed") {
        completedResponse = event.response;
      } else if (event.type === "response.failed" || event.type === "response.incomplete") {
        const message = event.response?.error?.message
          || event.response?.incomplete_details?.reason
          || "OpenAI could not complete the analysis.";
        throw new Error(message);
      } else if (event.type === "error") {
        throw new Error(event.message || event.error?.message || "OpenAI returned a streaming error.");
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.remaining;
    consume(parsed.events);
    if (done) break;
  }

  if (buffer.trim()) {
    consume(parseSseBuffer(`${buffer}\n\n`).events);
  }
  if (!completedResponse) {
    throw new Error("OpenAI closed the response stream before completing the analysis.");
  }
  return {
    outputText: outputText || readOutputText(completedResponse),
    requestId,
    diagnostics: {
      timeToFirstOutputMs: firstOutputAt ? firstOutputAt - requestStartedAt : null,
      totalMs: Date.now() - requestStartedAt,
      usage: completedResponse.usage || null,
    },
  };
}

export async function analyzeArticle(article, onProgress = () => {}, { signal } = {}) {
  if (!article?.paragraphs?.length) {
    throw new Error("No article paragraphs were extracted from this page.");
  }

  const [{ model }, { openaiApiKey }, { systemPrompt, outputSchema }] = await Promise.all([
    chrome.storage.local.get("model"),
    chrome.storage.session.get("openaiApiKey"),
    loadAssets(),
  ]);

  if (!openaiApiKey) {
    throw new Error("Add an OpenAI API key before analyzing an article.");
  }
  if (!isAnalysisModel(model)) {
    throw new Error("Load the models available to your API key, then choose and confirm one.");
  }

  const clientRequestId = crypto.randomUUID();
  const requestStartedAt = Date.now();
  const { url: _localPageUrl, ...providerArticle } = article;
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
        input: JSON.stringify(providerArticle),
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "news_structure_analysis",
            strict: true,
            schema: outputSchema,
          },
        },
        store: false,
        stream: true,
      }),
      signal,
    });
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw cancelledRequest(signal, clientRequestId, error);
    }
    throw analysisError(
      ERROR_CATEGORIES.NETWORK,
      withRequestReference(
        "The network connection ended before LedeLens received OpenAI's response.",
        clientRequestId,
      ),
      { requestId: clientRequestId },
      error,
    );
  }

  const requestId = response.headers.get("x-request-id") || clientRequestId;
  if (!response.ok) {
    const responseText = await response.text();
    let responseBody = null;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      throw analysisError(
        ERROR_CATEGORIES.UNKNOWN,
        withRequestReference("OpenAI returned an unreadable error response.", requestId),
        { requestId, status: response.status },
      );
    }
    const message = responseBody?.error?.message || `OpenAI request failed with HTTP ${response.status}.`;
    const errorCode = responseBody?.error?.code;
    let category = ERROR_CATEGORIES.UNKNOWN;
    if (response.status === 401 || response.status === 403) category = ERROR_CATEGORIES.INVALID_KEY;
    else if (response.status === 402 || errorCode === "insufficient_quota") category = ERROR_CATEGORIES.BILLING;
    else if (response.status === 429) category = ERROR_CATEGORIES.RATE_LIMIT;
    throw analysisError(
      category,
      withRequestReference(message, requestId),
      { requestId, status: response.status, errorCode },
    );
  }

  onProgress({ type: "response_started", requestId });
  let streamed;
  try {
    streamed = await readResponseStream(response, onProgress, requestStartedAt);
  } catch (error) {
    if (isAbortError(error, signal)) {
      throw cancelledRequest(signal, requestId, error);
    }
    const category = error instanceof TypeError || /network|connection|terminated|fetch/i.test(error.message)
      ? ERROR_CATEGORIES.NETWORK
      : ERROR_CATEGORIES.INVALID_OUTPUT;
    throw analysisError(
      category,
      withRequestReference(error.message, requestId),
      { requestId },
      error,
    );
  }

  let result;
  try {
    result = JSON.parse(streamed.outputText);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw analysisError(
        ERROR_CATEGORIES.INVALID_OUTPUT,
        withRequestReference("OpenAI returned malformed JSON.", streamed.requestId || requestId),
        { requestId: streamed.requestId || requestId },
      );
    }
    throw new Error(withRequestReference(error.message, streamed.requestId || requestId), { cause: error });
  }

  const finalRequestId = streamed.requestId || requestId;
  onProgress({ type: "validating", requestId: finalRequestId });
  const validation = validateAnalysisResult(
    result,
    outputSchema,
    article.paragraphs.map((paragraph) => paragraph.id),
  );
  if (!validation.valid) {
    const message = `The model response failed local validation: ${validation.errors.slice(0, 3).join(" ")}`;
    throw analysisError(
      ERROR_CATEGORIES.INVALID_OUTPUT,
      withRequestReference(message, finalRequestId),
      { requestId: finalRequestId },
    );
  }

  return { result, requestId: finalRequestId, diagnostics: streamed.diagnostics };
}
