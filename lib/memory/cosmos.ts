/**
 * Decision memory repository contract (the Cosmos DB abstraction).
 *
 * In production this is backed by Azure Cosmos DB (serverless, container
 * `decisions`, partition key /proposer). For the demo it's backed by a local
 * JSON file (lib/memory/local-store.ts) implementing the same interface, so the
 * approval → store → recall loop works end-to-end without a cloud account.
 */

import type { Alert, ApprovalStatus, StoredDecision } from "@/lib/types";

export interface DecisionFilters {
  status?: ApprovalStatus;
  minConfidence?: number;
  search?: string;
}

export interface DecisionRepository {
  listDecisions(filters?: DecisionFilters): Promise<StoredDecision[]>;
  getDecision(id: string): Promise<StoredDecision | null>;
  createDecision(decision: StoredDecision): Promise<StoredDecision>;
  updateApproval(
    id: string,
    status: ApprovalStatus,
    rationale?: string,
  ): Promise<StoredDecision | null>;

  listAlerts(): Promise<Alert[]>;
  addAlert(alert: Alert): Promise<Alert>;
  markAlertRead(id: string): Promise<void>;
}

import { LocalStore } from "@/lib/memory/local-store";

let repo: DecisionRepository | null = null;

export function getRepository(): DecisionRepository {
  if (!repo) repo = new LocalStore();
  return repo;
}
