export const EVIDENCE_RATINGS = Object.freeze([
  {
    value: "structurally_solid",
    label: "Well supported",
    tone: "strong",
    explanation: "The article presents strong support for its main takeaway.",
    summary: "The article presents strong support for its main takeaway.",
  },
  {
    value: "mostly_supported",
    label: "Mostly supported",
    tone: "positive",
    explanation: "The article presents reasonable support for its main takeaway, with some important limits.",
    summary: "The article presents reasonable support for its main takeaway, with some important limits.",
  },
  {
    value: "evidence_limited",
    label: "Limited support",
    tone: "caution",
    explanation: "The article's main takeaway goes beyond the support it presents.",
    summary: "The article's main takeaway goes beyond the support it presents.",
  },
  {
    value: "severely_under_supported",
    label: "Very little support",
    tone: "critical",
    explanation: "The article presents very little support for a major takeaway.",
    summary: "The article presents very little support for a major takeaway.",
  },
]);

export const METRIC_STATUS_LABELS = Object.freeze({
  evidence_coverage: Object.freeze({
    present: "Strong support",
    partial: "Some support",
    missing: "Little or no support",
    not_applicable: "Not applicable",
  }),
  source_traceability: Object.freeze({
    present: "Clear",
    partial: "Partly clear",
    missing: "Unclear",
    not_applicable: "Not applicable",
  }),
  causal_support: Object.freeze({
    present: "Supported",
    partial: "Partly supported",
    missing: "Not supported",
    not_applicable: "No cause-and-effect claim",
  }),
  context_completeness: Object.freeze({
    present: "Enough context",
    partial: "Some important gaps",
    missing: "Major gaps",
    not_applicable: "Not applicable",
  }),
  framing_uncertainty_separation: Object.freeze({
    present: "Clearly distinguished",
    partial: "Sometimes blurred",
    missing: "Often blurred",
    not_applicable: "Not applicable",
  }),
});

export const PRESENTATION_RATINGS = Object.freeze([
  {
    value: "restrained",
    label: "Restrained",
    tone: "strong",
    explanation: "Reporting, interpretation, and uncertainty are mostly kept separate, with limited loaded framing.",
  },
  {
    value: "interpretive",
    label: "Interpretive",
    tone: "positive",
    explanation: "The article adds interpretation, but attribution and uncertainty generally remain visible.",
  },
  {
    value: "framing_heavy",
    label: "Framing heavy",
    tone: "caution",
    explanation: "Selective emphasis or loaded framing plays a substantial role in how the material is presented.",
  },
  {
    value: "manipulation_risk_signals",
    label: "Manipulation risk signals",
    tone: "critical",
    explanation: "The text repeatedly shows loaded framing, blurred attribution, or inflated certainty; this does not infer intent.",
  },
]);

export function findRating(ratings, value) {
  const rating = ratings.find((candidate) => candidate.value === value);
  if (!rating) throw new Error(`Unknown assessment rating: ${value}`);
  return rating;
}

export function findMetricStatusLabel(metric, status) {
  const label = METRIC_STATUS_LABELS[metric]?.[status];
  if (!label) throw new Error(`Unknown metric status: ${metric}.${status}`);
  return label;
}
