# DecisionDNA — Project Description

**DecisionDNA is an organizational decision-intelligence platform — a decision
memory layer that helps companies stop repeating their own mistakes.**

## Problem

Organizations make thousands of decisions a year and have no memory of them.
Objections raised in meetings disappear; the stakeholders who correctly predicted
risks are ignored; new leaders repeat failed initiatives; and approval processes
happen with no historical evidence. Generic AI assistants retrieve documents but
can't explain *what happened, why, and who was right*.

## Solution

When a decision is proposed — in a meeting, an email, or a chat — DecisionDNA's
agent detects it and runs a seven-step pipeline: it **retrieves** similar past
decisions with citations, **scores** the evidence, surfaces previous
**objections and who was proven right**, assesses **risk** across four
dimensions, **recommends** mitigations that actually worked, routes for
**approval** via a Teams Adaptive Card, and **stores** the decision as auditable
memory. Before approving anything, a leader can finally ask "have we done this
before?" and get an evidence-graded answer.

## What makes it defensible

Instead of relying on embedding similarity alone, DecisionDNA models decision
correctness as **multi-signal evidence alignment**: semantic similarity (35%),
named-entity grounding (30%), temporal consistency (20%), and directional
correctness (15%), combined into an explainable composite. Confidence is computed
from **signal agreement plus evidence sufficiency**, not raw score magnitude, and
the system has a **formal abstention protocol** — when no precedent clears the
confidence threshold, it refuses to fabricate analysis and instead shows the
closest weak matches and which signals disagree. Every score decomposes into an
auditable per-signal breakdown, and the engine is unit-tested to reproduce its
data.

## Tech stack

Microsoft Agent Framework 1.0 + Semantic Kernel for orchestration; Azure OpenAI
(`text-embedding-3-large` + GPT) for embeddings and reasoning; Azure AI Search
for hybrid retrieval; Azure Cosmos DB for decision memory; Microsoft Graph
(Work IQ) and Azure AI Foundry (Foundry IQ) for organizational context; Entra ID
for per-agent identity and RBAC; Power Automate for the Teams approval workflow;
and a Next.js + TypeScript dashboard. The app ships demo-ready and fully offline
with deterministic mocks behind every cloud interface, and switches to live Azure
with a single configuration change.

## Judging-criteria mapping

- **Accuracy & Relevance (20%)** — four-signal composite with entity grounding;
  corpus-verified, reproducible scores.
- **Reasoning & Multi-step (20%)** — a true seven-step agent pipeline with
  per-step telemetry.
- **Reliability & Safety (20%)** — confidence estimator + abstention; never
  fabricates conclusions from weak evidence.
- **Creativity & Originality (15%)** — the "Who Was Right?" ledger that resurfaces
  validated stakeholder foresight.
- **UX & Presentation (15%)** — a nine-screen dashboard anchored by the Decision
  Guard hero view and an organizational Memory Graph.
