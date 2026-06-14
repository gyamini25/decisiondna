"use client";

import { useState } from "react";
import { ChevronDown, FileText, Mail, Video } from "lucide-react";
import { cn, formatDate } from "@/lib/ui";
import { Badge } from "@/components/ui/primitives";
import type { MatchCard, SignalVector } from "@/lib/types";

const SIGNAL_META: { key: keyof SignalVector; label: string; weight: string }[] = [
  { key: "semantic", label: "Semantic", weight: "0.35" },
  { key: "entity", label: "Entity", weight: "0.30" },
  { key: "temporal", label: "Temporal", weight: "0.20" },
  { key: "directional", label: "Directional", weight: "0.15" },
];

function impactTone(impact: string): "bad" | "warn" | "good" {
  return impact === "High" ? "bad" : impact === "Medium" ? "warn" : "good";
}

export function MatchCardView({ match }: { match: MatchCard }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-surface">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Badge tone="good" className="font-semibold">
            {match.matchPct}% Match
          </Badge>
          <Badge tone={impactTone(match.impact)}>{match.impact} Impact</Badge>
        </div>
        <span className="text-[11px] text-ink-faint">{formatDate(match.date)}</span>
      </div>

      <div className="px-3 pb-2">
        <p className="text-sm font-semibold text-ink">{match.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
          {match.outcomeSummary}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <div className="flex items-center gap-3 text-[11px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Video size={12} /> {match.evidence.meetings}
          </span>
          <span className="inline-flex items-center gap-1">
            <Mail size={12} /> {match.evidence.emails}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText size={12} /> {match.evidence.documents}
          </span>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-700"
        >
          Signal breakdown
          <ChevronDown
            size={13}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-line bg-surface-2 px-3 py-3">
          {SIGNAL_META.map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="w-20 text-[11px] text-ink-soft">{s.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${match.signals[s.key] * 100}%` }}
                />
              </div>
              <span className="w-9 text-right text-[11px] font-medium text-ink">
                {Math.round(match.signals[s.key] * 100)}%
              </span>
              <span className="w-8 text-right text-[10px] text-ink-faint">
                ×{s.weight}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-line pt-2 text-[11px]">
            <span className="text-ink-soft">
              Composite S<sub>final</sub> ·{" "}
              <span className="font-semibold text-ink">
                {match.confidence.disagreement
                  ? "semantic-only flag"
                  : match.confidence.category}
              </span>
            </span>
            <span className="font-semibold text-ink">
              Confidence {Math.round(match.confidence.confidence * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
