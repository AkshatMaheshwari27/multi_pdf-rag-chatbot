/**
 * Shared upload limits. Safe to import from client components (no server-only deps).
 */

/** Maximum number of PDF files accepted per upload/session. */
export const MAX_PDF_FILES = 50;

/** Soft per-file size guard (25 MB) to avoid loading huge buffers into memory. */
export const MAX_PDF_FILE_SIZE_BYTES = 25 * 1024 * 1024;
