import { NextResponse } from "next/server";
import { listAllDecisions } from "@/lib/decisions-view";

export const runtime = "nodejs";

/** GET /api/decisions?filter=high-risk|pending|high-confidence|low-confidence&q= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const q = searchParams.get("q")?.toLowerCase();

  let items = await listAllDecisions();

  if (q) {
    items = items.filter(
      (d) =>
        d.proposal.toLowerCase().includes(q) ||
        d.proposer.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q),
    );
  }
  switch (filter) {
    case "high-risk":
      items = items.filter((d) => d.risk === "High");
      break;
    case "pending":
      items = items.filter((d) => d.status === "pending");
      break;
    case "approved":
      items = items.filter((d) => d.status === "approved");
      break;
    case "rejected":
      items = items.filter((d) => d.status === "rejected");
      break;
    case "high-confidence":
      items = items.filter((d) => d.confidence >= 0.8);
      break;
    case "low-confidence":
      items = items.filter((d) => d.confidence < 0.6);
      break;
  }

  return NextResponse.json({ decisions: items, total: items.length });
}
