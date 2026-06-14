"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, Search, Plus } from "lucide-react";
import { Card, CardHeader, Avatar, Badge, Skeleton } from "@/components/ui/primitives";
import { useJson } from "@/lib/use-fetch";
import { formatDate } from "@/lib/ui";
import type { Meeting, WorkMemory } from "@/lib/types";

const TABS = ["Upcoming", "Live", "Past", "My Meetings"] as const;
const ME = "Laura Mitchell";

export default function MeetingsPage() {
  const { data, loading } = useJson<{ meetings: Meeting[] }>("/api/meetings");
  const work = useJson<WorkMemory>("/api/workiq");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Upcoming");
  const [q, setQ] = useState("");

  const all = data?.meetings ?? [];
  const meetings = all.filter((m) => {
    if (q && !m.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (tab === "My Meetings") return m.participants.some((p) => p.name === ME);
    if (tab === "Upcoming") return m.status === "upcoming";
    if (tab === "Live") return m.status === "live";
    if (tab === "Past") return m.status === "past";
    return true;
  });

  const topics = work.data?.topics.slice(0, 5) ?? [];
  const decs = work.data?.recentDecisions ?? [];
  const impact = {
    High: decs.filter((d) => d.risk === "High").length,
    Medium: decs.filter((d) => d.risk === "Medium").length,
    Low: decs.filter((d) => d.risk === "Low").length,
  };
  const quality = Math.round((work.data?.people.reduce((s, p) => s + p.validationRate, 0) ?? 0) /
    Math.max(1, work.data?.people.length ?? 1) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Meetings</h1>
          <p className="text-xs text-ink-soft">All meetings and transcripts across the organization (Work IQ).</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700">
          <Plus size={14} /> Add Meeting
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full border px-3 py-1 text-xs ${tab === t ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:bg-surface-2"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meetings…"
            className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* meeting list */}
        <div>
          {loading ? (
            <Skeleton className="h-64" />
          ) : meetings.length === 0 ? (
            <Card className="p-8 text-center text-xs text-ink-soft">No {tab.toLowerCase()} meetings.</Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {meetings.slice(0, 12).map((m) => (
                <Card key={m.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                        <Video size={16} className="text-brand-400" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-ink">{m.title}</p>
                        <p className="text-[11px] text-ink-soft">{formatDate(m.date)}</p>
                      </div>
                    </div>
                    {m.status === "live" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-risk-high-bg px-2 py-0.5 text-[10px] font-semibold text-risk-high">
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-risk-high" /> Live
                      </span>
                    ) : (
                      <Badge tone="neutral">{m.status}</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex -space-x-2">
                    {m.participants.map((p) => (<Avatar key={p.name} name={p.name} size={26} />))}
                  </div>
                  <Link href="/decision-guard" className="mt-3 inline-block rounded-md border border-line px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-surface-2">
                    {m.status === "live" ? "Join & Monitor" : "Analyze"}
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Meeting Insights sidebar */}
        <Card className="h-fit">
          <CardHeader title="Meeting Insights" />
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <Ring value={quality} />
              <div>
                <p className="text-xs font-medium text-ink">Decision Quality</p>
                <p className="text-[11px] text-ink-soft">avg prediction validation</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-ink">Decision Impact</p>
              <ImpactRow label="High Impact" value={impact.High} tone="bad" />
              <ImpactRow label="Medium Impact" value={impact.Medium} tone="warn" />
              <ImpactRow label="Low Impact" value={impact.Low} tone="good" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-ink">Top Topics</p>
              <div className="space-y-1">
                {topics.map((t) => (
                  <div key={t.topic} className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-soft">{t.topic}</span>
                    <span className="font-semibold text-ink">{t.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#232c44" strokeWidth="6" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#6366f1" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(value / 100) * circ} ${circ}`} transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="700" fill="#e9ecf5">{value}%</text>
    </svg>
  );
}

function ImpactRow({ label, value, tone }: { label: string; value: number; tone: "bad" | "warn" | "good" }) {
  const dot = tone === "bad" ? "bg-risk-high" : tone === "warn" ? "bg-risk-med" : "bg-risk-low";
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="flex items-center gap-1.5 text-ink-soft"><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
