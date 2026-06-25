import { NextResponse } from "next/server";
import { z } from "zod";

import { runCodexReadOnly } from "@/lib/codex-worker";
import { appendAssistantExchange, getAssistantMessages } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  itemId: z.string().min(1),
  prompt: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
  repoPath: z.string().optional(),
  webSearch: z.boolean().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  return NextResponse.json({
    messages: getAssistantMessages({ itemId, mode: "codex" })
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runCodexReadOnly(parsed.data);
    appendAssistantExchange({
      itemId: parsed.data.itemId,
      mode: "codex",
      userMessage: parsed.data.prompt,
      assistantMessage: result.output
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Item not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Codex worker failed. Confirm Codex CLI is installed and logged in."
      },
      { status: 500 }
    );
  }
}
