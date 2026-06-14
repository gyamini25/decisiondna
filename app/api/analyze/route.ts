import { NextResponse } from "next/server";
import { analyzeDecision } from "@/lib/agents/orchestrator";
import { getTranscript } from "@/lib/transcripts";

export const runtime = "nodejs";

/**
 * POST /api/analyze
 * Body: { transcript?: string, transcriptId?: string, threshold?: number }
 * Runs the DecisionDNA agent pipeline and returns a DecisionAnalysis.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { transcript, transcriptId, threshold } = body as {
      transcript?: string;
      transcriptId?: string;
      threshold?: number;
    };

    let text = transcript;
    let timestamp: string | undefined;
    let referenceDate: string | undefined;

    if (!text) {
      const doc = getTranscript(transcriptId);
      text = doc.transcript;
      timestamp = doc.date;
      referenceDate = doc.date;
    }

    if (!text) {
      return NextResponse.json(
        { error: "Provide `transcript` or `transcriptId`." },
        { status: 400 },
      );
    }

    const analysis = await analyzeDecision(
      { text, timestamp },
      { threshold, referenceDate },
    );
    return NextResponse.json(analysis);
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json(
      { error: "Analysis failed", detail: String(err) },
      { status: 500 },
    );
  }
}
