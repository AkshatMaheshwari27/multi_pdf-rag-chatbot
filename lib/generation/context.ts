import type { RetrievalResult } from "@/lib/retrieval/types";

/**
 * Builds the grounded context block sent to the LLM from retrieved chunks.
 *
 * Deliberately includes ONLY chunk content — no filenames, page numbers, or
 * chunk/document ids. The application attaches real source metadata to the
 * response itself (straight from the retrieval results), so the model never
 * sees anything citation-shaped and can't invent or mangle a citation.
 */
export function buildContext(chunks: RetrievalResult[]): string {
  if (chunks.length === 0) {
    return "";
  }

  return chunks
    .map((chunk, i) => `Excerpt ${i + 1}:\n${chunk.content.trim()}`)
    .join("\n\n");
}
