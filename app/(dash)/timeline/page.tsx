"use client";

import {
  FileText,
  MessageSquareWarning,
  Sparkles,
  ShieldAlert,
  Clock,
  Database,
} from "lucide-react";
import { Card } from "@/components/ui/primitives";

const MILESTONES = [
  { icon: FileText, label: "Proposal Made", date: "Mar 14", desc: "Laura proposed reducing support staffing by 20%", tone: "text-brand-600" },
  { icon: MessageSquareWarning, label: "Objections Raised", date: "Mar 14", desc: "Ravi & Jane flagged APAC customer impact", tone: "text-risk-med" },
  { icon: Sparkles, label: "Analysis Completed", date: "Mar 15", desc: "DecisionDNA surfaced 3 precedents, confidence graded", tone: "text-brand-600" },
  { icon: ShieldAlert, label: "Guard Activated", date: "Mar 15", desc: "HIGH risk — historical precedent went negative", tone: "text-risk-high" },
  { icon: Clock, label: "Approval Pending", date: "Mar 16", desc: "Routed to manager via Teams Adaptive Card", tone: "text-risk-med" },
  { icon: Database, label: "Decision Stored", date: "Mar 16", desc: "Written to organizational memory with full evidence chain", tone: "text-risk-low" },
];

export default function TimelinePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Timeline</h1>
        <p className="text-xs text-ink-soft">Full lifecycle of a decision, from proposal to memory.</p>
      </div>

      <Card className="p-6">
        <div className="relative flex justify-between">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-line" />
          {MILESTONES.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="relative flex w-40 flex-col items-center text-center">
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-surface">
                  <Icon size={18} className={m.tone} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-ink">{m.label}</p>
                <p className="text-[10px] text-ink-faint">{m.date}</p>
                <p className="mt-1 text-[10px] text-ink-soft">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
