import { PDFParse } from "pdf-parse";
import { MAX_PDF_FILE_SIZE_BYTES } from "./constants";
import type { PdfExtractionResult } from "./types";

/** The literal bytes every valid PDF file starts with. */
const PDF_MAGIC_BYTES = "%PDF-";

/**
 * Cheap structural check that the buffer actually looks like a PDF,
 * independent of the filename or the browser-supplied MIME type
 * (which are both easy to spoof or leave blank).
 */
function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, PDF_MAGIC_BYTES.length).toString("ascii") === PDF_MAGIC_BYTES;
}

function hasPdfExtension(filename: string): boolean {
  return filename.toLowerCase().endsWith(".pdf");
}

/**
 * Validates that an uploaded file is plausibly a PDF before we spend time
 * parsing it. Returns an error message when invalid, or null when it looks fine.
 */
export function validatePdfFile(filename: string, buffer: Buffer): string | null {
  if (buffer.length === 0) {
    return "File is empty.";
  }

  if (buffer.length > MAX_PDF_FILE_SIZE_BYTES) {
    const limitMb = MAX_PDF_FILE_SIZE_BYTES / (1024 * 1024);
    return `File exceeds the ${limitMb}MB size limit.`;
  }

  if (!hasPdfExtension(filename)) {
    return "File does not have a .pdf extension.";
  }

  if (!hasPdfSignature(buffer)) {
    return "File does not look like a valid PDF (missing %PDF- header).";
  }

  return null;
}

/**
 * Extracts text from a PDF buffer, grouped by page, preserving page numbers.
 * Throws on unparsable/corrupted PDFs — callers should catch and report per-file.
 */
async function extractPdfText(buffer: Buffer): Promise<{ numPages: number; pages: { page: number; text: string }[] }> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();

    return {
      numPages: result.total,
      pages: result.pages
        .slice()
        .sort((a, b) => a.num - b.num)
        .map((page) => ({ page: page.num, text: page.text })),
    };
  } finally {
    await parser.destroy().catch(() => {
      // Best-effort cleanup; parsing result already captured above.
    });
  }
}

/**
 * Validates and processes a single uploaded PDF, never throwing — any
 * failure (invalid file, corrupted PDF, parse error) is captured in the
 * returned result so one bad file never fails the whole batch.
 */
export async function processPdfFile(filename: string, buffer: Buffer): Promise<PdfExtractionResult> {
  const validationError = validatePdfFile(filename, buffer);
  if (validationError) {
    return { filename, status: "error", error: validationError };
  }

  try {
    const { numPages, pages } = await extractPdfText(buffer);

    if (numPages === 0 || pages.length === 0) {
      return { filename, status: "error", error: "No pages could be read from this PDF." };
    }

    return { filename, status: "success", numPages, pages };
  } catch (err) {
    return {
      filename,
      status: "error",
      error: err instanceof Error ? err.message : "Failed to parse PDF (corrupted or unsupported file).",
    };
  }
}
