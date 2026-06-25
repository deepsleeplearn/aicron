import { NextResponse } from "next/server";
import { z } from "zod";

import { setReadState } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  itemId: z.string().min(1),
  read: z.boolean().optional(),
  starred: z.boolean().optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  setReadState(parsed.data);
  return NextResponse.json({ ok: true });
}
