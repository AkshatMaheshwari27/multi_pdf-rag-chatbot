import { NextRequest, NextResponse } from "next/server";
import { answerQuery } from "@/lib/chat/answer";
import type { ConversationMessage } from "@/lib/chat/types";

// Uses the server-only Gemini + Supabase clients, so this must run in the
// Node.js runtime, not the Edge.
export const runtime = "nodejs";

/**
 * Defensively extracts a valid ConversationMessage[] from an arbitrary
 * request body value. Anything malformed is silently dropped rather than
 * rejecting the whole request — history is a best-effort aid to
 * interpreting the question, not a required field, so a bad entry
 * shouldn't break an otherwise-valid request. `undefined` (the field
 * omitted entirely) is a normal, fully-supported case: existing
 * {query}-only requests work exactly as before this milestone.
 */
function parseHistory(raw: unknown): ConversationMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const messages: ConversationMessage[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      (entry as { role?: unknown }).role &&
      ((entry as { role?: unknown }).role === "user" || (entry as { role?: unknown }).role === "assistant") &&
      typeof (entry as { content?: unknown }).content === "string"
    ) {
      const content = (entry as { content: string }).content.trim();
      if (content) {
        messages.push({ role: (entry as { role: "user" | "assistant" }).role, content });
      }
    }
  }
  return messages;
}

/**
 * POST /api/chat — retrieval-augmented answer generation, with optional
 * conversational context.
 * Body: { query: string, history?: { role: "user" | "assistant", content: string }[] }
 * Response: { answer: string, sources: ChatSource[] }
 */
export async function POST(request: NextRequest) {
  let body: { query?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query) {
    return NextResponse.json(
      { error: "'query' is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  if (body.history !== undefined && !Array.isArray(body.history)) {
    return NextResponse.json(
      { error: "'history', if provided, must be an array of { role, content } messages." },
      { status: 400 }
    );
  }

  const history = parseHistory(body.history);

  try {
    const result = await answerQuery(query, history);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate an answer." },
      { status: 500 }
    );
  }
}
