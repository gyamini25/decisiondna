import { NextResponse } from "next/server";
import { getCorpus } from "@/lib/search";
import { listPeople } from "@/lib/workiq/graph";
import { listAllDecisions } from "@/lib/decisions-view";

export const runtime = "nodejs";

/** GET /api/reports — aggregated analytics for the Reports screen. */
export async function GET() {
  const corpus = getCorpus();
  const all = await listAllDecisions();
  const people = listPeople();

  const avgConfidence =
    corpus.reduce((s, r) => s + r.evidenceSignals.confidence, 0) / corpus.length;

  const riskDistribution = all.reduce(
    (acc, d) => {
      acc[d.risk] += 1;
      return acc;
    },
    { High: 0, Medium: 0, Low: 0 } as Record<string, number>,
  );

  // Who-was-right accuracy across all predictions.
  let totalPredictions = 0;
  let correctPredictions = 0;
  for (const r of corpus) {
    for (const w of r.whoWasRight) {
      totalPredictions += 1;
      if (w.status === "validated" || w.status === "partially-validated") {
        correctPredictions += 1;
      }
    }
  }
  const whoWasRightAccuracy = totalPredictions
    ? correctPredictions / totalPredictions
    : 0;

  // Outcome distribution.
  const outcomeDistribution = corpus.reduce(
    (acc, r) => {
      acc[r.outcome.netAssessment] = (acc[r.outcome.netAssessment] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Decision volume by year.
  const volumeByYear = corpus.reduce(
    (acc, r) => {
      const y = r.dateProposed.slice(0, 4);
      acc[y] = (acc[y] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Confidence histogram (deciles).
  const histogram = Array.from({ length: 5 }, (_, i) => ({
    bucket: `${i * 20}-${i * 20 + 20}%`,
    count: 0,
  }));
  for (const r of corpus) {
    const idx = Math.min(4, Math.floor(r.evidenceSignals.confidence * 5));
    histogram[idx].count += 1;
  }

  const teamPerformance = people
    .map((p) => ({
      name: p.name,
      role: p.role,
      decisions: corpus.filter(
        (r) =>
          r.owner === p.name || r.objections.some((o) => o.raisedBy === p.name),
      ).length,
      validationRate: p.validationRate,
      influence: p.influence,
    }))
    .sort((a, b) => b.validationRate - a.validationRate);

  return NextResponse.json({
    kpis: {
      totalDecisions: all.length,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      highRisk: riskDistribution.High,
      pending: all.filter((d) => d.status === "pending").length,
      decisionQualityScore: Math.round(avgConfidence * 100),
      whoWasRightAccuracy: Math.round(whoWasRightAccuracy * 100) / 100,
    },
    riskDistribution,
    outcomeDistribution,
    volumeByYear,
    histogram,
    teamPerformance,
  });
}
