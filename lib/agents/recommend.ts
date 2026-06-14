/**
 * Agent 6 — RecommendationAgent.
 *
 * SK plugin: synthesizes mitigation actions ranked by impact, derived from what
 * actually worked / failed in the confident historical matches and the risk
 * assessment. Each recommendation cites the precedent that motivates it.
 */

import type {
  Recommendation,
  RiskAssessment,
  ScoredCandidate,
} from "@/lib/types";

export function recommend(
  confident: ScoredCandidate[],
  risk: RiskAssessment,
): Recommendation[] {
  const recs: Recommendation[] = [];
  const add = (r: Recommendation) => {
    if (!recs.some((x) => x.action === r.action)) recs.push(r);
  };

  for (const c of confident) {
    // Proven recommendations from past objections become first-class actions.
    for (const o of c.record.objections) {
      if (o.result === "recommendation-proven") {
        add({
          action: phraseFromObjection(o.objection),
          priority: "High",
          rationale: `Proven in "${c.record.title}": ${o.evidence}`,
          sourceDecisionId: c.record.id,
        });
      }
    }
    // A successful automation precedent → deflect demand before cutting.
    if (
      c.record.tags.includes("automation") ||
      c.record.id.includes("chatbot")
    ) {
      add({
        action:
          "Deploy chatbot deflection for tier-1 tickets before reducing staffing",
        priority: "High",
        rationale: `"${c.record.title}" deflected demand without CSAT loss: ${c.record.outcome.summary}`,
        sourceDecisionId: c.record.id,
      });
    }
  }

  // Risk-driven mitigations.
  const customer = risk.dimensions.find((d) => d.dimension === "customer");
  if (customer && customer.score >= 6) {
    add({
      action: "Add overflow support vendor to protect peak/APAC coverage",
      priority: "High",
      rationale: customer.reasoning,
    });
    add({
      action: "Increase self-service coverage to absorb deflected volume",
      priority: "Medium",
      rationale: "Reduces customer-facing exposure during the change.",
    });
  }

  // Universal guardrail.
  add({
    action: "Define rollback criteria and monitoring before rollout",
    priority: "Medium",
    rationale:
      "Past reversals show the value of pre-defined rollback thresholds.",
  });

  const order = { High: 0, Medium: 1, Low: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6);
}

function phraseFromObjection(objection: string): string {
  const o = objection.toLowerCase();
  if (o.includes("pilot")) return "Run a 4-week pilot before full rollout";
  if (o.includes("grandfather"))
    return "Grandfather existing customers to protect renewals";
  if (o.includes("handoff"))
    return "Build a clean human-handoff path before automating";
  // Fall back to the objection itself as the action.
  return objection.replace(/\.$/, "");
}
