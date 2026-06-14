import { NextResponse } from "next/server";
import { getRepository } from "@/lib/memory/cosmos";
import { triggerApproval } from "@/lib/agents/approval";
import type { ApprovalStatus, DecisionAnalysis, StoredDecision } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/approve
 * Body: { analysis: DecisionAnalysis, action: "approved"|"review"|"rejected", rationale?: string }
 * Triggers the (mock) Power Automate approval card and writes the decision to
 * organizational memory.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { analysis, action, rationale } = body as {
      analysis: DecisionAnalysis;
      action: ApprovalStatus | "review";
      rationale?: string;
    };

    if (!analysis?.detection) {
      return NextResponse.json(
        { error: "Missing analysis payload." },
        { status: 400 },
      );
    }

    const status: ApprovalStatus =
      action === "review" ? "review" : (action as ApprovalStatus);

    const now = new Date().toISOString();
    const id = `dec-new-${Date.parse(now)}`;

    const stored: StoredDecision = {
      id,
      proposal: analysis.detection.proposal,
      proposer: analysis.detection.proposer,
      timestamp: analysis.detection.timestamp,
      approvalStatus: status,
      rationale,
      risk: analysis.risk,
      confidence: analysis.confidence,
      matches: analysis.matches,
      whoWasRight: analysis.whoWasRight,
      recommendations: analysis.recommendations,
      citations: analysis.citations,
      createdAt: now,
      updatedAt: now,
    };

    const repo = getRepository();
    await repo.createDecision(stored);

    const approval = triggerApproval({
      decisionId: id,
      proposal: stored.proposal,
      proposer: stored.proposer,
      risk: stored.risk,
      topObjections: stored.whoWasRight,
    });

    return NextResponse.json({
      stored,
      approval,
      message: "Decision added to Organizational Memory.",
    });
  } catch (err) {
    console.error("[/api/approve]", err);
    return NextResponse.json(
      { error: "Approval failed", detail: String(err) },
      { status: 500 },
    );
  }
}
