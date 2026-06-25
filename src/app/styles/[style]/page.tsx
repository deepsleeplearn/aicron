import { notFound } from "next/navigation";

import { STYLE_OPTIONS, StylePreview } from "@/components/style-previews";
import { listBriefItems, listSources } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StylePage({ params }: { params: Promise<{ style: string }> }) {
  const { style } = await params;
  if (!STYLE_OPTIONS.some((option) => option.id === style)) notFound();
  return <StylePreview styleId={style} items={listBriefItems()} sources={listSources()} />;
}
