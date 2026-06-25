import { canonicalizeUrl, cleanText } from "../normalization";
import type { RawItem } from "../types";

type FetchOpenReviewPapersInput = {
  sourceId: string;
  sourceName: string;
  url: string;
  maxItems?: number;
};

type OpenReviewField<T> = T | { value?: T };

type OpenReviewNote = {
  id?: string;
  forum?: string;
  number?: number;
  invitation?: string;
  cdate?: number;
  pdate?: number;
  tcdate?: number;
  tmdate?: number;
  content?: {
    title?: OpenReviewField<string>;
    abstract?: OpenReviewField<string>;
    TLDR?: OpenReviewField<string>;
    tldr?: OpenReviewField<string>;
    authors?: OpenReviewField<string[]>;
    authorids?: OpenReviewField<string[]>;
    keywords?: OpenReviewField<string[]>;
    venue?: OpenReviewField<string>;
    venueid?: OpenReviewField<string>;
    pdf?: OpenReviewField<string>;
  };
};

type OpenReviewResponse = {
  notes?: OpenReviewNote[];
};

type OpenReviewProfileResponse = {
  profiles?: Array<{
    content?: {
      emails?: string[];
      history?: Array<{
        institution?: {
          name?: string;
          domain?: string;
          department?: string;
          country?: string;
        };
      }>;
    };
  }>;
};

const USER_AGENT = "ai-morning-brief/0.1";
const DEFAULT_NOTE_LIMIT = 150;
const notesCache = new Map<string, Promise<OpenReviewNote[]>>();
const profileAffiliationCache = new Map<string, Promise<string[]>>();

export async function fetchOpenReviewPaperItems(input: FetchOpenReviewPapersInput): Promise<RawItem[]> {
  const { apiUrl, institutionAliases } = parseOpenReviewSourceUrl(input.url);
  if (!apiUrl.searchParams.has("limit")) {
    apiUrl.searchParams.set("limit", String(institutionAliases.length > 0 ? DEFAULT_NOTE_LIMIT : (input.maxItems ?? 20)));
  }

  const notes = await fetchOpenReviewNotes(apiUrl);
  const items: RawItem[] = [];
  const fallbackItems: RawItem[] = [];
  for (const note of notes) {
    const matchedAffiliations = institutionAliases.length
      ? await matchedAffiliationsForNote(note, institutionAliases)
      : [];

    const item = normalizeOpenReviewNote(input, note, matchedAffiliations);
    if (!item) continue;
    if (institutionAliases.length > 0 && matchedAffiliations.length === 0) {
      fallbackItems.push(item);
      continue;
    }
    items.push(item);
    if (items.length >= (input.maxItems ?? 20)) break;
  }

  return (items.length > 0 ? items : fallbackItems).slice(0, input.maxItems ?? 20);
}

