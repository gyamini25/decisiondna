import { NextResponse } from "next/server";
import { getDecisionDetail } from "@/lib/decisions-view";

export const runtime = "nodejs";

/** GET /api/decisions/[id] — full record (corpus) or stored decision. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const detail = await getDecisionDetail(id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
