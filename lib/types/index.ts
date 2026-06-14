/**
 * DecisionDNA — shared domain types.
 *
 * These types are the contract between the corpus (data/corpus/*.json), the
 * evidence-scoring engine (lib/scoring.ts, lib/confidence.ts), the agent
 * pipeline (lib/agents/*), the memory store (lib/memory/*), and the API/UI.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Normalised trend used by the directional-correctness signal. */
export type Trend = "up" | "down" | "flat";

/** Direction vocabulary as authored in the corpus objections. */
export type PredictedDirection = "increase" | "decrease" | "neutral";

/** Direction vocabulary as authored in corpus outcomes. */
export type OutcomeDirection =
  | "decline"
  | "stable"
  | "improvement"
  | "increase"
  | "decrease";

export type NetAssessment = "positive" | "negative" | "mixed" | "neutral";

export type ImpactLevel = "High" | "Medium" | "Low";

export type RiskDimension =
  | "customer"
  | "operational"
  | "financial"
  | "execution";

export type Severity = "high" | "medium" | "low";

export type ObjectionResult =
  | "validated"
  | "partially-validated"
  | "recommendation-proven"
  | "mitigated"
  | "not-validated";

export type WhoWasRightVerdict =
  | "validated"
  | "partially-validated"
  | "not-validated";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "review";

// ---------------------------------------------------------------------------
// Corpus record (matches data/corpus/*.json — the synthetic decision memory)
// ---------------------------------------------------------------------------

export interface EvidenceSource {
  type: "transcript" | "email-thread" | "document" | "chat";
  ref: string;
  quality: number; // 0..1 source quality
}

export interface EvidenceSummary {
  meetings: number;
  emails: number;
  documents: number;
  sources: EvidenceSource[];
}

export interface Objection {
  raisedBy: string;
  role: string;
  objection: string;
  predictedDirection: PredictedDirection;
  result: ObjectionResult;
  evidence: string;
}

export interface WhoWasRightEntry {
  stakeholder: string;
  prediction: string;
  outcome: string;
  status: WhoWasRightVerdict | ObjectionResult;
}

export interface RiskMaterialized {
  type: RiskDimension;
  severity: Severity;
  description: string;
}

export interface DecisionOutcome {
  summary: string;
  direction: OutcomeDirection;
  metrics: Record<string, number>;
  netAssessment: NetAssessment;
  reversed: boolean;
}

/** Precomputed signal vector stored on each corpus record (ground truth for tests). */
export interface EvidenceSignals {
  semanticSimilarity: number;
  entityAlignment: number;
  temporalConsistency: number;
  directionalCorrectness: number;
  sFinal: number;
  confidence: number;
  rank: number;
}

