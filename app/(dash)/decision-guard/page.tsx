"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  ShieldAlert,
  Loader2,
  BookCheck,
  FileText,
  Video,
  Mail,
  FileBox,
  MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { TeamsMeeting } from "@/components/guard/TeamsMeeting";
import { DecisionTimeline } from "@/components/DecisionTimeline";
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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

      <div className="grid grid-cols-1 gap-4 lg:h-[640px] lg:grid-cols-[35%_minmax(0,1fr)_30%]">
        {/* LEFT — live Microsoft Teams meeting */}
        <Card className="overflow-hidden">
          {doc && <TeamsMeeting doc={doc} detection={analysis?.detection} />}
        </Card>

        {/* CENTER — analysis */}
        <Card className="scroll-thin overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Sparkles size={16} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-ink">DecisionDNA Analysis</h3>
            <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium text-brand-700">
              Foundry IQ · Work IQ
            </span>
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

                {analysis.grounding && analysis.citations.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <BookCheck size={15} className="text-brand-600" />
                      <p className="text-xs font-semibold text-ink">
                        Foundry IQ — Grounded Evidence
                      </p>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          analysis.grounding.passed
                            ? "bg-risk-low-bg text-risk-low"
                            : "bg-risk-med-bg text-risk-med"
                        }`}
                      >
                        {analysis.grounding.passed ? "Grounded" : "Thin grounding"}
                      </span>
                    </div>
                    <div className="rounded-lg border border-line bg-surface-2 p-3">
                      <p className="text-[11px] text-ink-soft">
                        {analysis.grounding.groundedSources} source decisions ·{" "}
                        {analysis.grounding.totalEvidenceCount} evidence items ·
                        source diversity{" "}
                        {Math.round(analysis.grounding.sourceDiversityScore * 100)}%
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {analysis.citations.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <FileText size={12} className="mt-0.5 text-ink-faint" />
                            <p className="text-[11px] text-ink-soft">
                              <span className="font-medium text-ink">{c.ref}</span>{" "}
                              · {c.sourceType} · {c.title}{" "}
                              <span className="text-ink-faint">
                                (quality {Math.round(c.quality * 100)}%)
                              </span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
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

      {/* BOTTOM ROW — timeline · evidence summary · mini memory graph */}
      {analysis && !abstain && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold text-ink">Decision Timeline</p>
            <DecisionTimeline />
          </Card>

          <Card className="p-4">
            <p className="mb-3 text-xs font-semibold text-ink">Evidence Summary</p>
            <div className="grid grid-cols-4 gap-2">
              <EvidenceTile icon={<Video size={14} />} label="Meetings" value={analysis.evidenceTotals.meetings} />
              <EvidenceTile icon={<Mail size={14} />} label="Emails" value={analysis.evidenceTotals.emails} />
              <EvidenceTile icon={<FileBox size={14} />} label="Docs" value={analysis.evidenceTotals.documents} />
              <EvidenceTile icon={<MessageSquare size={14} />} label="Chats" value={analysis.evidenceTotals.chats} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-ink-soft">Confidence</span>
              <span className="text-sm font-bold text-ink">
                {Math.round(analysis.confidence.confidence * 100)}%
              </span>
            </div>
          </Card>

          <Card className="p-4">
            <p className="mb-2 text-xs font-semibold text-ink">Decision Memory Graph</p>
            <MiniGraph
              similar={analysis.matches.length}
              stakeholders={analysis.whoWasRight.length}
              risks={analysis.risk?.dimensions.filter((d) => d.level !== "Low").length ?? 0}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

function EvidenceTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-2 text-center">
      <div className="flex justify-center text-brand-400">{icon}</div>
      <p className="mt-1 text-base font-bold text-ink">{value}</p>
      <p className="text-[9px] text-ink-soft">{label}</p>
    </div>
  );
}

function MiniGraph({
  similar,
  stakeholders,
  risks,
}: {
  similar: number;
  stakeholders: number;
  risks: number;
}) {
  const nodes = [
    { x: 40, y: 60, c: "#0ea5e9", label: `Similar (${similar})` },
    { x: 150, y: 35, c: "#6366f1", label: "Current", big: true },
    { x: 260, y: 45, c: "#10b981", label: `People (${stakeholders})` },
    { x: 250, y: 95, c: "#f87171", label: `Risks (${risks})` },
    { x: 120, y: 100, c: "#f59e0b", label: "Outcomes" },
  ];
  return (
    <svg viewBox="0 0 300 130" className="w-full">
      {nodes.slice(1).map((n, i) => (
        <line
          key={i}
          x1={nodes[0].x}
          y1={nodes[0].y}
          x2={n.x}
          y2={n.y}
          stroke="#232c44"
          strokeWidth={1}
        />
      ))}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.big ? 16 : 11} fill={n.c} />
          <text x={n.x} y={n.y + (n.big ? 30 : 24)} fontSize={8} fill="#97a1ba" textAnchor="middle">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
