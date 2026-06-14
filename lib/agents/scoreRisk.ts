/**
 * Agent 4 — RiskAssessmentAgent.
 *
 * SK plugin: maps the materialized risks of confident historical matches onto
 * the four risk dimensions (customer, operational, financial, execution),
 * scores each 1–10 with chain-of-thought-style reasoning, and produces an
 * overall risk level. Deterministic + explainable so the demo is reliable.
 */

import type {
  RiskAssessment,
  RiskDimension,
  RiskScore,
  ScoredCandidate,
  Severity,
} from "@/lib/types";

const DIMENSIONS: RiskDimension[] = [
  "customer",
  "operational",
  "financial",
  "execution",
];

const SEVERITY_SCORE: Record<Severity, number> = { high: 9, medium: 6, low: 3 };

function level(score: number): "High" | "Medium" | "Low" {
  if (score >= 7) return "High";
  if (score >= 4) return "Medium";
  return "Low";
}

export function scoreRisk(confident: ScoredCandidate[]): RiskAssessment {
  const dimensions: RiskScore[] = DIMENSIONS.map((dim) => {
    const hits: { sev: Severity; desc: string; weight: number }[] = [];
    for (const c of confident) {
      for (const r of c.record.risksMaterialized) {
        if (r.type === dim) {
          hits.push({
            sev: r.severity,
            desc: r.description,
            weight: c.confidence.confidence,
          });
        }
      }
    }

    if (hits.length === 0) {
      return {
        dimension: dim,
        score: 2,
        level: "Low",
        reasoning: `No comparable ${dim} risk materialized in similar past decisions.`,
      };
    }

    // Score from the worst materialized severity, nudged up by recurrence.
    const maxSev = Math.max(...hits.map((h) => SEVERITY_SCORE[h.sev]));
    const recurrenceBoost = Math.min(1, (hits.length - 1) * 0.5);
    const score = Math.min(10, Math.round(maxSev + recurrenceBoost));
    const worst = hits.find((h) => SEVERITY_SCORE[h.sev] === maxSev)!;

    return {
      dimension: dim,
      score,
      level: level(score),
      reasoning: `${hits.length} similar decision(s) showed ${dim} impact — e.g. "${worst.desc}"`,
    };
  });

  // Overall = the highest dimension score, weighted by negative outcomes.
  const maxScore = Math.max(...dimensions.map((d) => d.score));
  const negativeOutcomes = confident.filter(
    (c) =>
      c.record.outcome.netAssessment === "negative" ||
      c.record.outcome.reversed,
  ).length;
  const overall = level(Math.min(10, maxScore + (negativeOutcomes > 0 ? 1 : 0)));

  const topMatch = confident[0];
  const rationale = topMatch
    ? `Historical patterns suggest elevated risk. The closest precedent "${topMatch.record.title}" resulted in: ${topMatch.record.outcome.summary}`
    : "Insufficient precedent to assess risk.";

  return { overall, dimensions, rationale };
}
