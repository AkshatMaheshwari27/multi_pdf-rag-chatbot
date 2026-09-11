/**
 * One prior turn of conversation, sent by the client so the backend can
 * interpret follow-up questions (e.g. resolve "it"/"they"/"this"). This is
 * context for understanding the question only — never treated as a
 * factual source; only retrieved document chunks are evidence.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

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
