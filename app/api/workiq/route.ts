import { NextResponse } from "next/server";
import { buildWorkMemory } from "@/lib/workiq/memory";

export const runtime = "nodejs";

/** GET /api/workiq — Work IQ organizational memory (counts, people, relationships,
 *  topics, activity, recent decisions) built from a month of emails/meetings/chats/docs. */
export async function GET() {
  return NextResponse.json(buildWorkMemory());
}
