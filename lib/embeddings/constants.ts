/** Gemini embedding model used for every chunk. */
export const EMBEDDING_MODEL = "gemini-embedding-001";

/** Must match the `chunks.embedding` column's vector(768) dimension. */
export const EMBEDDING_DIMENSIONS = 768;

/** Max number of texts sent to the Gemini API in a single embedContent call. */
export const EMBEDDING_BATCH_SIZE = 50;
