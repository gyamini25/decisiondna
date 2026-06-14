#!/usr/bin/env node
/**
 * Azure OpenAI connectivity check. Verifies your .env is wired correctly before
 * running the app in live mode (MOCK_LLM=0).
 *
 *   node scripts/test-azure.mjs
 *
 * Reads AZURE_OPENAI_* from the environment (or a local .env you've exported).
 */

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
const chat = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "gpt-4o";
const embed =
  process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "text-embedding-3-large";

function fail(msg) {
  console.error("✗ " + msg);
  process.exit(1);
}

if (!endpoint || !apiKey) {
  fail(
    "AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY must be set. Copy .env.example → .env and fill them in, then: `set -a; source .env; set +a; node scripts/test-azure.mjs`",
  );
}

const base = endpoint.replace(/\/$/, "");

async function main() {
  // 1) Embeddings
  const er = await fetch(
    `${base}/openai/deployments/${embed}/embeddings?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({ input: ["reduce customer support staffing"] }),
    },
  );
  if (!er.ok) fail(`Embeddings call failed: ${er.status} ${await er.text()}`);
  const ej = await er.json();
  console.log(`✓ Embeddings OK — dim ${ej.data[0].embedding.length} (${embed})`);

  // 2) Chat (JSON mode)
  const cr = await fetch(
    `${base}/openai/deployments/${chat}/chat/completions?api-version=${apiVersion}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        messages: [
          { role: "system", content: 'Respond as JSON {"ok": true}.' },
          { role: "user", content: "ping" },
        ],
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    },
  );
  if (!cr.ok) fail(`Chat call failed: ${cr.status} ${await cr.text()}`);
  await cr.json();
  console.log(`✓ Chat OK (${chat})`);

  console.log(
    "\n✓ Azure OpenAI is reachable. Set MOCK_LLM=0 to run DecisionDNA in live mode.",
  );
}

main().catch((e) => fail(String(e)));
