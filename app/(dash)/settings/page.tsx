"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardHeader, Badge } from "@/components/ui/primitives";

const INTEGRATIONS = [
  { name: "Microsoft Teams", status: "Mock", note: "Adaptive Card approval" },
  { name: "Azure OpenAI", status: "Configurable", note: "gpt + text-embedding-3-large" },
  { name: "Azure AI Search", status: "Mock", note: "hybrid vector retrieval" },
  { name: "Azure Cosmos DB", status: "Mock", note: "decision memory store" },
  { name: "Microsoft Graph", status: "Mock", note: "Work IQ — mail/calendar/people" },
  { name: "Power Automate", status: "Mock", note: "approval workflow" },
];

export default function SettingsPage() {
  const [threshold, setThreshold] = useState(0.6);
  const [abstention, setAbstention] = useState(true);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Settings</h1>
        <p className="text-xs text-ink-soft">Configure DecisionDNA behavior and integrations.</p>
      </div>

      <Card>
        <CardHeader title="AI Preferences" subtitle="Control the reliability/abstention behavior" />
        <div className="space-y-5 p-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-ink">Confidence threshold</label>
              <span className="text-sm font-bold text-brand-600">{Math.round(threshold * 100)}%</span>
            </div>
            <p className="text-[11px] text-ink-soft">
              Below this confidence, DecisionDNA abstains and shows weak matches instead of analysis.
            </p>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-2 w-full accent-brand-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">Abstention mode</p>
              <p className="text-[11px] text-ink-soft">
                Refuse to fabricate risk/objections when evidence is insufficient.
              </p>
            </div>
            <button
              onClick={() => setAbstention((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${abstention ? "bg-brand-600" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${abstention ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Integrations" subtitle="Microsoft stack — swap mocks for live services via env" />
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className="flex items-center justify-between rounded-lg border border-line p-3">
              <div>
                <p className="text-sm font-medium text-ink">{i.name}</p>
                <p className="text-[11px] text-ink-soft">{i.note}</p>
              </div>
              <Badge tone={i.status === "Configurable" ? "brand" : "neutral"}>
                <CheckCircle2 size={11} className="mr-1 inline" />
                {i.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
