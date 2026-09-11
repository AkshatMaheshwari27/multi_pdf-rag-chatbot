import { supabaseServer } from "@/lib/supabase/server";
import type { TextChunk } from "@/lib/chunking/types";

export interface EmbeddedChunk extends TextChunk {
  /** 768-dimensional embedding vector for this chunk's content. */
  embedding: number[];
}

/**
 * Inserts chunks for a document, each with its embedding already computed.
 * Populates document_id, page_number, content, and embedding in one insert.
 * No-ops on an empty list. Throws on any database error; callers must treat
 * that as a hard failure, not a partial success.
 *
 * This is only ever called for a newly-inserted document (duplicates return
 * before chunking runs), so it always writes fresh rows — existing chunk
 * rows (and their embeddings) are never touched here.
 */
export async function insertChunks(documentId: number, chunks: EmbeddedChunk[]): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  const rows = chunks.map((chunk) => ({
    document_id: documentId,
    page_number: chunk.pageNumber,
    content: chunk.content,
    embedding: chunk.embedding,
  }));

  const { error } = await supabaseServer.from("chunks").insert(rows);

  if (error) {
    throw new Error(`Failed to save chunks: ${error.message}`);
  }
}
