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
}

export interface PdfExtractionError {
  filename: string;
  status: "error";
  error: string;
}

export type PdfExtractionResult = PdfExtractionSuccess | PdfExtractionError;

export interface PdfUploadResponse {
  count: number;
  results: PdfExtractionResult[];
}
