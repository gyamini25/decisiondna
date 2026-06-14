/**
 * DecisionDNA — explainable confidence model (judge-proof framing).
 *
 *   S_final = Σ wᵢ·Sᵢ                       (lib/scoring)
 *   C       = 1 − Var(S₁…S₄)                confidence = signal AGREEMENT
 *   R       = S_final × C                   rank — punishes uncertain matches
 *
 * Abstention protocol — surface a match only when BOTH hold:
 *   • C ≥ 0.6                 (signals agree — not internally contradictory)
 *   • S_final ≥ 0.5           (there is genuine evidence strength — a real match)
 *
 * Why both? Variance of four values in [0,1] keeps `1 − Var` in [0.75, 1], so the
 * confidence test alone cannot express "nothing matched" (uniformly weak but
 * concurring signals still agree). The S_final relevance floor is the second half
 * of the protocol (from the RAG spec: "similarity < 0.5 → low confidence"), and
 * the disagreement guard below is what makes C itself cross 0.6 for a semantic
 * bluff. Together they are the formal abstention protocol.
 */

import type {
  ConfidenceCategory,
  ConfidenceResult,
  SignalVector,
} from "@/lib/types";

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;
/** Minimum S_final for a candidate to count as a real match (evidence floor). */
export const RELEVANCE_FLOOR = 0.5;

/** Population variance of a numeric array. */
export function variance(nums: number[]): number {
  if (nums.length === 0) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length;
}

const SIGNAL_LABELS: Record<keyof SignalVector, string> = {
  semantic: "Semantic similarity",
  entity: "Entity alignment",
  temporal: "Temporal consistency",
  directional: "Directional correctness",
};

function categorize(confidence: number): ConfidenceCategory {
  if (confidence >= 0.8) return "high";
  if (confidence >= DEFAULT_CONFIDENCE_THRESHOLD) return "moderate";
  if (confidence >= 0.4) return "low";
  return "insufficient";
}

/** Detect the semantic-only-match "bluff": meaning high, facts + timing low. */
export function detectDisagreement(s: SignalVector): boolean {
  return s.semantic > 0.7 && s.entity < 0.3 && s.temporal < 0.3;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Whether a candidate clears the abstention protocol: signals agree (C) AND the
 * evidence is genuinely strong (S_final).
 */
export function surfaces(
  confidence: number,
  sFinalValue: number,
  threshold = DEFAULT_CONFIDENCE_THRESHOLD,
): boolean {
  return confidence >= threshold && sFinalValue >= RELEVANCE_FLOOR;
}

/**
 * Compute confidence C = 1 − Var(signals) (with the semantic-bluff guard halving
 * it). @param sFinalValue is used only for the explanation/relevance context.
 */
export function computeConfidence(
  signals: SignalVector,
  sFinalValue: number,
): ConfidenceResult {
  const values = [
    signals.semantic,
    signals.entity,
    signals.temporal,
    signals.directional,
  ];
  const v = variance(values);
  let c = 1 - v;

  const disagreement = detectDisagreement(signals);
  if (disagreement) c *= 0.5;

  const confidence = clamp01(c);
  const category = categorize(confidence);

  // Which signals diverge most from the mean (for the UI "disagreeing signals").
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const keys: (keyof SignalVector)[] = [
    "semantic",
    "entity",
    "temporal",
    "directional",
  ];
  const divergingSignals = keys
    .map((k) => ({ k, dev: Math.abs(signals[k] - mean) }))
    .filter((x) => x.dev > 0.2)
    .sort((a, b) => b.dev - a.dev)
    .map((x) => SIGNAL_LABELS[x.k]);

  const explanation = buildExplanation(
    category,
    confidence,
    sFinalValue,
    disagreement,
    divergingSignals,
  );

  return {
    confidence: round2(confidence),
    category,
    variance: round4(v),
    disagreement,
    disagreementFlag: disagreement ? "semantic-only-match" : undefined,
    explanation,
    divergingSignals,
  };
}

function buildExplanation(
  category: ConfidenceCategory,
  confidence: number,
  sFinalValue: number,
  disagreement: boolean,
  diverging: string[],
): string {
  const pct = Math.round(confidence * 100);
  const rel = Math.round(sFinalValue * 100);
  if (disagreement) {
    return `Confidence downgraded to ${pct}% — semantic-only match: meaning overlaps but entity and temporal evidence do not support it.`;
  }
  if (sFinalValue < RELEVANCE_FLOOR) {
    return `Signals agree (${pct}% confidence) but evidence strength is only ${rel}% — below the ${Math.round(
      RELEVANCE_FLOOR * 100,
    )}% bar for a reliable match.`;
  }
  switch (category) {
    case "high":
      return `High confidence (${pct}%) — all four signals concur on strong evidence (S_final ${rel}%).`;
    case "moderate":
      return `Moderate confidence (${pct}%) — signals broadly agree with reasonable evidence (S_final ${rel}%).`;
    case "low":
      return diverging.length
        ? `Low confidence (${pct}%) — signals disagree (${diverging.join(", ")}).`
        : `Low confidence (${pct}%) — signals diverge.`;
    default:
      return `Insufficient evidence (${pct}%) — no historical decision matched strongly enough to rely on.`;
  }
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