async function fetchOpenReviewNotes(apiUrl: URL): Promise<OpenReviewNote[]> {
  const cacheKey = apiUrl.toString();
  const cached = notesCache.get(cacheKey);
  if (cached) return cached;

  const promise = fetch(cacheKey, {
    headers: { "user-agent": USER_AGENT },
    next: { revalidate: 0 }
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${cacheKey}`);
    }
    const payload = (await response.json()) as OpenReviewResponse;
    return payload.notes ?? [];
  });

  notesCache.set(cacheKey, promise);
  return promise;
}

function normalizeOpenReviewNote(
  input: FetchOpenReviewPapersInput,
  note: OpenReviewNote,
  matchedAffiliations: string[]
): RawItem | null {
  const title = cleanText(fieldValue(note.content?.title) ?? "");
  const forumId = note.forum || note.id;
  if (!title || !forumId) return null;

  const abstract = cleanText(fieldValue(note.content?.abstract) ?? "");
  const tldr = cleanText(fieldValue(note.content?.TLDR) ?? fieldValue(note.content?.tldr) ?? "");
  const authors = fieldValue(note.content?.authors) ?? [];
  const keywords = fieldValue(note.content?.keywords) ?? [];
  const venue = cleanText(fieldValue(note.content?.venue) ?? fieldValue(note.content?.venueid) ?? "");
  const canonicalUrl = canonicalizeUrl(`https://openreview.net/forum?id=${forumId}`);
  const pdfPath = fieldValue(note.content?.pdf);
  const pdfUrl = pdfPath
    ? canonicalizeUrl(new URL(pdfPath, "https://openreview.net").toString())
    : null;

  return {
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    title,
    canonicalUrl,
    publishedAt: timestampToIso(note.pdate ?? note.cdate ?? note.tcdate ?? note.tmdate),
    excerpt: tldr || abstract || title,
    content: buildOpenReviewContent({
      title,
      abstract,
      tldr,
      authors,
      keywords,
      venue,
      matchedAffiliations,
      forumId,
      invitation: note.invitation,
      pdfUrl
    }),
    categories: ["paper", "research", "openreview", venue, ...keywords].filter(Boolean)
  };
}

function buildOpenReviewContent(input: {
  title: string;
  abstract?: string;
  tldr?: string;
  authors?: string[];
  keywords?: string[];
  venue?: string;
  matchedAffiliations?: string[];
  forumId: string;
  invitation?: string;
  pdfUrl?: string | null;
}) {
  return [
    input.tldr ? `TLDR: ${input.tldr}` : null,
    input.abstract || input.title,
    input.authors?.length ? `Authors: ${input.authors.slice(0, 16).join(", ")}` : null,
    input.matchedAffiliations?.length ? `Matched institutions: ${input.matchedAffiliations.slice(0, 12).join("; ")}` : null,
    input.keywords?.length ? `Keywords: ${input.keywords.join(", ")}` : null,
    input.venue ? `Venue: ${input.venue}` : null,
    input.invitation ? `Invitation: ${input.invitation}` : null,
    `Forum: https://openreview.net/forum?id=${input.forumId}`,
    input.pdfUrl ? `PDF: ${input.pdfUrl}` : null
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseOpenReviewSourceUrl(rawUrl: string) {
  const apiUrl = new URL(rawUrl);
  const institutionAliases = apiUrl.searchParams
    .getAll("institution")
    .map((value) => value.trim())
    .filter(Boolean);
  apiUrl.searchParams.delete("institution");
  return { apiUrl, institutionAliases };
}

async function matchedAffiliationsForNote(note: OpenReviewNote, aliases: string[]): Promise<string[]> {
  const authorIds = fieldValue(note.content?.authorids as OpenReviewField<string[]> | undefined) ?? [];
  const matches = new Set<string>();

  const authorAffiliations = await Promise.all(
    authorIds.slice(0, 16).map((authorId) => fetchProfileAffiliations(authorId).catch(() => []))
  );
  for (const affiliations of authorAffiliations) {
    for (const affiliation of affiliations) {
      if (matchesAnyInstitutionAlias(affiliation, aliases)) {
        matches.add(affiliation);
      }
    }
  }

  return Array.from(matches);
}

async function fetchProfileAffiliations(authorId: string): Promise<string[]> {
  const cached = profileAffiliationCache.get(authorId);
  if (cached) return cached;

  const promise = fetch(`https://api.openreview.net/profiles?id=${encodeURIComponent(authorId)}`, {
    headers: { "user-agent": USER_AGENT },
    next: { revalidate: 0 }
  }).then(async (response) => {
    if (!response.ok) return [];
    const payload = (await response.json()) as OpenReviewProfileResponse;
    const profile = payload.profiles?.[0];
    const values: string[] = [];
    for (const email of profile?.content?.emails ?? []) {
      values.push(email, email.split("@").pop() ?? "");
    }
    for (const entry of profile?.content?.history ?? []) {
      const institution = entry.institution;
      values.push(
        institution?.name ?? "",
        institution?.domain ?? "",
        institution?.department ?? "",
        institution?.country ?? ""
      );
    }
    return Array.from(new Set(values.map(cleanText).filter(Boolean)));
  });

  profileAffiliationCache.set(authorId, promise);
  return promise;
}

function matchesAnyInstitutionAlias(value: string, aliases: string[]): boolean {
  const normalizedValue = normalizeComparable(value);
  return aliases.some((alias) => normalizedValue.includes(normalizeComparable(alias)));
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function fieldValue<T>(field?: OpenReviewField<T>): T | undefined {
  if (!field) return undefined;
  if (typeof field === "object" && "value" in field) return field.value;
  return field as T;
}

function timestampToIso(value?: number): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
