import { NextRequest, NextResponse } from "next/server";
import { answerQuery } from "@/lib/chat/answer";

// Uses the server-only Gemini + Supabase clients, so this must run in the
// Node.js runtime, not the Edge.
export const runtime = "nodejs";

/**
 * POST /api/chat — retrieval-augmented answer generation.
 * Body: { query: string }
 * Response: { answer: string, sources: ChatSource[] }
 */
export async function POST(request: NextRequest) {
  let body: { query?: unknown };
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

  try {
    const result = await answerQuery(query);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate an answer." },
      { status: 500 }
    );
  }
}
