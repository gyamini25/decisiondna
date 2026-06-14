import { NextResponse } from "next/server";
import { analyzeDecision } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";

/**
 * POST /api/copilot  { question }
 * The DecisionDNA Copilot answers questions about past decisions by running the
 * full grounded pipeline over the question and composing a cited answer.
 */
export async function POST(req: Request) {
  try {
    const { question } = (await req.json().catch(() => ({}))) as { question?: string };
    if (!question || question.trim().length < 3) {
      return NextResponse.json({ error: "Ask a question." }, { status: 400 });
    }

    const a = await analyzeDecision({ text: question });

    let answer: string;
    if (a.type === "insufficient-evidence") {
      answer = `I don't have a strong precedent for that. ${a.message}`;
    } else {
      const top = a.matches[0];
      const validated = a.whoWasRight
        .filter((w) => w.verdict === "Concern Validated" || w.verdict === "Recommendation Proven")
        .map((w) => w.stakeholder);
      const rec = a.recommendations[0]?.action;
      answer =
        `Yes — we've faced similar decisions. The closest is “${top.title}” ` +
        `(${top.matchPct}% match), which resulted in: ${top.outcomeSummary} ` +
        `Overall risk: ${a.risk?.overall ?? "Unknown"}.` +
        (validated.length ? ` Proven right last time: ${validated.join(", ")}.` : "") +
        (rec ? ` Recommended: ${rec}.` : "");
    }

    return NextResponse.json({
      answer,
      type: a.type,
      matches: a.matches.map((m) => ({ title: m.title, matchPct: m.matchPct, id: m.decisionId })),
      citations: a.citations.slice(0, 4),
      confidence: a.confidence.confidence,
    });
  } catch (err) {
    console.error("[/api/copilot]", err);
    return NextResponse.json({ error: "Copilot failed", detail: String(err) }, { status: 500 });
  }
}
