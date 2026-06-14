# DecisionDNA — Architecture

## System overview

DecisionDNA is a layered agentic system. Surfaces call a single orchestrating
agent; the agent composes Semantic-Kernel-style plugins; plugins read from the IQ
context layer; everything is governed by Entra identity and persisted to decision
memory.

```
┌──────────────────────────────────────────────────────────────────────┐
│ SURFACE        M365 Copilot Chat │ Copilot Studio │ Next.js dashboard  │
├──────────────────────────────────────────────────────────────────────┤
│ ORCHESTRATION  DecisionDNA Agent (Microsoft Agent Framework 1.0 + SK)  │
│   1 Detect → 2 Retrieve → 3 Score → 4 Risk → 5 Who-Was-Right →         │
│   6 Recommend → 7 Approve → (Store)        + telemetry per step        │
├──────────────────────────────────────────────────────────────────────┤
│ IQ CONTEXT     Work IQ (Graph) │ Foundry IQ (RAG) │ Azure AI Search    │
├──────────────────────────────────────────────────────────────────────┤
│ DATA & MEMORY  Microsoft Graph │ Azure Cosmos DB │ Azure OpenAI        │
├──────────────────────────────────────────────────────────────────────┤
│ GOVERNANCE     Entra ID (per-agent identity, RBAC) │ Power Automate    │
└──────────────────────────────────────────────────────────────────────┘
```

## Agent pipeline (service boundaries)

| # | Agent (SK plugin) | Input | Output | File |
|---|---|---|---|---|
| 1 | DetectDecisionAgent | transcript | proposal, proposer, direction, entities, confidence | `lib/agents/detectDecision.ts` |
| 2 | RetrieveHistoryAgent | detection | ranked ScoredCandidates | `lib/agents/retrieveHistory.ts` → `lib/search.ts` |
| 3 | EvidenceScoringAgent | candidates | match cards + confidence gate | `lib/agents/scoreEvidence.ts` → `lib/scoring.ts` |
| 4 | RiskAssessmentAgent | confident matches | 4-dimension risk + overall | `lib/agents/scoreRisk.ts` |
| 5 | ObjectionAnalysisAgent | confident matches | Who-Was-Right cards | `lib/agents/surfaceObjections.ts` |
| 6 | RecommendationAgent | matches + risk | ranked mitigations w/ citations | `lib/agents/recommend.ts` |
| 7 | ApprovalAgent | decision | Teams Adaptive Card (Power Automate) | `lib/agents/approval.ts` |
| — | MemoryAgent | decision | Cosmos write | `lib/memory/*` |

Orchestrator: `lib/agents/orchestrator.ts`.

## Data flow (one analysis)

```
POST /api/analyze {transcript}
  → orchestrator.analyzeDecision
      → detectDecision (LLM: direction + entities)
      → retrieveHistory → search.retrieveSimilar
            per candidate: cosine(embed) · jaccard(entities) · recency · direction
            → scoreCandidate (lib/scoring) → confidence (lib/confidence)
      → gateEvidence (threshold)
          ├─ abstain → insufficient-evidence { weakMatches, divergingSignals }
          └─ confident → scoreRisk · surfaceObjections · recommend · citations
  → DecisionAnalysis → UI (Decision Guard)

POST /api/approve → triggerApproval (mock Power Automate) → Cosmos write → memory
```

## Storage model (Cosmos DB)

Container `decisions`, partition key `/proposer`. Each record carries the
proposal, objections, the who-was-right ledger, risk scores, the four-signal
**evidence chain**, recommendations, citations, confidence, and approval status —
the full audit trail. Interface: `lib/memory/cosmos.ts`; demo impl:
`lib/memory/local-store.ts`.

## Security model

- **Identity**: Entra ID app registration; per-agent service principal.
- **Permissions** (delegated, least-privilege): `Mail.Read`, `Calendars.Read`,
  `Chat.Read`, `User.Read.All`.
- **Secrets**: Azure Key Vault references; never in source (`.env` is gitignored).
- **Auditability**: every decision stores its evidence chain + citations; every
  pipeline step emits telemetry (Application Insights in production).
- **Responsible AI**: confidence gating + abstention prevent over-confident
  recommendations on thin evidence.

## Deployment

- `bicep/main.bicep` provisions Azure OpenAI, AI Search, Cosmos (serverless),
  Key Vault, App Service + managed-identity RBAC.
- `scripts/setup-m365.sh` provisions the Entra app, delegated Graph scopes,
  admin consent, and seeds the SharePoint corpus.
- Frontend deploys to Azure App Service (or Vercel as backup).

## Demo vs. production

Every external dependency is behind a TypeScript interface with a local mock, so
the system is fully demoable offline. Swapping to live Azure is configuration
(`MOCK_LLM=0` + env), not a rewrite — the scoring engine, agent pipeline, and API
contracts are identical in both modes.
