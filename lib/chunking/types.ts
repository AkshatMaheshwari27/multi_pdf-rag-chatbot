export interface ChunkingOptions {
  /** Target size of each chunk, in characters. */
  chunkSize?: number;
  /** How many characters of the previous chunk to repeat at the start of the next one. */
  chunkOverlap?: number;
}

export interface TextChunk {
  pageNumber: number;
  content: string;
}
