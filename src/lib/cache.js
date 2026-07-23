export const ANALYSIS_SCHEMA_VERSION = "0.2.0";
export const MAX_CACHED_ANALYSES = 30;

export function normalizeArticleUrl(value) {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function fingerprintArticle(article) {
  const content = [
    article?.title || "",
    ...(article?.paragraphs || []).map((paragraph) => paragraph.text || ""),
  ].join("\n");

  let hash = 2166136261;
  for (let index = 0; index < content.length; index += 1) {
    hash ^= content.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${content.length}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function findCachedAnalysis(entries, url, fingerprint) {
  const normalizedUrl = normalizeArticleUrl(url);
  if (!normalizedUrl || !fingerprint) return null;
  return (entries || []).find((entry) => (
    entry?.url === normalizedUrl
    && entry.fingerprint === fingerprint
    && entry.schemaVersion === ANALYSIS_SCHEMA_VERSION
    && entry.result
  )) || null;
}

export function upsertCachedAnalysis(entries, {
  url,
  fingerprint,
  result,
  savedAt = Date.now(),
}, limit = MAX_CACHED_ANALYSES) {
  const normalizedUrl = normalizeArticleUrl(url);
  if (!normalizedUrl || !fingerprint || !result) {
    throw new Error("A valid article URL, fingerprint, and result are required.");
  }

  const nextEntry = {
    url: normalizedUrl,
    fingerprint,
    schemaVersion: ANALYSIS_SCHEMA_VERSION,
    savedAt,
    result,
  };
  return [
    nextEntry,
    ...(entries || []).filter((entry) => (
      entry?.url !== normalizedUrl || entry.fingerprint !== fingerprint
    )),
  ]
    .sort((left, right) => right.savedAt - left.savedAt)
    .slice(0, limit);
}

export function removeCachedAnalysis(entries, url, fingerprint, savedAt = null) {
  const normalizedUrl = normalizeArticleUrl(url);
  if (!normalizedUrl || !fingerprint) return [...(entries || [])];
  return (entries || []).filter((entry) => (
    entry?.url !== normalizedUrl
    || entry.fingerprint !== fingerprint
    || (savedAt !== null && entry.savedAt !== savedAt)
  ));
}
