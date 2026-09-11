import { geminiClient } from "@/lib/embeddings/gemini";
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

Answer the user's question using ONLY the "Context" the user message provides, which consists of excerpts retrieved from uploaded documents.

Rules you must follow exactly:
1. Base your answer strictly on the provided context. Do not use outside/general knowledge and do not invent, assume, or guess facts that aren't in the context.
2. Never mention, invent, or format citations, filenames, page numbers, source names, or excerpt numbers in your answer — citing sources is handled entirely outside of you, by the application, from its own records. Just answer the question in plain prose.
3. If the context is empty, or does not contain enough information to answer the question, respond with exactly this sentence and nothing else: "${NOT_FOUND_MESSAGE}"
4. Be concise and answer the question directly.`;

/**
 * Generates a grounded answer for `query` using `context` (built by
 * lib/generation/context.ts from retrieved chunks). Reuses the shared,
 * server-only Gemini client from lib/embeddings/gemini.ts. Throws on API
 * failure or an empty response — callers must treat that as a hard
 * failure, not silently return an empty/placeholder answer.
 */
export async function generateAnswer(query: string, context: string): Promise<string> {
  const prompt = context
    ? `Context:\n${context}\n\nQuestion: ${query}`
    : `Context: (no relevant context was retrieved)\n\nQuestion: ${query}`;

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
