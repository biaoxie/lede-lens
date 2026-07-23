export const EVIDENCE_RATINGS = Object.freeze([
  {
    value: "structurally_solid",
    label: "Structurally solid",
    tone: "strong",
    explanation: "Important conclusions are consistently supported by relevant evidence inside the article.",
    summary: "The article's main conclusions are well supported by its own evidence.",
  },
  {
    value: "mostly_supported",
    label: "Mostly supported",
    tone: "positive",
    explanation: "The main conclusions generally follow from the article, with some gaps or qualifications.",
    summary: "The article is generally well supported, with some gaps or qualifications.",
  },
  {
    value: "evidence_limited",
    label: "Evidence limited",
    tone: "caution",
    explanation: "Several important conclusions lack enough article-internal support or necessary context.",
    summary: "The article's conclusions rely on limited internal support.",
  },
  {
    value: "severely_under_supported",
    label: "Severely under-supported",
    tone: "critical",
    explanation: "The central conclusions substantially outrun the evidence presented in the article.",
    summary: "The article's central conclusions substantially outrun its evidence.",
  },
]);

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
