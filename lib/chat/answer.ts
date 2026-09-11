import { NOT_FOUND_MESSAGE } from "@/lib/generation/constants";
import { buildContext } from "@/lib/generation/context";
import { generateAnswer } from "@/lib/generation/gemini";
import { DEFAULT_TOP_K } from "@/lib/retrieval/constants";
import { searchChunks } from "@/lib/retrieval/search";
import type { ChatAnswer, ChatSource } from "./types";

/**
 * The RAG answer-generation flow: retrieve → build grounded context →
 * generate → attach sources. This is the only place that wires retrieval
 * and generation together; it does not change retrieval logic (calls the
 * existing `searchChunks` unmodified) and does not touch conversation
 * history or streaming (out of scope for this milestone).
 *
 * Source metadata in the response comes directly from the retrieval
 * results — never from the LLM's own output — so every returned source is
 * guaranteed to have actually come from retrieval, and the model has no
 * opportunity to invent or alter a citation.
 */
export async function answerQuery(query: string): Promise<ChatAnswer> {
  const chunks = await searchChunks(query, DEFAULT_TOP_K);

  if (chunks.length === 0) {
    // No candidates at all (e.g. nothing embedded yet) — answer
    // deterministically without spending a generation call.
    return { answer: NOT_FOUND_MESSAGE, sources: [] };
  }

  const context = buildContext(chunks);
  const answer = await generateAnswer(query, context);

  const sources: ChatSource[] = chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    filename: chunk.filename,
    pageNumber: chunk.pageNumber,
    similarity: chunk.similarity,
  }));

  return { answer, sources };
}
