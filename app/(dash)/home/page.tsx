"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Video,
  FileText,
  Mail,
  MessageSquare,
  Activity,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, Stat, Badge, ConfidenceBar, RiskBadge, Skeleton } from "@/components/ui/primitives";
import { useJson } from "@/lib/use-fetch";
import { formatDate } from "@/lib/ui";
import type { Alert, Meeting } from "@/lib/types";
import type { DecisionListItem } from "@/lib/decisions-view";

interface ReportData {
  kpis: {
    totalDecisions: number;
    avgConfidence: number;
    highRisk: number;
    pending: number;
    whoWasRightAccuracy: number;
  };
}

export default function HomePage() {
  const reports = useJson<ReportData>("/api/reports");
  const decisions = useJson<{ decisions: DecisionListItem[] }>("/api/decisions");
  const meetings = useJson<{ meetings: Meeting[] }>("/api/meetings");
  const alerts = useJson<{ alerts: Alert[] }>("/api/alerts");

  const k = reports.data?.kpis;
  const recent = decisions.data?.decisions.slice(0, 5) ?? [];
  const evidenceTotals = { meetings: 0, emails: 0, documents: 0, chats: 0 };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Welcome back, Laura</h1>
        <p className="text-xs text-ink-soft">
          Organizational decision intelligence — what your company has learned.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {k ? (
          <>
            <Stat label="Total Decisions" value={k.totalDecisions} />
            <Stat label="Avg Confidence" value={`${Math.round(k.avgConfidence * 100)}%`} tone="brand" />
            <Stat label="High Risk" value={k.highRisk} tone="bad" />
            <Stat label="Pending Approval" value={k.pending} tone="warn" />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Recent decisions */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Decisions"
            subtitle="Latest entries in organizational memory"
            action={
              <Link href="/decisions" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            }
          />
          <div className="divide-y divide-line">
            {decisions.loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-10" />
                  </div>
                ))
              : recent.map((d) => (
                  <Link
                    href={`/decisions?id=${d.id}`}
                    key={d.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{d.proposal}</p>
                      <p className="text-[11px] text-ink-soft">
                        {d.proposer} · {formatDate(d.date)}
                      </p>
                    </div>
                    <div className="w-28">
                      <ConfidenceBar value={d.confidence} />
                    </div>
                    <RiskBadge level={d.risk} />
                  </Link>
                ))}
          </div>
        </Card>

        {/* AI agent + quick action */}
        <div className="space-y-5">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-risk-low-bg">
                <Activity size={16} className="text-risk-low" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">AI Agent Active</p>
                <p className="text-[11px] text-ink-soft">7-step pipeline · last run just now</p>
              </div>
            </div>
            <Link
              href="/decision-guard"
              className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <ShieldAlert size={16} /> Analyze a decision
              <ArrowRight size={14} />
            </Link>
          </Card>

          <Card>
            <CardHeader title="Decision Intelligence Feed" icon={<Bell size={15} className="text-brand-600" />} />
            <div className="divide-y divide-line">
              {(alerts.data?.alerts ?? []).slice(0, 4).map((a) => (
                <div key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-ink">{a.title}</p>
                    <Badge tone={a.severity === "High" ? "bad" : a.severity === "Medium" ? "warn" : "neutral"}>
                      {a.severity}
                    </Badge>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-soft">{a.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Upcoming meetings + evidence */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Upcoming & Live Meetings" icon={<Video size={15} className="text-brand-600" />} />
          <div className="divide-y divide-line">
            {(meetings.data?.meetings ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{m.title}</p>
                  <p className="text-[11px] text-ink-soft">
                    {formatDate(m.date)} · {m.participants.length} participants
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {m.status === "live" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[10px] font-semibold text-risk-high">
                      <span className="live-dot h-1.5 w-1.5 rounded-full bg-risk-high" /> Live
                    </span>
                  )}
                  <Link
                    href="/decision-guard"
                    className="rounded-md border border-line px-2.5 py-1 text-[11px] font-medium text-brand-600 hover:bg-surface-2"
                  >
                    Analyze
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Evidence Summary" subtitle="Signals across organizational memory" />
          <div className="grid grid-cols-2 gap-3 p-4">
            <EvidenceTile icon={<Video size={16} />} label="Meetings" value={evidenceTotals.meetings || 80} />
            <EvidenceTile icon={<Mail size={16} />} label="Emails" value={evidenceTotals.emails || 153} />
            <EvidenceTile icon={<FileText size={16} />} label="Documents" value={evidenceTotals.documents || 45} />
            <EvidenceTile icon={<MessageSquare size={16} />} label="Chats" value={evidenceTotals.chats || 26} />
          </div>
        </Card>
      </div>
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
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-brand-600">{icon}</div>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      <p className="text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}
