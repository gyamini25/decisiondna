/**
 * DecisionDNA — explainable confidence model.
 *
 * Design (defended in docs/methodology.md):
 *
 *   agreement   = 1 - Var(signals)              // signals concurring → high
 *   sufficiency = logistic(sFinal; x0=0.5, k=10) // is there a real match?
 *   confidence  = agreement · sufficiency
 *
 * Why not the naive `C = 1 - Var(signals)` alone? Variance of four values in
 * [0,1] is bounded by 0.25, so `1 - Var` lives in [0.75, 1.0] and can never
 * cross a 0.6 abstention threshold — worse, four *uniformly weak* signals
 * "agree" and would look confident. We keep agreement (1 - Var) as a
 * first-class multiplier (confidence is still about signal agreement, not raw
 * magnitude) but multiply by a sufficiency gate on S_final so that BOTH
 * "signals disagree" AND "nothing matched well" drive the system to abstain.
 *
 * Disagreement guard: a high semantic score with low entity AND low temporal
 * support is the classic "semantic bluff" — meaning overlaps but the facts and
 * timing do not. We flag it and halve agreement.
 */

import type {
  ConfidenceCategory,
  ConfidenceResult,
  SignalVector,
} from "@/lib/types";

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.6;

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
 * Sufficiency gate — logistic on S_final. Suppresses uniformly weak matches (so
 * abstention can fire) while letting strong evidence through. Centered at 0.42
 * so it separates a genuine match from noise for BOTH backends: real Azure
 * OpenAI embeddings (S_final ≈ 0.7 → ~1.0) and the lexical mock (S_final ≈ 0.49
 * → ~0.7), while unrelated proposals (S_final ≲ 0.37) fall below threshold.
 */
export const SUFFICIENCY_X0 = 0.42;
export const SUFFICIENCY_K = 13;

export function sufficiency(
  sFinalValue: number,
  x0 = SUFFICIENCY_X0,
  k = SUFFICIENCY_K,
): number {
  return 1 / (1 + Math.exp(-k * (sFinalValue - x0)));
}

/**
 * Compute confidence from the four signals and the composite sFinal.
 *
 * @param signals raw signal vector (each 0..1)
 * @param sFinalValue weighted composite (pass from lib/scoring.sFinal)
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
  let agreement = 1 - v;

  const disagreement = detectDisagreement(signals);
  if (disagreement) agreement *= 0.5;

  const confidence = clamp01(agreement * sufficiency(sFinalValue));
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
  disagreement: boolean,
  diverging: string[],
): string {
  const pct = Math.round(confidence * 100);
  if (disagreement) {
    return `Confidence downgraded to ${pct}% — semantic-only match detected: meaning overlaps but entity and temporal evidence do not support it.`;
  }
  switch (category) {
    case "high":
      return `High confidence (${pct}%) — all four signals concur and the evidence is strong.`;
    case "moderate":
      return `Moderate confidence (${pct}%) — signals broadly agree with reasonable evidence support.`;
    case "low":
      return diverging.length
        ? `Low confidence (${pct}%) — signals disagree (${diverging.join(", ")}).`
        : `Low confidence (${pct}%) — evidence is weak.`;
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
