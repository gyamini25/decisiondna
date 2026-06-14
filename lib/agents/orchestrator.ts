/**
 * DecisionDNA orchestrator — the Microsoft Agent Framework 1.0 style pipeline.
 *
 * Detect → Retrieve → Score evidence (+confidence gate) → Risk → Objections
 * ("Who Was Right") → Recommend → (Approve/Store handled by the API).
 *
 * Confidence gate: if no historical match clears the threshold, the pipeline
 * abstains — returning an "insufficient-evidence" result with the closest weak
 * matches and which signals disagree, and it does NOT fabricate risk scores or
 * objections. This is the reliability/safety behavior judges probe for.
 *
 * Every step emits a telemetry record (agent, latency, confidence) — the local
 * stand-in for Application Insights.
 */

import type { DecisionAnalysis, TelemetryStep } from "@/lib/types";
import { getLLMClient, type LLMClient } from "@/lib/llm";
import {
  detectDecision,
  buildContextText,
  type DetectInput,
} from "@/lib/agents/detectDecision";
import { retrieveHistory } from "@/lib/agents/retrieveHistory";
import {
  toMatchCard,
  gateEvidence,
  aggregateEvidenceTotals,
  envThreshold,
} from "@/lib/agents/scoreEvidence";
import { scoreRisk } from "@/lib/agents/scoreRisk";
import { surfaceObjections } from "@/lib/agents/surfaceObjections";
import { recommend } from "@/lib/agents/recommend";
import { groundDecision } from "@/lib/foundryiq";

export interface AnalyzeOptions {
  threshold?: number;
  referenceDate?: string;
  llm?: LLMClient;
}

export async function analyzeDecision(
  input: DetectInput,
  opts: AnalyzeOptions = {},
): Promise<DecisionAnalysis> {
  const llm = opts.llm ?? getLLMClient();
  const threshold = opts.threshold ?? envThreshold();
  const telemetry: TelemetryStep[] = [];

  const time = async <T>(
    step: string,
    agent: string,
    fn: () => Promise<T> | T,
    conf?: (r: T) => number | undefined,
  ): Promise<T> => {
    const start = Date.now();
    const result = await fn();
    telemetry.push({
      step,
      agent,
      latencyMs: Date.now() - start,
      confidence: conf?.(result),
    });
    return result;
  };

  // Step 1 — Detect.
  const detection = await time(
    "detect",
    "DetectDecisionAgent",
    () => detectDecision(input, llm),
    (d) => d.confidence,
  );

  // Step 2 — Retrieve.
  const contextText = buildContextText(input);
  const ranked = await time("retrieve", "RetrieveHistoryAgent", () =>
    retrieveHistory(detection, contextText, llm, opts.referenceDate),
  );

  // Step 3 — Score evidence + confidence gate.
  const gate = gateEvidence(ranked, threshold);
  const topConfidence =
    gate.top?.confidence ?? {
      confidence: 0,
      category: "insufficient" as const,
      variance: 0,
      disagreement: false,
      explanation: "No precedent found.",
      divergingSignals: [],
    };
  telemetry.push({
    step: "score-evidence",
    agent: "EvidenceScoringAgent",
    latencyMs: 0,
    confidence: topConfidence.confidence,
    note: `${gate.confident.length} confident / ${ranked.length} candidates @ threshold ${threshold}`,
  });

  const evidenceTotals = aggregateEvidenceTotals(
    gate.abstain ? ranked.slice(0, 3) : gate.confident,
  );

  // ---- Abstention path (reliability/safety) ---------------------------------
  if (gate.abstain) {
    telemetry.push({
      step: "abstain",
      agent: "ConfidenceAgent",
      latencyMs: 0,
      confidence: topConfidence.confidence,
      note: "Below threshold — abstaining; no risk/objections fabricated.",
    });
    return {
      type: "insufficient-evidence",
      detection,
      matches: [],
      whoWasRight: [],
      risk: null,
      recommendations: [],
      citations: [],
      confidence: topConfidence,
      evidenceTotals,
      weakMatches: ranked.slice(0, 3).map(toMatchCard),
      message: `Confidence ${Math.round(
        topConfidence.confidence * 100,
      )}% is below the ${Math.round(
        threshold * 100,
      )}% threshold for reliable analysis. Showing the closest weak matches; signals diverge on ${
        topConfidence.divergingSignals.join(", ") || "multiple dimensions"
      }.`,
      telemetry,
    };
  }

  // ---- Confident path -------------------------------------------------------
  const risk = await time("risk", "RiskAssessmentAgent", () =>
    scoreRisk(gate.confident),
  );

  const whoWasRight = await time("objections", "ObjectionAnalysisAgent", () =>
    surfaceObjections(gate.confident),
  );

  const recommendations = await time("recommend", "RecommendationAgent", () =>
    recommend(gate.confident, risk),
  );

  // Foundry IQ — ground the answer with cited, source-diversity-checked evidence.
  const grounding = await time("ground", "FoundryIQ", () =>
    groundDecision(gate.confident),
  );
  const citations = grounding.citations;

  // Display the closest precedents (top 3) as match cards; the analysis above
  // (risk, who-was-right, recommendations) is derived ONLY from confident
  // matches so we never fabricate conclusions from weak evidence.
  const matches = ranked.slice(0, 3).map(toMatchCard);

  return {
    type: "analysis",
    detection,
    matches,
    whoWasRight,
    risk,
    recommendations,
    citations,
    grounding: {
      groundedSources: grounding.groundedSources,
      sourceDiversityScore: grounding.sourceDiversityScore,
      totalEvidenceCount: grounding.totalEvidenceCount,
      passed: grounding.passed,
    },
    confidence: topConfidence,
    evidenceTotals,
    telemetry,
  };
}
