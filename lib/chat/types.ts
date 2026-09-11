export interface ChatSource {
  chunkId: number;
  documentId: number;
  filename: string;
  pageNumber: number | null;
  similarity: number;
}

export interface ChatAnswer {
  answer: string;
  sources: ChatSource[];
}
