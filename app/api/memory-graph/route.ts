import { NextResponse } from "next/server";
import { buildMemoryGraph } from "@/lib/memory/graph-builder";

export const runtime = "nodejs";

/** GET /api/memory-graph — nodes + edges for the force-directed memory graph. */
export async function GET() {
  return NextResponse.json(buildMemoryGraph());
}
