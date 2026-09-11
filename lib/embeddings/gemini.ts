import { GoogleGenAI } from "@google/genai";
import { EMBEDDING_BATCH_SIZE, EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "./constants";

// Hard runtime guard, mirroring lib/supabase/server.ts: fail loudly if this
// module ever ends up in a browser bundle instead of silently shipping (or
// trying to use) the Gemini API key there.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/embeddings/gemini.ts must not be imported in client components or run in the browser."
  );
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable. Make sure it is set in .env.local");
}

const client = new GoogleGenAI({ apiKey });

/**
 * The shared, server-only Gemini client (API key + browser guard already
 * applied above). Exported so other server-side Gemini use — e.g. answer
 * generation in lib/generation — reuses this one authenticated client
 * instead of constructing a second one.
 */
export const geminiClient = client;

/** Calls Gemini once for up to EMBEDDING_BATCH_SIZE texts, in order. */
async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const embeddings = response.embeddings;
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error(
      `Gemini returned ${embeddings?.length ?? 0} embeddings for a batch of ${texts.length} texts.`
    );
  }

  return embeddings.map((embedding, i) => {
    const values = embedding.values;
    if (!values || values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding ${i} has ${values?.length ?? 0} dimensions; expected ${EMBEDDING_DIMENSIONS}.`
      );
    }
    return values;
  });
}

/**
 * Generates a 768-dimensional embedding for every input text, in order,
 * batching requests to Gemini so a large document doesn't send one huge
 * request. Throws on any API failure or unexpected response shape — callers
 * must treat that as a hard failure, not silently store chunks without
 * embeddings.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const results: number[][] = [];
  for (let start = 0; start < texts.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = texts.slice(start, start + EMBEDDING_BATCH_SIZE);
    const batchEmbeddings = await embedBatch(batch);
    results.push(...batchEmbeddings);
  }

  return results;
}
