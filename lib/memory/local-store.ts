/**
 * Local JSON-file implementation of the DecisionRepository (mock Cosmos DB).
 * Persists newly analyzed/approved decisions and alerts to data/.memory-store.json
 * (gitignored). Seeds a few alerts on first use so the Alerts screen is alive.
 *
 * Server-only (uses node:fs). Do not import from client components.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type {
  Alert,
  ApprovalStatus,
  StoredDecision,
} from "@/lib/types";
import type {
  DecisionFilters,
  DecisionRepository,
} from "@/lib/memory/cosmos";

interface StoreShape {
  decisions: StoredDecision[];
  alerts: Alert[];
}

const STORE_PATH = join(process.cwd(), "data", ".memory-store.json");

function seededAlerts(): Alert[] {
  return [
    {
      id: "alert-1",
      severity: "High",
      type: "high-risk-pending",
      title: "High-risk decision pending approval",
      description:
        "Reduce Customer Support Staffing by 20% — historical precedent went negative.",
      timestamp: "2026-06-13T09:10:00Z",
      decisionId: "dec-2023-0312-support-staffing",
      read: false,
    },
    {
      id: "alert-2",
      severity: "Medium",
      type: "similar-decision-found",
      title: "Similar decision found",
      description:
        "A new proposal closely matches 'Support Team Restructure' (2022).",
      timestamp: "2026-06-13T08:40:00Z",
      decisionId: "dec-2022-1118-support-restructure",
      read: false,
    },
    {
      id: "alert-3",
      severity: "Medium",
      type: "approval-overdue",
      title: "Approval overdue",
      description: "Engineering Hiring Freeze approval has been pending 48h.",
      timestamp: "2026-06-12T17:00:00Z",
      decisionId: "dec-2024-0220-eng-hiring-freeze",
      read: false,
    },
    {
      id: "alert-4",
      severity: "Low",
      type: "outcome-recorded",
      title: "Outcome recorded for past decision",
      description:
        "SaaS Pricing Increase outcome updated: net revenue +6% (below target).",
      timestamp: "2026-06-12T11:20:00Z",
      decisionId: "dec-2024-0114-pricing-increase",
      read: true,
    },
  ];
}

export class LocalStore implements DecisionRepository {
  private load(): StoreShape {
    if (existsSync(STORE_PATH)) {
      try {
        return JSON.parse(readFileSync(STORE_PATH, "utf8")) as StoreShape;
      } catch {
        // fall through to fresh seed on corruption
      }
    }
    return { decisions: [], alerts: seededAlerts() };
  }

  private save(shape: StoreShape): void {
    // Best-effort persistence. On read-only filesystems (e.g. some serverless
    // hosts) writes can fail — never let that crash a request; keep the
    // in-memory result so approve/store still returns successfully.
    try {
      writeFileSync(STORE_PATH, JSON.stringify(shape, null, 2));
    } catch (err) {
      console.warn("[DecisionDNA] memory store not persisted (read-only fs?):", String(err));
    }
  }

  async listDecisions(filters?: DecisionFilters): Promise<StoredDecision[]> {
    let items = this.load().decisions;
    if (filters?.status) {
      items = items.filter((d) => d.approvalStatus === filters.status);
    }
    if (typeof filters?.minConfidence === "number") {
      items = items.filter(
        (d) => d.confidence.confidence >= filters.minConfidence!,
      );
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (d) =>
          d.proposal.toLowerCase().includes(q) ||
          d.proposer.toLowerCase().includes(q),
      );
    }
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getDecision(id: string): Promise<StoredDecision | null> {
    return this.load().decisions.find((d) => d.id === id) ?? null;
  }

  async createDecision(decision: StoredDecision): Promise<StoredDecision> {
    const shape = this.load();
    shape.decisions.push(decision);
    // Emit an alert reflecting the new memory entry.
    shape.alerts.unshift({
      id: `alert-${decision.id}`,
      severity: decision.risk?.overall ?? "Low",
      type: "outcome-recorded",
      title: "Decision added to Organizational Memory",
      description: decision.proposal,
      timestamp: decision.createdAt,
      decisionId: decision.id,
      read: false,
    });
    this.save(shape);
    return decision;
  }

  async updateApproval(
    id: string,
    status: ApprovalStatus,
    rationale?: string,
  ): Promise<StoredDecision | null> {
    const shape = this.load();
    const d = shape.decisions.find((x) => x.id === id);
    if (!d) return null;
    d.approvalStatus = status;
    if (rationale) d.rationale = rationale;
    d.updatedAt = new Date().toISOString();
    this.save(shape);
    return d;
  }

  async listAlerts(): Promise<Alert[]> {
    return this.load().alerts.sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
  }

  async addAlert(alert: Alert): Promise<Alert> {
    const shape = this.load();
    shape.alerts.unshift(alert);
    this.save(shape);
    return alert;
  }

  async markAlertRead(id: string): Promise<void> {
    const shape = this.load();
    const a = shape.alerts.find((x) => x.id === id);
    if (a) {
      a.read = true;
      this.save(shape);
    }
  }
}
