/** Gemini model used for RAG answer generation (distinct from the embedding model). */
export const GENERATION_MODEL = "gemini-3.5-flash-lite";

/** Fixed message returned when retrieved context can't answer the question — never paraphrased by the model. */
export const NOT_FOUND_MESSAGE = "The information was not found in the uploaded documents.";
