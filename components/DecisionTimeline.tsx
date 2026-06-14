"use client";

import { cn } from "@/lib/ui";

export interface TimelineStep {
  label: string;
  date: string;
  state: "done" | "current" | "future";
}

/** The lifecycle of the currently-tracked decision. "Risk Flagged" is when
 *  Decision Guard raised a risk (renamed from the old "Guard Activated"). */
export const HERO_TIMELINE: TimelineStep[] = [
  { label: "Proposal Made", date: "Jun 13 · 09:15", state: "done" },
  { label: "Objections Raised", date: "Jun 13 · 09:22", state: "done" },
  { label: "Analysis Completed", date: "Jun 13 · 09:24", state: "done" },
  { label: "Risk Flagged", date: "Jun 13 · 09:25", state: "done" },
  { label: "Approval Pending", date: "Jun 13 · 09:30", state: "current" },
  { label: "Decision Stored", date: "awaiting approval", state: "future" },
];

export function DecisionTimeline({
  steps = HERO_TIMELINE,
  caption,
}: {
  steps?: TimelineStep[];
  caption?: string;
}) {
  return (
    <div>
      <div className="relative flex justify-between">
        <div className="absolute left-0 right-0 top-[7px] h-0.5 bg-line" />
        {steps.map((s) => (
          <div key={s.label} className="relative flex w-1/6 flex-col items-center text-center">
            <span
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2",
                s.state === "done" && "border-brand-500 bg-brand-500",
                s.state === "current" && "live-dot border-risk-med bg-risk-med",
                s.state === "future" && "border-line bg-surface",
              )}
            />
            <span className="mt-1.5 text-[10px] font-medium text-ink">{s.label}</span>
            <span className="text-[9px] text-ink-faint">{s.date}</span>
          </div>
        ))}
      </div>
      {caption && <p className="mt-3 text-[11px] text-ink-soft">{caption}</p>}
    </div>
  );
}
