"use client";

import { useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Download } from "lucide-react";
import { Card, CardHeader, Stat, Skeleton } from "@/components/ui/primitives";
import { useJson } from "@/lib/use-fetch";

interface ReportData {
  kpis: { decisionsAnalyzed: number; avgConfidence: number; highRisk: number; decisionQualityScore: number; whoWasRightAccuracy: number };
  riskDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  volumeByYear: Record<string, number>;
  histogram: { bucket: string; count: number }[];
  trend: { year: string; quality: number }[];
  topRiskFactors: { factor: string; pct: number }[];
  outcomeByQuarter: { quarter: string; successful: number; mixed: number; unsuccessful: number }[];
  insightsSummary: string[];
  teamPerformance: { name: string; role: string; decisions: number; validationRate: number }[];
}

const RISK_COLORS: Record<string, string> = { High: "#f87171", Medium: "#fbbf24", Low: "#34d399" };
const OUTCOME_COLORS: Record<string, string> = { positive: "#34d399", negative: "#f87171", mixed: "#fbbf24", neutral: "#94a3b8" };
const TABS = ["Overview", "Risk Analysis", "Outcome Analysis", "Team Performance", "Trends"] as const;

export default function ReportsPage() {
  const { data, loading } = useJson<ReportData>("/api/reports");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  if (loading || !data) return <Skeleton className="h-96" />;

  const riskData = Object.entries(data.riskDistribution).map(([name, value]) => ({ name, value }));
  const outcomeData = Object.entries(data.outcomeDistribution).map(([name, value]) => ({ name, value }));
  const volumeData = Object.entries(data.volumeByYear).sort().map(([year, count]) => ({ year, count }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">Reports</h1>
          <p className="text-xs text-ink-soft">Insights and analytics across organizational decisions.</p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-soft hover:bg-surface-2">
          <Download size={14} /> Export
        </button>
      </div>

      <div className="flex gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full border px-3 py-1 text-xs ${tab === t ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-ink-soft hover:bg-surface-2"}`}>
            {t}
          </button>
        ))}
      </div>

      {(tab === "Overview" || tab === "Trends") && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Stat label="Decision Quality" value={data.kpis.decisionQualityScore} tone="brand" hint="avg confidence index" />
          <Stat label="Who-Was-Right" value={`${Math.round(data.kpis.whoWasRightAccuracy * 100)}%`} tone="good" />
          <Stat label="High Risk" value={data.kpis.highRisk} tone="bad" />
          <Stat label="Decisions" value={data.kpis.decisionsAnalyzed} />
        </div>
      )}

      {tab === "Overview" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Decision Outcomes">
            <PieChart>
              <Pie data={outcomeData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} isAnimationActive={false} label>
                {outcomeData.map((d) => <Cell key={d.name} fill={OUTCOME_COLORS[d.name] ?? "#94a3b8"} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ChartCard>
          <ChartCard title="Risk Distribution">
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} isAnimationActive={false} label>
                {riskData.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name] ?? "#94a3b8"} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ChartCard>
          <ChartCard title="Decision Quality Trend">
            <LineChart data={data.trend}>
              <XAxis dataKey="year" fontSize={11} stroke="#97a1ba" />
              <YAxis fontSize={11} stroke="#97a1ba" domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="quality" stroke="#818cf8" strokeWidth={2} dot isAnimationActive={false} />
            </LineChart>
          </ChartCard>
          <Card>
            <CardHeader title="Insights Summary" />
            <ul className="space-y-2 p-4">
              {data.insightsSummary.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px] text-ink-soft">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />{s}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {tab === "Risk Analysis" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Risk Distribution">
            <PieChart>
              <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={80} isAnimationActive={false} label>
                {riskData.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name] ?? "#94a3b8"} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ChartCard>
          <Card>
            <CardHeader title="Top Risk Factors" />
            <div className="space-y-3 p-4">
              {data.topRiskFactors.map((f) => (
                <div key={f.factor}>
                  <div className="flex justify-between text-[11px]">
                    <span className="capitalize text-ink-soft">{f.factor}</span>
                    <span className="font-semibold text-ink">{f.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Outcome Analysis" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Outcome by Quarter">
            <BarChart data={data.outcomeByQuarter}>
              <XAxis dataKey="quarter" fontSize={10} stroke="#97a1ba" />
              <YAxis fontSize={11} stroke="#97a1ba" allowDecimals={false} />
              <Tooltip /><Legend />
              <Bar dataKey="successful" stackId="a" fill="#34d399" isAnimationActive={false} />
              <Bar dataKey="mixed" stackId="a" fill="#fbbf24" isAnimationActive={false} />
              <Bar dataKey="unsuccessful" stackId="a" fill="#f87171" isAnimationActive={false} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Confidence Distribution">
            <BarChart data={data.histogram}>
              <XAxis dataKey="bucket" fontSize={10} stroke="#97a1ba" />
              <YAxis fontSize={11} stroke="#97a1ba" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {tab === "Trends" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartCard title="Decision Volume by Year">
            <BarChart data={volumeData}>
              <XAxis dataKey="year" fontSize={11} stroke="#97a1ba" />
              <YAxis fontSize={11} stroke="#97a1ba" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Decision Quality Trend">
            <LineChart data={data.trend}>
              <XAxis dataKey="year" fontSize={11} stroke="#97a1ba" />
              <YAxis fontSize={11} stroke="#97a1ba" domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="quality" stroke="#818cf8" strokeWidth={2} dot isAnimationActive={false} />
            </LineChart>
          </ChartCard>
        </div>
      )}

      {tab === "Team Performance" && (
        <Card>
          <CardHeader title="Team Performance — Prediction Accuracy" subtitle="Who consistently predicts outcomes correctly" />
          <div className="divide-y divide-line">
            <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              <span>Stakeholder</span><span>Decisions</span><span>Validation Rate</span>
            </div>
            {data.teamPerformance.map((p) => (
              <div key={p.name} className="grid grid-cols-[1fr_120px_120px] items-center gap-3 px-4 py-2.5">
                <div><p className="text-sm font-medium text-ink">{p.name}</p><p className="text-[11px] text-ink-soft">{p.role}</p></div>
                <span className="text-sm text-ink">{p.decisions}</span>
                <span className="text-sm font-semibold text-risk-low">{Math.round(p.validationRate * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="h-60 p-3">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </Card>
  );
}
