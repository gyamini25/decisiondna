"use client";

import { ShieldQuestion } from "lucide-react";
import { MatchCardView } from "@/components/guard/MatchCardView";
import type { DecisionAnalysis } from "@/lib/types";

export function InsufficientEvidence({
  analysis,
}: {
  analysis: DecisionAnalysis;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-risk-med-bg bg-risk-med-bg/50 p-4 text-center">
        <ShieldQuestion size={28} className="mx-auto text-risk-med" />
        <p className="mt-2 text-sm font-semibold text-ink">
          Insufficient Historical Data
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Confidence {Math.round(analysis.confidence.confidence * 100)}% — below
          threshold for reliable analysis.
        </p>
        <p className="mx-auto mt-2 max-w-md text-[11px] text-ink-soft">
          {analysis.message}
        </p>
      </div>

      {analysis.confidence.divergingSignals.length > 0 && (
        <div className="rounded-lg border border-line bg-surface-2 p-3">
          <p className="text-xs font-semibold text-ink">Disagreeing signals</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {analysis.confidence.divergingSignals.map((s) => (
              <span
                key={s}
                className="rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] text-risk-high"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold text-ink">
          Closest weak matches (low confidence)
        </p>
        <div className="space-y-2">
          {(analysis.weakMatches ?? []).map((m) => (
            <MatchCardView key={m.decisionId} match={m} />
          ))}
        </div>
      </div>
    </div>
  );
}
