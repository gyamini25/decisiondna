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
  TrendingUp,
  Database,
  Brain,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardHeader, Badge, ConfidenceBar, RiskBadge, Skeleton, Avatar } from "@/components/ui/primitives";
import { useJson } from "@/lib/use-fetch";
import { formatDate } from "@/lib/ui";
import type { Alert, Meeting, WorkMemory } from "@/lib/types";
import type { DecisionListItem } from "@/lib/decisions-view";

interface ReportData {
  kpis: {
    decisionsAnalyzed: number;
    avgConfidence: number;
    highRisk: number;
    pending: number;
    memorySize: number;
    deltas: Record<string, string>;
  };
  aiInsights: { kind: string; text: string }[];
  whoWasRight: { stakeholder: string; role: string; prediction: string; verdict: "Correct" | "Incorrect" }[];
}

const TIMELINE = ["Proposal", "Objections", "Analysis", "Guard", "Approval", "Stored"];

export default function HomePage() {
  const reports = useJson<ReportData>("/api/reports");
  const decisions = useJson<{ decisions: DecisionListItem[] }>("/api/decisions");
  const meetings = useJson<{ meetings: Meeting[] }>("/api/meetings");
  const work = useJson<WorkMemory>("/api/workiq");
  const alerts = useJson<{ alerts: Alert[] }>("/api/alerts");

  const k = reports.data?.kpis;
  const recent = decisions.data?.decisions.slice(0, 5) ?? [];
  const upcoming = (meetings.data?.meetings ?? [])
    .filter((m) => m.status !== "past")
    .slice(0, 4);
  const c = work.data?.counts;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Welcome back, Laura 👋</h1>
        <p className="text-xs text-ink-soft">
          Here&apos;s what&apos;s happening across your organization today.
        </p>
      </div>

      {/* KPI row — 5 cards with deltas */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {k ? (
          <>
            <Kpi icon={<Activity size={15} />} label="Decisions Analyzed" value={k.decisionsAnalyzed} delta={k.deltas.decisions} />
            <Kpi icon={<TrendingUp size={15} />} label="Confidence Score" value={`${Math.round(k.avgConfidence * 100)}%`} delta={k.deltas.confidence} tone="brand" />
            <Kpi icon={<ShieldAlert size={15} />} label="Risk Exposure" value={k.highRisk > 2 ? "High" : "Medium"} delta={k.deltas.risk} tone="bad" />
            <Kpi icon={<Bell size={15} />} label="Approvals Pending" value={k.pending} delta={k.deltas.pending} tone="warn" />
            <Kpi icon={<Database size={15} />} label="Memory Size" value={k.memorySize.toLocaleString()} delta={k.deltas.memory} />
          </>
        ) : (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Upcoming meetings */}
        <Card>
          <CardHeader title="Upcoming Meetings" icon={<Video size={15} className="text-brand-400" />}
            action={<Link href="/meetings" className="text-xs font-medium text-brand-400 hover:text-brand-300">View all</Link>} />
          <div className="divide-y divide-line">
            {upcoming.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{m.title}</p>
                  <p className="text-[11px] text-ink-soft">{formatDate(m.date)} · {m.participants.length} participants</p>
                </div>
                <Link href="/decision-guard" className="rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white">
                  {m.status === "live" ? "Join" : "Open"}
                </Link>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent decisions */}
        <Card>
          <CardHeader title="Recent Decisions" icon={<FileText size={15} className="text-brand-400" />}
            action={<Link href="/decisions" className="text-xs font-medium text-brand-400 hover:text-brand-300">View all</Link>} />
          <div className="divide-y divide-line">
            {recent.map((d) => (
              <Link key={d.id} href={`/decisions?id=${d.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{d.proposal}</p>
                  <p className="text-[10px] text-ink-soft">{formatDate(d.date)}</p>
                </div>
                <RiskBadge level={d.risk} />
              </Link>
            ))}
          </div>
        </Card>

        {/* AI Insights */}
        <Card>
          <CardHeader title="AI Insights" icon={<Brain size={15} className="text-brand-400" />} />
          <div className="space-y-2 p-4">
            {(reports.data?.aiInsights ?? []).map((ins, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 p-2.5">
                <TrendingUp size={14} className="mt-0.5 text-brand-400" />
                <p className="text-[11px] text-ink-soft">{ins.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Who Was Right */}
        <Card className="lg:col-span-1">
          <CardHeader title="Who Was Right?" subtitle="Validated stakeholder foresight" />
          <div className="divide-y divide-line">
            {(reports.data?.whoWasRight ?? []).slice(0, 4).map((w, i) => (
              <div key={i} className="flex items-center gap-2 px-4 py-2.5">
                <Avatar name={w.stakeholder} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{w.stakeholder}</p>
                  <p className="truncate text-[10px] text-ink-soft">{w.prediction}</p>
                </div>
                {w.verdict === "Correct" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-low"><CheckCircle2 size={13} /> Correct</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-risk-high"><XCircle size={13} /> Incorrect</span>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Decision timeline strip */}
        <Card className="lg:col-span-1">
          <CardHeader title="Decision Timeline" />
          <div className="p-4">
            <div className="flex justify-between">
              {TIMELINE.map((m, i) => (
                <div key={m} className="flex flex-1 flex-col items-center text-center">
                  <div className={`h-2.5 w-2.5 rounded-full ${i <= 3 ? "bg-brand-500" : "bg-line"}`} />
                  <span className="mt-1 text-[9px] text-ink-soft">{m}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-ink-soft">Latest: Reduce Support Staffing — Guard activated, approval pending.</p>
          </div>
        </Card>

        {/* Evidence summary (Work IQ) */}
        <Card className="lg:col-span-1">
          <CardHeader title="Evidence Summary" subtitle="From Work IQ (last 30 days)" />
          <div className="grid grid-cols-2 gap-3 p-4">
            <EvidenceTile icon={<Video size={15} />} label="Meetings" value={c?.meetings ?? 0} />
            <EvidenceTile icon={<Mail size={15} />} label="Emails" value={c?.emails ?? 0} />
            <EvidenceTile icon={<FileText size={15} />} label="Documents" value={c?.documents ?? 0} />
            <EvidenceTile icon={<MessageSquare size={15} />} label="Chats" value={c?.chats ?? 0} />
          </div>
        </Card>
      </div>

      {/* Decision Intelligence Feed (alerts) */}
      <Card>
        <CardHeader title="Decision Intelligence Feed" icon={<Bell size={15} className="text-brand-400" />}
          action={<Link href="/alerts" className="text-xs font-medium text-brand-400 hover:text-brand-300">View all</Link>} />
        <div className="divide-y divide-line">
          {(alerts.data?.alerts ?? []).slice(0, 4).map((a) => (
            <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-xs font-medium text-ink">{a.title}</p>
                <p className="text-[11px] text-ink-soft">{a.description}</p>
              </div>
              <Badge tone={a.severity === "High" ? "bad" : a.severity === "Medium" ? "warn" : "neutral"}>{a.severity}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Kpi({
  icon, label, value, delta, tone,
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode; delta?: string; tone?: "brand" | "bad" | "warn";
}) {
  const color = tone === "bad" ? "text-risk-high" : tone === "warn" ? "text-risk-med" : tone === "brand" ? "text-brand-400" : "text-ink";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-ink-soft">{icon}<span className="text-[11px] font-medium">{label}</span></div>
      <p className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</p>
      {delta && <p className="mt-0.5 text-[10px] text-risk-low">{delta} <span className="text-ink-faint">vs last 7 days</span></p>}
    </Card>
  );
}

function EvidenceTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-2 text-brand-400">{icon}</div>
      <p className="mt-1 text-xl font-bold text-ink">{value}</p>
      <p className="text-[11px] text-ink-soft">{label}</p>
    </div>
  );
}
