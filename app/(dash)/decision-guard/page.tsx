"use client";

import { useEffect, useState } from "react";
import { Sparkles, ShieldAlert, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { TranscriptFeed } from "@/components/guard/TranscriptFeed";
import { MatchCardView } from "@/components/guard/MatchCardView";
import { WhoWasRight } from "@/components/guard/WhoWasRight";
import { RiskPanel, ConfidenceMeter } from "@/components/guard/RiskPanel";
import { InsufficientEvidence } from "@/components/guard/InsufficientEvidence";
import type { DecisionAnalysis } from "@/lib/types";
import type { TranscriptDoc } from "@/lib/transcripts";

const SCENARIOS = [
  { id: "hero-support-staffing", label: "Support staffing cut (strong precedent)" },
  { id: "lowconf-sponsorship", label: "F1 sponsorship (no precedent)" },
];

export default function DecisionGuardPage() {
  const [scenario, setScenario] = useState(SCENARIOS[0].id);
  const [doc, setDoc] = useState<TranscriptDoc | null>(null);
  const [analysis, setAnalysis] = useState<DecisionAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setAnalysis(null);
    Promise.all([
      fetch(`/api/transcripts/${scenario}`).then((r) => r.json()),
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId: scenario }),
      }).then((r) => r.json()),
    ])
      .then(([d, a]) => {
        if (!active) return;
        setDoc(d);
        setAnalysis(a);
        setLoading(false);
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [scenario]);

  const abstain = analysis?.type === "insufficient-evidence";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert size={20} className="text-brand-600" />
          <h1 className="text-lg font-bold text-ink">Decision Guard</h1>
          <span className="text-xs text-ink-soft">
            Live meeting analysis · evidence-graded recommendations
          </span>
        </div>
        <select
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          className="rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-ink outline-none focus:border-brand-400"
        >
          {SCENARIOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[35%_minmax(0,1fr)_30%]">
        {/* LEFT — live transcript */}
        <Card className="overflow-hidden">
          {doc && <TranscriptFeed doc={doc} detection={analysis?.detection} />}
        </Card>

        {/* CENTER — analysis */}
        <Card className="scroll-thin overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Sparkles size={16} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-ink">DecisionDNA Analysis</h3>
          </div>
          <div className="p-4">
            {loading || !analysis ? (
              <div className="flex h-40 items-center justify-center text-ink-soft">
                <Loader2 className="mr-2 animate-spin" size={18} /> Analyzing decision…
              </div>
            ) : abstain ? (
              <InsufficientEvidence analysis={analysis} />
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-semibold text-ink">
                    Similar Decisions Found ({analysis.matches.length})
                  </p>
                  <div className="space-y-2">
                    {analysis.matches.map((m) => (
                      <MatchCardView key={m.decisionId} match={m} />
                    ))}
                  </div>
                </div>

                {analysis.whoWasRight.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold text-ink">
                      Who Was Right?
                    </p>
                    <WhoWasRight cards={analysis.whoWasRight} />
                  </div>
                )}

                <ConfidenceMeter analysis={analysis} />
              </div>
            )}
          </div>
        </Card>

        {/* RIGHT — risk + approval */}
        <Card className="scroll-thin overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <ShieldAlert size={16} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-ink">Decision Guard</h3>
          </div>
          <div className="p-4">
            {loading || !analysis ? (
              <div className="space-y-3">
                <div className="h-20 animate-pulse rounded-lg bg-surface-2" />
                <div className="h-32 animate-pulse rounded-lg bg-surface-2" />
              </div>
            ) : abstain ? (
              <div className="rounded-lg border border-line bg-surface-2 p-4 text-center text-xs text-ink-soft">
                Risk scoring is withheld until a confident precedent is found —
                the system does not fabricate risk from weak evidence.
              </div>
            ) : (
              <RiskPanel analysis={analysis} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
