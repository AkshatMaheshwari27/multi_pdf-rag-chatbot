/**
 * Chunking configuration for a small RAG app. Character-based (not
 * token-based) to keep this dependency-free — good enough at this scale.
 */

/** Target size of each chunk, in characters. */
export const DEFAULT_CHUNK_SIZE = 1000;

/** How many characters of the previous chunk to repeat at the start of the next one. */
export const DEFAULT_CHUNK_OVERLAP = 200;
