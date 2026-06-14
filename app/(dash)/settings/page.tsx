"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardHeader, Avatar, Badge } from "@/components/ui/primitives";

const TABS = ["General", "Notifications", "Integrations", "Security", "AI Settings", "Team"] as const;

const INTEGRATIONS = [
  { name: "Microsoft Teams", note: "Adaptive Card approval", status: "Connected" },
  { name: "Outlook Calendar", note: "Work IQ — meetings", status: "Connected" },
  { name: "SharePoint", note: "Foundry IQ — documents", status: "Connected" },
  { name: "Azure OpenAI", note: "embeddings + GPT", status: "Configurable" },
  { name: "Power Automate", note: "approval workflow", status: "Connected" },
  { name: "Microsoft Graph", note: "Work IQ — mail/people", status: "Connected" },
];

const NOTIFS = ["Email notifications", "Teams notifications", "Risk alerts", "Approval requests", "Outcome updates"];

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("General");
  const [threshold, setThreshold] = useState(0.65);
  const [riskThreshold, setRiskThreshold] = useState(0.76);
  const [abstention, setAbstention] = useState(true);
  const [autoDetect, setAutoDetect] = useState(true);
  const [toggles, setToggles] = useState<Record<string, boolean>>(Object.fromEntries(NOTIFS.map((n) => [n, true])));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Settings</h1>
        <p className="text-xs text-ink-soft">Manage your preferences and configuration.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-xs ${tab === t ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:bg-surface-2"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "General" && (
        <Card>
          <CardHeader title="Profile" />
          <div className="flex items-center gap-4 p-4">
            <Avatar name="Laura Mitchell" size={56} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">Laura Mitchell</p>
              <p className="text-xs text-ink-soft">Senior Product Manager · Product</p>
              <p className="text-[11px] text-ink-faint">laura.mitchell@contoso.com · M365 tenant: contoso</p>
            </div>
            <button className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-soft hover:bg-surface-2">Edit Profile</button>
          </div>
        </Card>
      )}

      {tab === "Notifications" && (
        <Card>
          <CardHeader title="Notifications" subtitle="Choose what you're notified about" />
          <div className="divide-y divide-line">
            {NOTIFS.map((n) => (
              <div key={n} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink">{n}</span>
                <Toggle on={toggles[n]} onClick={() => setToggles((t) => ({ ...t, [n]: !t[n] }))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Integrations" && (
        <Card>
          <CardHeader title="Connected Integrations" subtitle="Microsoft stack — swap mocks for live services via env" />
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
            {INTEGRATIONS.map((i) => (
              <div key={i.name} className="flex items-center justify-between rounded-lg border border-line p-3">
                <div><p className="text-sm font-medium text-ink">{i.name}</p><p className="text-[11px] text-ink-soft">{i.note}</p></div>
                <Badge tone={i.status === "Configurable" ? "brand" : "good"}>
                  <CheckCircle2 size={11} className="mr-1 inline" />{i.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "Security" && (
        <Card>
          <CardHeader title="Security" subtitle="Identity & governance" />
          <div className="divide-y divide-line">
            {[
              ["Entra ID (per-agent identity)", "Enabled"],
              ["Key Vault secret references", "Enabled"],
              ["Audit logging (evidence chain)", "Enabled"],
              ["Delegated least-privilege scopes", "Mail.Read · Calendars.Read · Chat.Read · User.Read.All"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink">{k}</span>
                <span className="text-[11px] text-risk-low">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "AI Settings" && (
        <Card>
          <CardHeader title="AI Agent Settings" subtitle="Reliability & abstention behavior" />
          <div className="space-y-5 p-4">
            <Slider label="Confidence threshold" hint="Below this, DecisionDNA abstains and shows weak matches." value={threshold} set={setThreshold} />
            <Slider label="Risk sensitivity" hint="How aggressively risk is flagged." value={riskThreshold} set={setRiskThreshold} />
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-ink">Abstention mode</p><p className="text-[11px] text-ink-soft">Refuse to fabricate risk/objections on thin evidence.</p></div>
              <Toggle on={abstention} onClick={() => setAbstention((v) => !v)} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-ink">Auto-detect decisions</p><p className="text-[11px] text-ink-soft">Detect decisions live from meeting transcripts.</p></div>
              <Toggle on={autoDetect} onClick={() => setAutoDetect((v) => !v)} />
            </div>
          </div>
        </Card>
      )}

      {tab === "Team" && (
        <Card>
          <CardHeader title="Team" subtitle="Members with access to organizational memory" />
          <div className="divide-y divide-line">
            {[
              ["Laura Mitchell", "Senior Product Manager", "Owner"],
              ["Daniel Reyes", "Finance Lead", "Admin"],
              ["Jane Smith", "SRE Lead", "Member"],
              ["Carlos Mendes", "VP Operations", "Admin"],
            ].map(([name, role, access]) => (
              <div key={name} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={name} size={30} />
                <div className="flex-1"><p className="text-sm font-medium text-ink">{name}</p><p className="text-[11px] text-ink-soft">{role}</p></div>
                <Badge tone="neutral">{access}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-brand-600" : "bg-line"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function Slider({ label, hint, value, set }: { label: string; hint: string; value: number; set: (n: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="text-sm font-bold text-brand-400">{Math.round(value * 100)}%</span>
      </div>
      <p className="text-[11px] text-ink-soft">{hint}</p>
      <input type="range" min={0.3} max={0.95} step={0.01} value={value} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full accent-brand-600" />
    </div>
  );
}
