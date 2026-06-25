import { NextRequest, NextResponse } from "next/server";

import { getShanghaiOilPrice } from "@/lib/oil-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const force = new URL(request.url).searchParams.get("refresh") === "1";
  try {
    return NextResponse.json(await getShanghaiOilPrice({ force }));
  } catch (error) {
    return NextResponse.json({
      city: "上海",
      sourceName: "汽油价格网",
      sourceUrl: "http://www.qiyoujiage.com/shanghai.shtml",
      fetchedAt: new Date().toISOString(),
      updatedAt: null,
      items: [],
      error: error instanceof Error ? error.message : "油价暂不可用"
    });
  }
}