export interface DecisionRecord {
  id: string;
  orgId: string;
  title: string;
  proposal: string;
  owner: string;
  category: string;
  meeting: string;
  dateProposed: string; // ISO date
  dateDecided: string; // ISO date
  status: ApprovalStatus;
  impactLevel: ImpactLevel;
  evidence: EvidenceSummary;
  objections: Objection[];
  whoWasRight: WhoWasRightEntry[];
  risksMaterialized: RiskMaterialized[];
  outcome: DecisionOutcome;
  evidenceSignals: EvidenceSignals;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Scoring engine
// ---------------------------------------------------------------------------

/** The four independent evidence signals (raw, 0..1 each). */
export interface SignalVector {
  semantic: number;
  entity: number;
  temporal: number;
  directional: number;
}

export type ConfidenceCategory = "high" | "moderate" | "low" | "insufficient";

export interface ConfidenceResult {
  /** C = 1 - Var(signals), after any disagreement penalty. */
  confidence: number;
  category: ConfidenceCategory;
  /** Variance of the four signals before penalties. */
  variance: number;
  /** True when the semantic-only-match guard fired. */
  disagreement: boolean;
  disagreementFlag?: "semantic-only-match";
  /** Human-readable explanation for the UI. */
  explanation: string;
  /** Names of signals that diverge most from the mean (for the UI). */
  divergingSignals: string[];
}

export interface ScoredCandidate {
  record: DecisionRecord;
  signals: SignalVector;
  /** Weighted composite S_final. */
  sFinal: number;
  /** Rank metric R = S_final * confidence. */
  rank: number;
  confidence: ConfidenceResult;
  /** Per-signal contribution to S_final, for the breakdown tooltip. */
  contributions: SignalVector;
}

// ---------------------------------------------------------------------------
// Agent pipeline I/O
// ---------------------------------------------------------------------------

export interface DecisionDetection {
  isDecision: boolean;
  proposal: string;
  proposer: string;
  timestamp: string;
  /** Detection confidence 0..1. */
  confidence: number;
  /** Predicted directional intent of the proposal. */
  direction: Trend;
  entities: string[];
  metric?: string;
}

export interface RiskScore {
  dimension: RiskDimension;
  score: number; // 1..10
  level: "High" | "Medium" | "Low";
  reasoning: string;
}

export interface RiskAssessment {
  overall: "High" | "Medium" | "Low";
  dimensions: RiskScore[];
  rationale: string;
}

export interface Recommendation {
  action: string;
  priority: "High" | "Medium" | "Low";
  rationale: string;
  /** Optional citation back to the decision that motivates this action. */
  sourceDecisionId?: string;
}

export interface Citation {
  decisionId: string;
  title: string;
  date: string;
  sourceType: EvidenceSource["type"];
  ref: string;
  quality: number;
}

/** A surfaced objection joined with the "who was right" outcome. */
export interface WhoWasRightCard {
  stakeholder: string;
  role: string;
  claim: string;
  outcome: string;
  verdict: "Concern Validated" | "Recommendation Proven" | "Incorrect" | "Mitigated";
  sourceDecisionId: string;
  sourceTitle: string;
}

/** A match card surfaced in Decision Guard center panel. */
export interface MatchCard {
  decisionId: string;
  title: string;
  date: string;
  impact: ImpactLevel;
  matchPct: number; // round(sFinal * 100)
  signals: SignalVector;
  confidence: ConfidenceResult;
  evidence: EvidenceSummary;
  outcomeSummary: string;
  netAssessment: NetAssessment;
}

export type AnalysisType = "analysis" | "insufficient-evidence";

export interface DecisionAnalysis {
  type: AnalysisType;
  detection: DecisionDetection;
  matches: MatchCard[];
  whoWasRight: WhoWasRightCard[];
  risk: RiskAssessment | null;
  recommendations: Recommendation[];
  citations: Citation[];
  /** Foundry IQ grounding summary (cited, source-diversity-checked evidence). */
  grounding?: GroundingSummary;
  /** Aggregate confidence of the top match (or best weak match when abstaining). */
  confidence: ConfidenceResult;
  evidenceTotals: { meetings: number; emails: number; documents: number; chats: number };
  /** Which intelligence backend served this analysis. */
  backend?: "mock" | "azure-openai";
  /** Present only when type === "insufficient-evidence". */
  weakMatches?: MatchCard[];
  message?: string;
  telemetry: TelemetryStep[];
}

export interface GroundingSummary {
  groundedSources: number;
  sourceDiversityScore: number;
  totalEvidenceCount: number;
  passed: boolean;
}

export interface TelemetryStep {
  step: string;
  agent: string;
  latencyMs: number;
  confidence?: number;
  note?: string;
}

// ---------------------------------------------------------------------------
// Memory store (mock Cosmos)
// ---------------------------------------------------------------------------

export interface StoredDecision {
  id: string;
  proposal: string;
  proposer: string;
  timestamp: string;
  approvalStatus: ApprovalStatus;
  rationale?: string;
  risk: RiskAssessment | null;
  confidence: ConfidenceResult;
  matches: MatchCard[];
  whoWasRight: WhoWasRightCard[];
  recommendations: Recommendation[];
  citations: Citation[];
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  severity: "High" | "Medium" | "Low";
  type:
    | "high-risk-pending"
    | "similar-decision-found"
    | "approval-overdue"
    | "outcome-recorded";
  title: string;
  description: string;
  timestamp: string;
  decisionId?: string;
  read: boolean;
}

// ---------------------------------------------------------------------------
// Work IQ (mock Microsoft Graph)
// ---------------------------------------------------------------------------

export interface Meeting {
  id: string;
  title: string;
  date: string;
  status: "upcoming" | "live" | "past";
  participants: { name: string; role: string }[];
  transcriptRef?: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  influence: number; // 0..1
  validationRate: number; // 0..1 — how often their predictions proved right
}

// ---------------------------------------------------------------------------
// Work IQ — month of organizational signal (emails, meetings, chats, docs)
// ---------------------------------------------------------------------------

export interface WorkEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  excerpt: string;
  topic: string;
  date: string;
  importance: "high" | "normal";
  decisionSignal: boolean;
}

export interface WorkChat {
  id: string;
  channel: string;
  from: string;
  text: string;
  topic: string;
  date: string;
}

export interface WorkDocument {
  id: string;
  title: string;
  kind: string;
  topic: string;
  author: string;
  date: string;
  source: string;
}

export interface DecisionLogEntry {
  id: string;
  title: string;
  owner: string;
  topic: string;
  date: string;
  status: ApprovalStatus;
  confidence: number;
  risk: "High" | "Medium" | "Low";
}

export interface WorkPersonProfile {
  id: string;
  name: string;
  role: string;
  dept: string;
  meetings: number;
  emails: number;
  chats: number;
  decisions: number;
  influence: number; // 0..1 from activity
  validationRate: number; // 0..1 from corpus who-was-right
  topConnections: string[];
}

export interface Relationship {
  a: string;
  b: string;
  strength: number;
}

export interface WorkMemory {
  counts: {
    people: number;
    meetings: number;
    emails: number;
    chats: number;
    documents: number;
    decisions: number;
  };
  people: WorkPersonProfile[];
  relationships: Relationship[];
  topics: { topic: string; count: number }[];
  activity: { date: string; meetings: number; emails: number; chats: number }[];
  recentDecisions: DecisionLogEntry[];
  decisionSignals: number; // emails flagged as decision-relevant
}
