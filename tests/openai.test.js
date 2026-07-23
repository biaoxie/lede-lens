import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { analyzeArticle, parseSseBuffer, readOutputText, withRequestReference } from "../src/lib/openai.js";

const schema = JSON.parse(
  await readFile(new URL("../skills/analyze-news-structure/assets/output-schema.json", import.meta.url), "utf8"),
);
const fixture = JSON.parse(
  await readFile(new URL("./fixtures/analysis-result-0.2.0.json", import.meta.url), "utf8"),
);
const article = {
  title: "Coverage fixture",
  url: "https://example.com/story?private=token",
  paragraphs: Array.from({ length: 33 }, (_, index) => ({
    id: `p${index + 1}`,
    text: `Paragraph ${index + 1}`,
  })),
};
const originalChrome = globalThis.chrome;
const originalFetch = globalThis.fetch;
let storedModel = "gpt-5.6-terra";
let storedKey = "sk-test";

globalThis.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://test/${path}`,
  },
  storage: {
    local: {
      get: async () => ({ model: storedModel }),
    },
    session: {
      get: async () => ({ openaiApiKey: storedKey }),
    },
  },
};

test.after(() => {
  globalThis.chrome = originalChrome;
  globalThis.fetch = originalFetch;
});

function streamResponse(events, headers = { "x-request-id": "req_test" }) {
  const body = `${events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}data: [DONE]\n\n`;
  return new Response(body, { status: 200, headers });
}

function installFetch(apiResponse) {
  globalThis.fetch = async (url, options) => {
    const target = String(url);
    if (target.endsWith("system-prompt.md")) {
      return new Response("System prompt");
    }
    if (target.endsWith("output-schema.json")) {
      return new Response(JSON.stringify(schema), {
        headers: { "Content-Type": "application/json" },
      });
    }
    assert.equal(target, "https://api.openai.com/v1/responses");
    assert.equal(options.method, "POST");
    assert.match(options.headers.Authorization, /^Bearer sk-/);
    assert.ok(options.headers["X-Client-Request-Id"]);
    const request = JSON.parse(options.body);
    assert.equal(request.stream, true);
    assert.equal("reasoning" in request, false);
    assert.equal(request.text.verbosity, "low");
    const providerArticle = JSON.parse(request.input);
    assert.equal(providerArticle.title, article.title);
    assert.equal("url" in providerArticle, false);
    if (apiResponse instanceof Error) throw apiResponse;
    return typeof apiResponse === "function" ? apiResponse(options) : apiResponse;
  };
}

test("reads structured output text from a Responses API body", () => {
  const text = readOutputText({
    output: [{
      type: "message",
      content: [{ type: "output_text", text: "{\"ok\":true}" }],
    }],
  });
  assert.equal(text, "{\"ok\":true}");
});

test("surfaces a model refusal", () => {
  assert.throws(
    () => readOutputText({
      output: [{
        type: "message",
        content: [{ type: "refusal", refusal: "Cannot comply." }],
      }],
    }),
    /OpenAI declined the request/,
  );
});

test("rejects a Responses body without output text", () => {
  assert.throws(
    () => readOutputText({ output: [{ type: "reasoning" }, { type: "message", content: [] }] }),
    /no structured analysis/,
  );
  assert.throws(() => readOutputText({}), /no structured analysis/);
  assert.throws(
    () => readOutputText({ output: [{ type: "message" }] }),
    /no structured analysis/,
  );
  assert.throws(
    () => readOutputText({
      output: [{
        type: "message",
        content: [{ type: "output_text", text: "" }],
      }],
    }),
    /no structured analysis/,
  );
});

test("adds a traceable request ID to an error", () => {
  assert.equal(
    withRequestReference("Network failed.", "request-123"),
    "Network failed. Request ID: request-123.",
  );
  assert.equal(withRequestReference("Network failed."), "Network failed.");
});

