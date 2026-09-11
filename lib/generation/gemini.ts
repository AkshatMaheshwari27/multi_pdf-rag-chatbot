import { geminiClient } from "@/lib/embeddings/gemini";
import type { ConversationMessage } from "@/lib/chat/types";
import { GENERATION_MODEL, NOT_FOUND_MESSAGE } from "./constants";

// Same server-only guard as the embeddings module. Redundant with the one
// `lib/embeddings/gemini.ts` already runs on import (which this module
// always triggers, since it imports geminiClient from there), but kept
// here too so this file is self-evidently safe on its own.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/generation/gemini.ts must not be imported in client components or run in the browser."
  );
}

const SYSTEM_INSTRUCTION = `You are a document question-answering assistant for a RAG application.

The user message may include up to three parts: "Conversation so far" (recent prior turns), "Context" (excerpts retrieved from uploaded documents), and the current "Question".

Rules you must follow exactly:
1. "Conversation so far", if present, exists ONLY to help you understand what the current question refers to — e.g. resolving words like "it", "they", "this", or "those" to whatever was discussed earlier. NEVER treat anything said in "Conversation so far" as a fact you can answer from; it is not evidence, even if it looks like it contains an answer.
2. Base your answer strictly on the provided "Context". Do not use outside/general knowledge and do not invent, assume, or guess facts that aren't in the Context.
3. Never mention, invent, or format citations, filenames, page numbers, source names, or excerpt numbers in your answer — citing sources is handled entirely outside of you, by the application, from its own records. Just answer the question in plain prose.
4. If the Context is empty, or does not contain enough information to answer the (possibly reinterpreted) question, respond with exactly this sentence and nothing else: "${NOT_FOUND_MESSAGE}"
5. Be concise and answer the question directly.`;

/**
 * Generates a grounded answer for `query` using `context` (built by
 * lib/generation/context.ts from retrieved chunks) and, optionally, recent
 * `history` to help interpret follow-up questions. History is included
 * purely as conversational context, clearly separated from and
 * subordinate to `context` — see rule 1 in SYSTEM_INSTRUCTION — never as a
 * source of facts.
 *
 * Reuses the shared, server-only Gemini client from lib/embeddings/gemini.ts.
 * Throws on API failure or an empty response — callers must treat that as
 * a hard failure, not silently return an empty/placeholder answer.
 */
export async function generateAnswer(
  query: string,
  context: string,
  history: ConversationMessage[] = []
): Promise<string> {
  const historyBlock =
    history.length > 0
      ? `Conversation so far (for understanding the question only — NOT a source of facts):\n${history
          .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
          .join("\n")}\n\n`
      : "";

  const contextBlock = context ? context : "(no relevant context was retrieved)";

  const prompt = `${historyBlock}Context:\n${contextBlock}\n\nQuestion: ${query}`;

  const response = await geminiClient.models.generateContent({
    model: GENERATION_MODEL,
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text.trim();
}
