import { NOT_FOUND_MESSAGE } from "@/lib/generation/constants";
import { buildContext } from "@/lib/generation/context";
import { generateAnswer } from "@/lib/generation/gemini";
import { resolveStandaloneQuery } from "@/lib/generation/queryResolution";
import { DEFAULT_TOP_K } from "@/lib/retrieval/constants";
import { searchChunks } from "@/lib/retrieval/search";
import { MAX_HISTORY_MESSAGES, MIN_SOURCE_SIMILARITY } from "./constants";
import type { ChatAnswer, ChatSource, ConversationMessage } from "./types";

/**
 * Drops sources whose similarity falls below MIN_SOURCE_SIMILARITY —
 * candidates that only made the Top-K cut, not chunks that actually look
 * relevant to the question. Purely a display-layer concern, applied after
 * dedup: it only removes entries from the `sources` array returned to the
 * client and never touches the retrieved `chunks` or the context built
 * from them for Gemini.
 */
function filterLowRelevanceSources(sources: ChatSource[]): ChatSource[] {
  return sources.filter((source) => source.similarity >= MIN_SOURCE_SIMILARITY);
}

/**
 * Collapses sources that share the same filename + page number down to one
 * entry (keeping whichever has the higher similarity), so a Top-K result
 * containing multiple chunks from the same page doesn't show duplicate
 * citations in the UI. Purely a display-layer concern: this only reshapes
 * the `sources` array returned to the client — it never touches the
 * retrieved `chunks` themselves, so the context built for Gemini (and thus
 * the answer) is unaffected.
 */
function dedupeSourcesByFilenameAndPage(sources: ChatSource[]): ChatSource[] {
  const bestByKey = new Map<string, ChatSource>();

  for (const source of sources) {
    const key = `${source.filename}::${source.pageNumber}`;
    const existing = bestByKey.get(key);
    if (!existing || source.similarity > existing.similarity) {
      bestByKey.set(key, source);
    }
  }

  return Array.from(bestByKey.values()).sort((a, b) => b.similarity - a.similarity);
}

/**
 * The RAG answer-generation flow: resolve → retrieve → build grounded
 * context → generate → attach sources.
 *
 * `history` is optional, recent conversation turns (already trimmed by the
 * caller, but re-trimmed here defensively) used ONLY to help interpret the
 * current question — e.g. resolving "it"/"they"/"this" to whatever was
 * discussed previously — for both retrieval and generation. It is never
 * treated as a factual source; the uploaded documents (via retrieved
 * chunks) remain the only evidence the answer can be based on. Nothing is
 * persisted — history lives only for the duration of this call.
 *
 * Retrieval uses a *resolved* standalone version of the question (see
 * lib/generation/queryResolution.ts) rather than the raw conversation
 * transcript, so the vector search stays focused on the user's current
 * intent instead of being diluted by unrelated earlier turns.
 * `searchChunks` itself is unchanged — this only changes what text is fed
 * into it.
 *
 * Source metadata in the response comes directly from the retrieval
 * results — never from the LLM's own output — so every returned source is
 * guaranteed to have actually come from retrieval, and the model has no
 * opportunity to invent or alter a citation. The one exception: when the
 * model determines the retrieved context doesn't actually support an
 * answer (it responds with the fixed NOT_FOUND_MESSAGE), the retrieved
 * chunks are discarded from the response entirely — they were candidates,
 * not evidence the answer relies on, so they must not be shown as if they
 * were.
 *
 * The `sources` list is also, before being returned: (1) deduplicated by
 * filename + page number (see dedupeSourcesByFilenameAndPage), since Top-K
 * can retrieve more than one chunk from the same page, and (2) filtered to
 * drop low-relevance candidates (see filterLowRelevanceSources /
 * MIN_SOURCE_SIMILARITY) — Top-K always returns exactly K candidates
 * regardless of how weak a match is, and a candidate merely filling out
 * the quota isn't necessarily evidence the answer relied on. Both are
 * display-only steps applied after generation — the full, unfiltered
 * `chunks` list is still what's used to build the context sent to Gemini,
 * so the answer itself is unaffected by either step.
 */
export async function answerQuery(
  query: string,
  history: ConversationMessage[] = []
): Promise<ChatAnswer> {
  const recentHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const retrievalQuery = await resolveStandaloneQuery(query, recentHistory);
  const chunks = await searchChunks(retrievalQuery, DEFAULT_TOP_K);

  if (chunks.length === 0) {
    // No candidates at all (e.g. nothing embedded yet) — answer
    // deterministically without spending a generation call.
    return { answer: NOT_FOUND_MESSAGE, sources: [] };
  }

  const context = buildContext(chunks);
  const answer = await generateAnswer(query, context, recentHistory);

  // The model was instructed to respond with exactly NOT_FOUND_MESSAGE when
  // the retrieved context doesn't support an answer. When that happens, the
  // chunks we retrieved were not actually relevant evidence for the answer
  // given — don't present them to the client as if they were sources.
  const isNotFound = answer.trim() === NOT_FOUND_MESSAGE;

  const sources: ChatSource[] = isNotFound
    ? []
    : filterLowRelevanceSources(
        dedupeSourcesByFilenameAndPage(
          chunks.map((chunk) => ({
            chunkId: chunk.chunkId,
            documentId: chunk.documentId,
            filename: chunk.filename,
            pageNumber: chunk.pageNumber,
            similarity: chunk.similarity,
          }))
        )
      );

  return { answer, sources };
}