test("parses complete Responses API streaming events and preserves a partial event", () => {
  const parsed = parseSseBuffer([
    "event: response.created",
    'data: {"type":"response.created","response":{"id":"resp_123"}}',
    "",
    "event: response.output_text.delta",
    'data: {"type":"response.output_text.delta","delta":"{\\"schema',
  ].join("\n"));

  assert.deepEqual(parsed.events, [{
    type: "response.created",
    response: { id: "resp_123" },
  }]);
  assert.match(parsed.remaining, /response\.output_text\.delta/);
});

test("ignores SSE keepalives and done markers", () => {
  const parsed = parseSseBuffer(": keepalive\n\ndata: [DONE]\n\n");
  assert.deepEqual(parsed.events, []);
  assert.equal(parsed.remaining, "");
});

test("parses multiline SSE data fields", () => {
  const parsed = parseSseBuffer('data: {"type":"response.created",\ndata: "response":{"id":"resp_1"}}\r\n\r\n');
  assert.equal(parsed.events[0].response.id, "resp_1");
  assert.throws(() => parseSseBuffer("data: not-json\n\n"), SyntaxError);
});

test("streams, validates, and returns a complete analysis", async () => {
  const progress = [];
  installFetch(streamResponse([
    { type: "response.created", response: { id: "resp_1" } },
    { type: "response.output_text.delta", delta: JSON.stringify(fixture) },
    {
      type: "response.completed",
      response: {
        id: "resp_1",
        output: [],
        usage: {
          output_tokens: 900,
          output_tokens_details: { reasoning_tokens: 120 },
        },
      },
    },
  ]));

  const completed = await analyzeArticle(article, (event) => progress.push(event.type));
  assert.deepEqual(completed.result, fixture);
  assert.equal(completed.requestId, "req_test");
  assert.ok(progress.includes("request_sent"));
  assert.ok(progress.includes("response_started"));
  assert.ok(progress.includes("stream_event"));
  assert.ok(progress.includes("first_output"));
  assert.ok(progress.includes("validating"));
  assert.equal(completed.diagnostics.usage.output_tokens_details.reasoning_tokens, 120);
  assert.ok(completed.diagnostics.timeToFirstOutputMs >= 0);
  assert.ok(completed.diagnostics.totalMs >= 0);
});

test("falls back to completed response output when no deltas arrive", async () => {
  installFetch(streamResponse([
    {
      type: "response.completed",
      response: {
        id: "resp_2",
        output: [{
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(fixture) }],
        }],
      },
    },
  ], {}));

  const completed = await analyzeArticle(article);
  assert.deepEqual(completed.result, fixture);
  assert.match(completed.requestId, /^[0-9a-f-]{36}$/);
});

test("rejects missing articles, keys, and unsupported models", async () => {
  await assert.rejects(() => analyzeArticle(), /No article paragraphs/);
  await assert.rejects(() => analyzeArticle({}), /No article paragraphs/);
  await assert.rejects(() => analyzeArticle({ paragraphs: [] }), /No article paragraphs/);

  storedKey = "";
  await assert.rejects(() => analyzeArticle(article), /Add an OpenAI API key/);
  storedKey = "sk-test";

  storedModel = "unsupported";
  await assert.rejects(() => analyzeArticle(article), /Load the models available/);
  storedModel = "gpt-5.6-terra";
});

test("reports network failures with a client request ID", async () => {
  installFetch(new TypeError("Failed to fetch"));
  await assert.rejects(
    () => analyzeArticle(article),
    /network connection ended.*Request ID: [0-9a-f-]{36}/i,
  );
});

test("passes AbortSignal to fetch and preserves cancellation as a distinct state", async () => {
  const controller = new AbortController();
  let observedSignal;
  installFetch((options) => {
    observedSignal = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    });
  });

  const pending = analyzeArticle(article, () => {}, { signal: controller.signal });
  await new Promise((resolve) => setTimeout(resolve, 0));
  controller.abort("page_changed");
  await assert.rejects(pending, (error) => {
    assert.equal(error.category, "cancelled");
    assert.equal(error.details.reason, "page_changed");
    assert.match(error.details.requestId, /^[0-9a-f-]{36}$/);
    return true;
  });
  assert.equal(observedSignal, controller.signal);
});

