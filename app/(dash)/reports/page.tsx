"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, Stat, Skeleton } from "@/components/ui/primitives";
import { useJson } from "@/lib/use-fetch";

interface ReportData {
  kpis: {
    totalDecisions: number;
    avgConfidence: number;
    highRisk: number;
    decisionQualityScore: number;
    whoWasRightAccuracy: number;
  };
  riskDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  volumeByYear: Record<string, number>;
  histogram: { bucket: string; count: number }[];
  teamPerformance: {
    name: string;
    role: string;
    decisions: number;
    validationRate: number;
  }[];
}

const RISK_COLORS: Record<string, string> = {
  High: "#dc2626",
  Medium: "#d97706",
  Low: "#16a34a",
};
const OUTCOME_COLORS: Record<string, string> = {
  positive: "#16a34a",
  negative: "#dc2626",
  mixed: "#d97706",
  neutral: "#94a3b8",
};

export default function ReportsPage() {
  const { data, loading } = useJson<ReportData>("/api/reports");

  if (loading || !data) {
    return <Skeleton className="h-96" />;
  }

  const riskData = Object.entries(data.riskDistribution).map(([name, value]) => ({ name, value }));
  const outcomeData = Object.entries(data.outcomeDistribution).map(([name, value]) => ({ name, value }));
  const volumeData = Object.entries(data.volumeByYear)
    .sort()
    .map(([year, count]) => ({ year, count }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold text-ink">Reports</h1>
        <p className="text-xs text-ink-soft">Insights and analytics across organizational decisions.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Decision Quality" value={`${data.kpis.decisionQualityScore}`} tone="brand" hint="avg confidence index" />
        <Stat label="Who-Was-Right Accuracy" value={`${Math.round(data.kpis.whoWasRightAccuracy * 100)}%`} tone="good" />
        <Stat label="High Risk" value={data.kpis.highRisk} tone="bad" />
        <Stat label="Total Decisions" value={data.kpis.totalDecisions} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Decision Volume by Year" />
          <div className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData}>
                <XAxis dataKey="year" fontSize={11} stroke="#9aa0b0" />
                <YAxis fontSize={11} stroke="#9aa0b0" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Confidence Distribution" />
          <div className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.histogram}>
                <XAxis dataKey="bucket" fontSize={10} stroke="#9aa0b0" />
                <YAxis fontSize={11} stroke="#9aa0b0" allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Risk Distribution" />
          <div className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {riskData.map((d) => (
                    <Cell key={d.name} fill={RISK_COLORS[d.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Outcome Distribution" />
          <div className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={outcomeData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {outcomeData.map((d) => (
                    <Cell key={d.name} fill={OUTCOME_COLORS[d.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Team Performance — Prediction Accuracy" subtitle="Who consistently predicts outcomes correctly" />
        <div className="divide-y divide-line">
          <div className="grid grid-cols-[1fr_120px_120px] gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            <span>Stakeholder</span>
            <span>Decisions</span>
            <span>Validation Rate</span>
          </div>
          {data.teamPerformance.map((p) => (
            <div key={p.name} className="grid grid-cols-[1fr_120px_120px] items-center gap-3 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">{p.name}</p>
                <p className="text-[11px] text-ink-soft">{p.role}</p>
              </div>
              <span className="text-sm text-ink">{p.decisions}</span>
              <span className="text-sm font-semibold text-risk-low">
                {Math.round(p.validationRate * 100)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
