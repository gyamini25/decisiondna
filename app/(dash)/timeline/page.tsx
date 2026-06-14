"use client";

import {
  FileText, MessageSquareWarning, Sparkles, ShieldAlert, Clock, Database,
} from "lucide-react";
import { Card, CardHeader, Stat } from "@/components/ui/primitives";

const MILESTONES = [
  { icon: FileText, label: "Proposal Made", date: "Jun 13, 09:15", desc: "Laura Mitchell proposed reducing customer support staffing by 20%.", tone: "text-brand-400" },
  { icon: MessageSquareWarning, label: "Objections Raised", date: "Jun 13, 09:22", desc: "Ravi Patel & Jane Smith raised concerns about APAC customer impact and incident response.", tone: "text-risk-med" },
  { icon: Sparkles, label: "Analysis Completed", date: "Jun 13, 09:24", desc: "DecisionDNA surfaced 3 matching precedents (Foundry IQ), confidence-graded.", tone: "text-brand-400" },
  { icon: ShieldAlert, label: "Risk Flagged", date: "Jun 13, 09:25", desc: "Decision Guard flagged HIGH risk — the closest precedent went negative and was later reversed.", tone: "text-risk-high" },
  { icon: Clock, label: "Approval Pending", date: "Jun 13, 09:30", desc: "Routed to manager via Teams Adaptive Card (Power Automate).", tone: "text-risk-med" },
  { icon: Database, label: "Decision Stored", date: "Jun 13, 09:31", desc: "Written to organizational memory with the full evidence chain.", tone: "text-risk-low" },
];

export default function TimelinePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Timeline</h1>
        <p className="text-xs text-ink-soft">Full lifecycle of decisions and outcomes.</p>
      </div>

      <Card className="p-6">
        <div className="relative flex justify-between">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-line" />
          {MILESTONES.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="relative flex w-36 flex-col items-center text-center">
                <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-line bg-surface">
                  <Icon size={18} className={m.tone} />
                </div>
                <p className="mt-2 text-[11px] font-semibold text-ink">{m.label}</p>
                <p className="text-[10px] text-ink-faint">{m.date}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        {/* detailed event list */}
        <Card>
          <CardHeader title="Decision Lifecycle — Reduce Support Staffing" />
          <div className="divide-y divide-line">
            {MILESTONES.map((m) => {
              const Icon = m.icon;
              return (
                <div key={m.label} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface-2">
                    <Icon size={14} className={m.tone} />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-ink">{m.label}</p>
                      <span className="text-[10px] text-ink-faint">{m.date}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-soft">{m.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Timeline Insights */}
        <div className="space-y-3">
          <Card className="h-fit">
            <CardHeader title="Timeline Insights" />
            <div className="grid grid-cols-2 gap-3 p-4">
              <Stat label="Decision Speed" value="2.3d" tone="brand" hint="avg time to decision" />
              <Stat label="Objections" value="3" tone="warn" hint="raised on average" />
              <Stat label="Approval Rate" value="78%" tone="good" />
              <Stat label="Reversal Rate" value="23%" tone="bad" hint="later reversed" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
