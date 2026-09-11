import type { ConversationMessage } from "@/lib/chat/types";
import { geminiClient } from "@/lib/embeddings/gemini";
import { GENERATION_MODEL } from "./constants";

const REWRITE_SYSTEM_INSTRUCTION = `You rewrite a user's follow-up question into a single, standalone question that focuses on their current intent, using the conversation so far ONLY to resolve references like "it", "they", "this", "that", or "those" to whatever they refer to.

Rules you must follow exactly:
1. Output ONLY the rewritten standalone question — no preamble, no quotes, no explanation, nothing else.
2. Preserve the user's current question as closely as possible; only resolve ambiguous references using the conversation. Do not fold in unrelated earlier topics.
3. Never answer the question yourself. Never add facts or information that weren't implied by the reference being resolved.
4. If the question is already standalone (doesn't depend on the conversation to make sense), return it unchanged.`;

/**
 * Resolves a possibly-ambiguous follow-up question into a standalone
 * question focused on the user's current intent, using recent conversation
 * turns only to resolve references (pronouns like "it"/"they"/"this") —
 * never to broaden the question with unrelated earlier topics. The result
 * is meant for retrieval (embedding + vector search), so that search
 * focuses primarily on what's actually being asked right now instead of
 * the whole conversation transcript.
 *
 * With no history, this returns `query` unchanged without calling Gemini —
 * both because there's nothing to resolve and to keep the common
 * (no-history) case exactly as fast/cheap as before. On any failure this
 * falls back to the raw `query` rather than blocking retrieval.
 */
export async function resolveStandaloneQuery(
  query: string,
  history: ConversationMessage[]
): Promise<string> {
  if (history.length === 0) {
    return query;
  }

  const transcript = history
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  const prompt = `Conversation so far:\n${transcript}\n\nFollow-up question: ${query}\n\nStandalone question:`;

  try {
    const response = await geminiClient.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
      config: {
        systemInstruction: REWRITE_SYSTEM_INSTRUCTION,
        temperature: 0,
      },
    });

    const text = response.text?.trim();
    return text ? text : query;
  } catch {
    return query;
  }
}
