/**
 * Agent 8 — ApprovalAgent (mock Power Automate / Teams Adaptive Card).
 *
 * In production this triggers a Power Automate flow that posts an Adaptive Card
 * to the proposer's manager in Teams (Approve / Request Review / Reject, with a
 * mandatory free-text reason on "Approve Anyway"). Here we generate the same
 * Adaptive Card payload and echo a deterministic webhook result so the approval
 * loop is demoable end-to-end without a live tenant.
 */

import type {
  RiskAssessment,
  WhoWasRightCard,
} from "@/lib/types";

export interface ApprovalRequest {
  decisionId: string;
  proposal: string;
  proposer: string;
  risk: RiskAssessment | null;
  topObjections: WhoWasRightCard[];
}

export interface ApprovalResult {
  triggered: boolean;
  channel: "teams-adaptive-card";
  adaptiveCard: unknown;
  message: string;
}

export function buildAdaptiveCard(req: ApprovalRequest): unknown {
  const riskLevel = req.risk?.overall ?? "Unknown";
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        size: "Large",
        weight: "Bolder",
        text: "DecisionDNA — Approval Required",
      },
      { type: "TextBlock", wrap: true, text: req.proposal },
      {
        type: "FactSet",
        facts: [
          { title: "Proposer", value: req.proposer },
          { title: "Risk Level", value: riskLevel },
          {
            title: "Top Objections",
            value: req.topObjections
              .slice(0, 3)
              .map((o) => `${o.stakeholder}: ${o.verdict}`)
              .join("; "),
          },
        ],
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Approve", data: { action: "approved" } },
      {
        type: "Action.Submit",
        title: "Request Review",
        data: { action: "review" },
      },
      { type: "Action.Submit", title: "Reject", data: { action: "rejected" } },
    ],
  };
}

export function triggerApproval(req: ApprovalRequest): ApprovalResult {
  const card = buildAdaptiveCard(req);
  return {
    triggered: true,
    channel: "teams-adaptive-card",
    adaptiveCard: card,
    message: `Approval card routed to the manager of ${req.proposer} (mock Power Automate).`,
  };
}
