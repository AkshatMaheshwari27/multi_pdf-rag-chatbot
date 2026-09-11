import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_TOP_K } from "@/lib/retrieval/constants";
import { searchChunks } from "@/lib/retrieval/search";

// Uses the server-only Gemini + Supabase clients, so this must run in the
// Node.js runtime, not the Edge.
export const runtime = "nodejs";

/**
 * POST /api/search — semantic retrieval only. Returns the top-K most
 * similar chunks for a query; does not call an LLM and does not generate
 * an answer. Body: { query: string, topK?: number }.
 */
export async function POST(request: NextRequest) {
  let body: { query?: unknown; topK?: unknown };
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

  let topK = DEFAULT_TOP_K;
  if (body.topK !== undefined) {
    const parsedTopK = Number(body.topK);
    if (!Number.isInteger(parsedTopK) || parsedTopK <= 0) {
      return NextResponse.json({ error: "'topK' must be a positive integer." }, { status: 400 });
    }
    topK = parsedTopK;
  }

  try {
    const results = await searchChunks(query, topK);
    return NextResponse.json({ query, topK, count: results.length, results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Retrieval failed." },
      { status: 500 }
    );
  }
}
