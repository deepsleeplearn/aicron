import { StyleGallery } from "@/components/style-previews";
import { listBriefItems, listSources } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function StylesPage() {
  return <StyleGallery items={listBriefItems()} sources={listSources()} />;
}
