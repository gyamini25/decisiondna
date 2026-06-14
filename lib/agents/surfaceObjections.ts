/**
 * Agent 5 — ObjectionAnalysisAgent ("Who Was Right?").
 *
 * The flagship feature: for each confident historical match, surface who
 * objected, what they predicted, what actually happened, and a verdict — so the
 * organization can see which stakeholders' foresight proved correct.
 */

import type {
  ObjectionResult,
  ScoredCandidate,
  WhoWasRightCard,
} from "@/lib/types";

function verdict(result: ObjectionResult): WhoWasRightCard["verdict"] {
  switch (result) {
    case "validated":
    case "partially-validated":
      return "Concern Validated";
    case "recommendation-proven":
      return "Recommendation Proven";
    case "mitigated":
      return "Mitigated";
    case "not-validated":
      return "Incorrect";
  }
}

/** Rank verdicts so the strongest "who was right" signals surface first. */
const VERDICT_ORDER: Record<WhoWasRightCard["verdict"], number> = {
  "Concern Validated": 0,
  "Recommendation Proven": 1,
  Mitigated: 2,
  Incorrect: 3,
};

export function surfaceObjections(
  confident: ScoredCandidate[],
  limit = 5,
): WhoWasRightCard[] {
  const cards: WhoWasRightCard[] = [];
  const seen = new Set<string>();

  for (const c of confident) {
    for (const o of c.record.objections) {
      const key = `${o.raisedBy}::${o.objection}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        stakeholder: o.raisedBy,
        role: o.role,
        claim: o.objection,
        outcome: o.evidence,
        verdict: verdict(o.result),
        sourceDecisionId: c.record.id,
        sourceTitle: c.record.title,
      });
    }
  }

  return cards
    .sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict])
    .slice(0, limit);
}
