import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchAnalysisModels,
  filterAnalysisModels,
  isAnalysisModel,
} from "../src/lib/models.js";

test("recognizes GPT-5 text models suitable for article analysis", () => {
  assert.equal(isAnalysisModel("gpt-5.4"), true);
  assert.equal(isAnalysisModel("gpt-5.6-terra"), true);
  assert.equal(isAnalysisModel("gpt-5-mini"), true);
  assert.equal(isAnalysisModel("gpt-4.1"), false);
  assert.equal(isAnalysisModel(null), false);
  assert.equal(isAnalysisModel("gpt-5-codex"), false);
  assert.equal(isAnalysisModel("gpt-5-realtime-preview"), false);
});

test("filters, deduplicates, and sorts models returned by OpenAI", () => {
  assert.deepEqual(filterAnalysisModels([
    { id: "gpt-5.4" },
    { id: "text-embedding-3-small" },
    { id: "gpt-5.6-terra" },
    { id: "gpt-5.4" },
    null,
  ]), ["gpt-5.6-terra", "gpt-5.4"]);
  assert.deepEqual(filterAnalysisModels(), []);
});

test("loads compatible models using the supplied API key", async () => {
  const models = await fetchAnalysisModels(" sk-test ", async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/models");
    assert.equal(options.headers.Authorization, "Bearer sk-test");
    return new Response(JSON.stringify({
      data: [{ id: "gpt-5.4" }, { id: "whisper-1" }],
    }), { status: 200 });
  });
  assert.deepEqual(models, ["gpt-5.4"]);
});

test("reports missing keys, network failures, API errors, and invalid responses", async () => {
  await assert.rejects(() => fetchAnalysisModels(""), /Enter an OpenAI API key/);
  await assert.rejects(
    () => fetchAnalysisModels("sk-test", async () => {
      throw new TypeError("offline");
    }),
    /could not connect/,
  );
  await assert.rejects(
    () => fetchAnalysisModels("sk-test", async () => new Response("bad", { status: 502 })),
    /unreadable model-list/,
  );
  await assert.rejects(
    () => fetchAnalysisModels("sk-test", async () => new Response(
      JSON.stringify({ error: { message: "Invalid key." } }),
      { status: 401 },
    )),
    /Invalid key/,
  );
  await assert.rejects(
    () => fetchAnalysisModels("sk-test", async () => new Response("{}", { status: 503 })),
    /HTTP 503/,
  );
  await assert.rejects(
    () => fetchAnalysisModels("sk-test", async () => new Response(
      JSON.stringify({ data: [{ id: "whisper-1" }] }),
      { status: 200 },
    )),
    /no GPT-5 models/,
  );
});
