# DecisionDNA — Organizational Decision Intelligence

> **DecisionDNA models decision correctness as multi-signal evidence alignment, combining semantic meaning, entity grounding, temporal consistency, and directional correctness with an explicit confidence estimator and a formal abstention protocol.**

Organizations repeatedly face the same decisions and repeat the same mistakes — objections vanish after meetings, the people who correctly predicted risks are forgotten, and approvals lack historical context. DecisionDNA is the organization's **decision memory layer**: when a decision is proposed, it detects it, retrieves similar past decisions with citations, scores the evidence, surfaces *who objected and who was proven right*, assesses risk, recommends mitigations, and routes for approval — storing everything as auditable memory.

Built for the **Microsoft Agents League Hackathon**.

---

## The core question

Before approving a decision, a leader can ask: *"Have we done something like this before?"* DecisionDNA answers with similar historical decisions, supporting evidence, previous objections, **actual outcomes**, materialized risks, the stakeholders who predicted them, confidence scores, and an approval recommendation.

---

## Architecture

```
Surface          M365 Copilot Chat   ·   Copilot Studio   ·   Next.js dashboard
                                  │
Orchestration    DecisionDNA Agent (Microsoft Agent Framework 1.0 + Semantic Kernel)
                 Detect → Retrieve → Score → Risk → Who-Was-Right → Recommend → Approve → Store
                                  │
IQ context       Work IQ (Graph)   ·   Foundry IQ (RAG)   ·   Azure AI Search (vector)
                                  │
Data & memory    Microsoft Graph   ·   Azure Cosmos DB   ·   Azure OpenAI (embeddings + GPT)
                                  │
Governance       Entra ID (per-agent identity, RBAC)   ·   Power Automate (Teams approval)
```

See [docs/architecture.md](docs/architecture.md) for the full design, and [bicep/main.bicep](bicep/main.bicep) for the production Infrastructure-as-Code.

---

## The judge-proof scoring engine

Decision correctness is a **weighted composite of four independent signals**, not cosine similarity alone:

| Signal | Weight | Definition | Guards against |
|---|---|---|---|
| Semantic similarity | 0.35 | `cosine(embed(proposal), embed(candidate))` | — |
| Entity alignment | 0.30 | Jaccard overlap of named entities | semantic "bluffing" |
| Temporal consistency | 0.20 | recency/horizon decay `exp(-α·Δ)` | stale precedent |
| Directional correctness | 0.15 | trend match (up/down/flat) | wrong-direction matches |

```
S_final     = 0.35·S_sem + 0.30·S_ent + 0.20·S_time + 0.15·S_dir
agreement   = 1 − Var(signals)                      # signals concurring
confidence  = agreement · sufficiency(S_final)       # agreement AND real evidence
rank        = S_final · confidence
abstain if  no candidate clears the confidence threshold (default 0.6)
```

A **disagreement detector** flags semantic-only matches (high meaning, low entity/temporal) and halves agreement. When nothing clears the threshold, the system **abstains** — it shows the closest weak matches and which signals disagree, and it does **not** fabricate risk scores or objections. See [docs/methodology.md](docs/methodology.md).

The engine is unit-tested to reproduce the corpus's stored signal vectors, so every score is auditable and reproducible.

---

## Tech stack (Microsoft-first)

| Layer | Technology |
|---|---|
| Agent orchestration | Microsoft Agent Framework 1.0 pattern + Semantic Kernel plugins |
| Intelligence | Azure OpenAI (gpt + `text-embedding-3-large`) — swappable mock fallback |
| Retrieval | Azure AI Search (hybrid vector + keyword) |
| Memory | Azure Cosmos DB (serverless) |
| Context | Microsoft Graph (Work IQ), Azure AI Foundry (Foundry IQ RAG) |
| Governance | Entra ID, Power Automate (Teams Adaptive Card approval) |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| IaC | Bicep |

> **Demo mode.** This repo runs **fully offline by default** (`MOCK_LLM=1`): a deterministic IDF-weighted lexical embedding + the same scoring engine, so the demo is 100% reproducible with no cloud account. Every Microsoft dependency (AI Search, Cosmos, Graph, Power Automate) sits behind an interface with a local mock. Set `MOCK_LLM=0` with Azure OpenAI env vars (see `.env.example`) to use real embeddings + reasoning.

---

## Setup

```bash
npm install
cp .env.example .env        # optional: set MOCK_LLM=0 + Azure OpenAI keys for live mode
npm run dev                 # http://localhost:3000  → redirects to /home
```

```bash
npm test                    # 44 tests — scoring, confidence, retrieval, 5 judge scenarios
npm run typecheck
```

### Live mode (real Azure OpenAI)

```bash
# 1. fill in Azure values in .env (endpoint, key, deployments)
set -a; source .env; set +a
npm run test:azure          # verifies embeddings + chat are reachable
# 2. set MOCK_LLM=0 in .env, then:
npm run dev
```

With live Azure OpenAI, candidate embeddings are computed once (batched) and
cached, so each analysis makes only a query embedding + entity-extraction call.
The scoring engine, agent pipeline, and abstention behavior are identical to mock
mode — only the embedding/entity quality (and absolute match %) improves.

---

## Demo (5 steps)

1. Open **Decision Guard** (sidebar item 4).
2. Scenario **“Support staffing cut”**: Laura proposes *“reduce customer support staffing by 20%.”*
3. DecisionDNA detects the decision → surfaces the closest precedents with a **per-signal breakdown** → **Who Was Right?** (Jane Smith & Ravi Patel — concerns validated) → **HIGH risk** → recommends *“deploy chatbot deflection before reducing staffing.”*
4. Click **Approve / Request Review / Reject** → triggers the (mock) Power Automate Adaptive Card → decision is written to **organizational memory** (visible in Decisions + Memory Graph).
5. Switch the scenario to **“F1 sponsorship”** → no precedent → **Insufficient Historical Data** abstention state with the disagreeing signals shown.

Full script: [docs/demo-script.md](docs/demo-script.md).

---

## Judging criteria alignment

| Criterion | Weight | How DecisionDNA addresses it |
|---|---|---|
| Accuracy & Relevance | 20% | Four-signal composite + entity grounding; corpus-verified, reproducible scores |
| Reasoning & Multi-step | 20% | 7-step agent pipeline (detect→retrieve→score→risk→objections→recommend→approve) with telemetry |
| Reliability & Safety | 20% | Confidence estimator + abstention protocol; never fabricates analysis from weak evidence |
| Creativity & Originality | 15% | "Who Was Right?" ledger — surfaces which stakeholders predicted outcomes |
| UX & Presentation | 15% | 9-screen dashboard, Decision Guard hero, Memory Graph, evidence breakdowns |

---

## Repo layout

```
app/            Next.js routes — 9 screens + /api (agent bridge)
components/      UI (Sidebar, TopBar, Decision Guard panels, Memory Graph)
lib/
  scoring.ts    four-signal engine + composite + rank
  confidence.ts confidence model + abstention
  search.ts     hybrid retrieval (mock AI Search)
  agents/       SK plugins + MAF orchestrator (detect/retrieve/risk/objections/recommend/approve)
  llm/          Azure OpenAI client + deterministic mock + factory
  memory/       Cosmos repository contract + local store + memory-graph builder
  workiq/       Microsoft Graph mock
data/           corpus (12 decision records) + demo transcripts
tests/          scoring, confidence, retrieval, 5 judge scenarios (Vitest)
bicep/ scripts/ production IaC + M365 setup (reference)
docs/           methodology, architecture, demo script, project description
```
