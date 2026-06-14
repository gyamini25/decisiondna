import { NextResponse } from "next/server";
import { getTranscript } from "@/lib/transcripts";

export const runtime = "nodejs";

/** GET /api/transcripts/[id] — a demo transcript for Decision Guard replay. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(getTranscript(id));
}
