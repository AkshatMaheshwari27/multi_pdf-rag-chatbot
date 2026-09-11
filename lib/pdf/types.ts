/**
 * Shared PDF upload/extraction types.
 * No server-only imports here so this file is safe to import from client components too.
 */

export interface PdfPageText {
  page: number;
  text: string;
}

export interface PdfExtractionSuccess {
  filename: string;
  status: "success";
  numPages: number;
  pages: PdfPageText[];
  documentId: number;
  hash: string;
  chunkCount: number;
}

/** The file's content hash already matched an existing `documents` row — it was not re-processed. */
export interface PdfExtractionDuplicate {
  filename: string;
  status: "duplicate";
  message: string;
  documentId: number;
  hash: string;
}

export interface PdfExtractionError {
  filename: string;
  status: "error";
  error: string;
}

export type PdfExtractionResult = PdfExtractionSuccess | PdfExtractionDuplicate | PdfExtractionError;

export interface PdfUploadResponse {
  count: number;
  results: PdfExtractionResult[];
}