test("surfaces JSON and non-JSON HTTP errors", async () => {
  installFetch(new Response(JSON.stringify({ error: { message: "Rate limited." } }), {
    status: 429,
    headers: { "x-request-id": "req_rate" },
  }));
  await assert.rejects(() => analyzeArticle(article), /Rate limited.*req_rate/);

  installFetch(new Response("<html>bad gateway</html>", {
    status: 502,
    headers: { "x-request-id": "req_gateway" },
  }));
  await assert.rejects(() => analyzeArticle(article), /unreadable error response.*req_gateway/i);

  installFetch(new Response("{}", {
    status: 503,
    headers: { "x-request-id": "req_status" },
  }));
  await assert.rejects(() => analyzeArticle(article), /HTTP 503.*req_status/);

  installFetch(new Response(null, {
    status: 500,
    headers: { "x-request-id": "req_empty_error" },
  }));
  await assert.rejects(() => analyzeArticle(article), /HTTP 500.*req_empty_error/);
});

test("surfaces streaming failure, incomplete, and error events", async () => {
  installFetch(streamResponse([
    { type: "response.failed", response: { error: { message: "Model failed." } } },
  ]));
  await assert.rejects(() => analyzeArticle(article), /Model failed.*req_test/);

  installFetch(streamResponse([
    { type: "response.incomplete", response: { incomplete_details: { reason: "max_output_tokens" } } },
  ]));
  await assert.rejects(() => analyzeArticle(article), /max_output_tokens.*req_test/);

  installFetch(streamResponse([
    { type: "response.failed", response: {} },
  ]));
  await assert.rejects(() => analyzeArticle(article), /could not complete.*req_test/i);

  installFetch(streamResponse([
    { type: "error", message: "Stream error." },
  ]));
  await assert.rejects(() => analyzeArticle(article), /Stream error.*req_test/);

  installFetch(streamResponse([
    { type: "error", error: { message: "Nested stream error." } },
  ]));
  await assert.rejects(() => analyzeArticle(article), /Nested stream error.*req_test/);

  installFetch(streamResponse([
    { type: "error" },
  ]));
  await assert.rejects(() => analyzeArticle(article), /streaming error.*req_test/i);
});

test("rejects empty and prematurely closed streams", async () => {
  installFetch(new Response(null, {
    status: 200,
    headers: { "x-request-id": "req_empty" },
  }));
  await assert.rejects(() => analyzeArticle(article), /empty response stream.*req_empty/i);

  installFetch(streamResponse([
    { type: "response.created", response: { id: "resp_unfinished" } },
  ]));
  await assert.rejects(() => analyzeArticle(article), /closed the response stream.*req_test/i);
});

test("consumes a final SSE event without a trailing event boundary", async () => {
  const finalEvent = {
    type: "response.completed",
    response: {
      id: "resp_final",
      output: [{
        type: "message",
        content: [{ type: "output_text", text: JSON.stringify(fixture) }],
      }],
    },
  };
  installFetch(new Response(`data: ${JSON.stringify(finalEvent)}`, {
    status: 200,
    headers: { "x-request-id": "req_final" },
  }));
  const completed = await analyzeArticle(article);
  assert.deepEqual(completed.result, fixture);
});

test("rejects malformed and schema-invalid streamed output", async () => {
  installFetch(streamResponse([
    { type: "response.output_text.delta", delta: "not json" },
    { type: "response.completed", response: { id: "resp_bad_json", output: [] } },
  ]));
  await assert.rejects(() => analyzeArticle(article), /malformed JSON.*req_test/i);

  installFetch(streamResponse([
    { type: "response.output_text.delta", delta: JSON.stringify({ schema_version: "0.2.0" }) },
    { type: "response.completed", response: { id: "resp_bad_schema", output: [] } },
  ]));
  await assert.rejects(() => analyzeArticle(article), /failed local validation.*req_test/i);
});
