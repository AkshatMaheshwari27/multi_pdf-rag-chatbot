import { embedTexts } from "@/lib/embeddings/gemini";
import { supabaseServer } from "@/lib/supabase/server";
import { DEFAULT_TOP_K } from "./constants";
import type { RetrievalResult } from "./types";

interface MatchChunksRow {
  id: number;
  document_id: number;
  filename: string;
  page_number: number | null;
  content: string;
  similarity: number;
}

/**
 * Semantic search over `chunks`, powered entirely by the `match_chunks`
 * Postgres RPC function, which performs cosine-distance Top-K retrieval
 * directly inside PostgreSQL/pgvector (joined with `documents` for
 * filename). This replaces the earlier approach of fetching every embedded
 * chunk and computing cosine similarity in JavaScript.
 */
export async function searchChunks(
  query: string,
  topK: number = DEFAULT_TOP_K
): Promise<RetrievalResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("Query must not be empty.");
  }
  if (!Number.isInteger(topK) || topK <= 0) {
    throw new Error("topK must be a positive integer.");
  }

  const [queryEmbedding] = await embedTexts([trimmedQuery]);

  const { data, error } = await supabaseServer.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_count: topK,
  });

  if (error) {
    throw new Error(`Failed to run match_chunks retrieval: ${error.message}`);
  }

  const rows = (data ?? []) as MatchChunksRow[];

  return rows.map((row) => ({
    chunkId: row.id,
    documentId: row.document_id,
    filename: row.filename,
    pageNumber: row.page_number,
    content: row.content,
    similarity: row.similarity,
  }));
}
