import { NextResponse } from "next/server";
import { listMeetings } from "@/lib/workiq/graph";

export const runtime = "nodejs";

/** GET /api/meetings — Work IQ (mock Microsoft Graph) meetings. */
export async function GET() {
  return NextResponse.json({ meetings: listMeetings() });
}
