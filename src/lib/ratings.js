export const EVIDENCE_RATINGS = Object.freeze([
  {
    value: "structurally_solid",
    label: "Structurally solid",
    tone: "strong",
    explanation: "The article's main takeaway is well supported by material presented within the article.",
    summary: "The article's main takeaway is well supported within the article.",
  },
  {
    value: "mostly_supported",
    label: "Mostly supported",
    tone: "positive",
    explanation: "The article gives reasonable internal support for its main takeaway, with some important limits.",
    summary: "The article gives reasonable internal support for its main takeaway, with some limits.",
  },
  {
    value: "evidence_limited",
    label: "Evidence limited",
    tone: "caution",
    explanation: "The article's main takeaway goes beyond what its own evidence can firmly support.",
    summary: "The article's main takeaway goes beyond its internal support.",
  },
  {
    value: "severely_under_supported",
    label: "Severely under-supported",
    tone: "critical",
    explanation: "The article provides little internal support for a major takeaway.",
    summary: "The article provides little internal support for a major takeaway.",
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
