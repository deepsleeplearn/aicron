import { NextResponse } from "next/server";

import { fetchArticleContent, shouldRefreshArticleContent, shouldUpgradePlainArticleContent } from "@/lib/content";
import { getItem, updateItemContent } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getItem(id);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (shouldRefreshArticleContent(item) || shouldUpgradePlainArticleContent(item)) {
    const content = await fetchArticleContent(item.canonicalUrl).catch(() => null);
    if (content) {
      updateItemContent(item.id, content);
      return NextResponse.json({ item: { ...item, content } });
    }
  }

  return NextResponse.json({ item });
}
