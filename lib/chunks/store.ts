import { supabaseServer } from "@/lib/supabase/server";
import type { TextChunk } from "@/lib/chunking/types";

/**
 * Inserts chunks for a document. Populates only document_id, page_number,
 * and content — `embedding` is intentionally left NULL until the embedding
 * stage exists. No-ops on an empty list. Throws on any database error;
 * callers must treat that as a hard failure, not a partial success.
 */
export async function insertChunks(documentId: number, chunks: TextChunk[]): Promise<void> {
  if (chunks.length === 0) {
    return;
  }

  const rows = chunks.map((chunk) => ({
    document_id: documentId,
    page_number: chunk.pageNumber,
    content: chunk.content,
  }));

  const { error } = await supabaseServer.from("chunks").insert(rows);

  if (error) {
    throw new Error(`Failed to save chunks: ${error.message}`);
  }
}
