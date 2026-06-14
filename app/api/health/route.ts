import { NextResponse } from "next/server";
import { getLLMClient } from "@/lib/llm";

export const runtime = "nodejs";

/** GET /api/health — runtime config + which intelligence backend is active. No secrets. */
export async function GET() {
  let backend = "unknown";
  let embedDim: number | null = null;
  let error: string | null = null;
  try {
    const llm = getLLMClient();
    backend = llm.backend;
    // Try a real embedding to confirm the live backend actually works.
    const v = await llm.embed("health check");
    embedDim = v.length;
  } catch (e) {
    error = String(e);
  }
  return NextResponse.json({
    mockLLM: process.env.MOCK_LLM ?? "(unset)",
    hasEndpoint: !!process.env.AZURE_OPENAI_ENDPOINT,
    hasKey: !!process.env.AZURE_OPENAI_API_KEY,
    chatDeployment: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT ?? "(unset)",
    embeddingDeployment: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ?? "(unset)",
    backend,
    embedDim,
    error,
  });
}
