import { NOT_FOUND_MESSAGE } from "@/lib/generation/constants";
import { buildContext } from "@/lib/generation/context";
import { generateAnswer } from "@/lib/generation/gemini";
import { DEFAULT_TOP_K } from "@/lib/retrieval/constants";
import { searchChunks } from "@/lib/retrieval/search";
import { MAX_HISTORY_MESSAGES } from "./constants";
import type { ChatAnswer, ChatSource, ConversationMessage } from "./types";

/**
 * Builds the text used for retrieval when there's conversation history.
 * A bare follow-up like "What are its limitations?" embeds poorly on its
 * own (nothing for the vector search to latch onto), so recent turns are
 * folded in ahead of the current question purely to give retrieval enough
 * signal to find the right chunks. With no history this returns `query`
 * unchanged, so behavior for a plain {query}-only request is identical to
 * before this milestone.
 *
 * This does not change `searchChunks` itself at all — it's still called
 * exactly the same way, just with a richer input string.
 */
function buildRetrievalQuery(query: string, history: ConversationMessage[]): string {
  if (history.length === 0) {
    return query;
  }

  const transcript = history
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return `${transcript}\nUser: ${query}`;
}

/**
 * The RAG answer-generation flow: retrieve → build grounded context →
 * generate → attach sources.
 *
 * `history` is optional, recent conversation turns (already trimmed by the
 * caller, but re-trimmed here defensively) used ONLY to help interpret the
 * current question — e.g. resolving "it"/"they"/"this" to whatever was
 * discussed previously — for both retrieval and generation. It is never
 * treated as a factual source; the uploaded documents (via retrieved
 * chunks) remain the only evidence the answer can be based on. Nothing is
 * persisted — history lives only for the duration of this call.
 *
 * Source metadata in the response comes directly from the retrieval
 * results — never from the LLM's own output — so every returned source is
 * guaranteed to have actually come from retrieval, and the model has no
 * opportunity to invent or alter a citation. This is unchanged by this
 * milestone.
 */
export async function answerQuery(
  query: string,
  history: ConversationMessage[] = []
): Promise<ChatAnswer> {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const retrievalQuery = buildRetrievalQuery(query, recentHistory);
  const chunks = await searchChunks(retrievalQuery, DEFAULT_TOP_K);

  if (chunks.length === 0) {
    // No candidates at all (e.g. nothing embedded yet) — answer
    // deterministically without spending a generation call.
    return { answer: NOT_FOUND_MESSAGE, sources: [] };
  }

  const context = buildContext(chunks);
  const answer = await generateAnswer(query, context, recentHistory);

  const sources: ChatSource[] = chunks.map((chunk) => ({
    chunkId: chunk.chunkId,
    documentId: chunk.documentId,
    filename: chunk.filename,
    pageNumber: chunk.pageNumber,
    similarity: chunk.similarity,
  }));

  return { answer, sources };
}
