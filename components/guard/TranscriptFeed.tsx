"use client";

import { Sparkles, Radio } from "lucide-react";
import { Avatar } from "@/components/ui/primitives";
import type { DecisionDetection } from "@/lib/types";
import type { TranscriptDoc } from "@/lib/transcripts";

export function TranscriptFeed({
  doc,
  detection,
}: {
  doc: TranscriptDoc;
  detection?: DecisionDetection;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[11px] font-semibold text-risk-high">
            <Radio size={11} className="live-dot rounded-full" /> Live
          </span>
          <h3 className="text-sm font-semibold text-ink">{doc.title}</h3>
        </div>
        <span className="text-xs text-ink-soft">{doc.participants.length} participants</span>
      </div>

      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {doc.lines.map((l, i) => (
          <div key={i} className="flex gap-3">
            <Avatar name={l.speaker} size={28} />
            <div className="flex-1">
              <p className="text-xs">
                <span className="font-semibold text-ink">{l.speaker}</span>{" "}
                <span className="text-ink-faint">{l.time}</span>
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">{l.text}</p>
            </div>
          </div>
        ))}

        {detection?.isDecision && (
          <div className="flex items-start gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2">
            <Sparkles size={16} className="mt-0.5 text-brand-600" />
            <div>
              <p className="text-xs font-semibold text-brand-700">
                Decision Detected
              </p>
              <p className="text-sm text-ink">{detection.proposal}</p>
              <p className="mt-1 text-[11px] text-ink-soft">
                Proposed by {detection.proposer} · detection confidence{" "}
                {Math.round(detection.confidence * 100)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
