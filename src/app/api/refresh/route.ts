import { NextResponse } from "next/server";

import { refreshAllSourcesWithBaseline } from "@/lib/refresh-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(await refreshAllSourcesWithBaseline());
}
