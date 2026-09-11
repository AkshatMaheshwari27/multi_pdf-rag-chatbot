export interface RetrievalResult {
  chunkId: number;
  documentId: number;
  filename: string;
  pageNumber: number | null;
  content: string;
  /** Cosine similarity to the query embedding, in [-1, 1] (higher = more similar). */
  similarity: number;
}
