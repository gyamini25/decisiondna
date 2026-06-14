# DecisionDNA — Microsoft 365 Copilot agent manifest

DecisionDNA ships as a **declarative agent for Microsoft 365 Copilot** (Enterprise
Agents track), with an API plugin so Copilot can call the DecisionDNA pipeline.

| File | Purpose |
|---|---|
| `declarativeAgent.json` | M365 Copilot declarative agent — instructions, conversation starters, capabilities, and the API action. Grounded by **Foundry IQ** (cited retrieval) and **Work IQ** (org context). |
| `apiPlugin.json` | API plugin (v2.1) exposing `analyzeDecision` + `listDecisions` to Copilot. |
| `openapi.json` | OpenAPI spec for the DecisionDNA endpoints the plugin calls. |

## Sideload / publish

**Microsoft 365 Agents Toolkit (VS Code)** or **Copilot Studio**:

1. Deploy the app (see root README) and set the `servers[0].url` in `openapi.json`
   to your deployed origin.
2. Package `declarativeAgent.json` + `apiPlugin.json` + `openapi.json` into an app
   package (zip with a Teams `manifest.json` referencing the declarative agent).
3. Upload to **Copilot Studio → Agents → Import**, or sideload via the M365 Agents
   Toolkit, then enable for Microsoft 365 Copilot Chat.
4. Try a conversation starter: *"We're considering reducing customer support
   staffing by 20% — have we done this before?"*

## Microsoft IQ integration

- **Foundry IQ** — `lib/foundryiq/` performs agentic, cited, grounded retrieval
  with a source-diversity grounding check (reduces hallucination).
- **Work IQ** — `lib/workiq/` reads organizational context (meetings, people,
  validation history) that powers detection and the people graph.
