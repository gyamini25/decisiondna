import { NextResponse } from "next/server";
import { getRepository } from "@/lib/memory/cosmos";

export const runtime = "nodejs";

/** GET /api/alerts — list alerts from memory. */
export async function GET() {
  const alerts = await getRepository().listAlerts();
  return NextResponse.json({ alerts });
}

/** POST /api/alerts — { id } marks an alert read. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await getRepository().markAlertRead(id);
  return NextResponse.json({ ok: true });
}
