import { DEFAULT_CHUNK_OVERLAP, DEFAULT_CHUNK_SIZE } from "./constants";
import type { ChunkingOptions, TextChunk } from "./types";

/**
 * Splits a single string into overlapping, word-aligned chunks of roughly
 * `chunkSize` characters, repeating the trailing `chunkOverlap` characters
 * of each chunk at the start of the next one so context isn't lost at chunk
 * boundaries.
 *
 * Word-aligned (splits on whitespace) rather than a raw character slice, so
 * chunks don't cut words in half. Simple and dependency-free — appropriate
 * for a small RAG app; a token-aware splitter could replace this later
 * without changing callers.
 */
export function chunkText(text: string, options: ChunkingOptions = {}): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0.");
  }
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be >= 0 and less than chunkSize.");
  }

  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ");
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    let end = start;
    let length = 0;

    // Grow the window word-by-word until adding the next word would exceed
    // chunkSize (always take at least one word, even if it alone is longer
    // than chunkSize, so we never get stuck).
    while (end < words.length) {
      const addedLength = words[end].length + (end > start ? 1 : 0); // +1 for the joining space
      if (length + addedLength > chunkSize && end > start) break;
      length += addedLength;
      end++;
    }

    chunks.push(words.slice(start, end).join(" "));

    if (end >= words.length) break;

    // Back up from `end` by roughly chunkOverlap characters so the next
    // chunk repeats some trailing context from this one.
    let overlapLength = 0;
    let nextStart = end;
    while (nextStart > start && overlapLength < chunkOverlap) {
      nextStart--;
      overlapLength += words[nextStart].length + 1;
    }

    // Guard against a zero-progress loop (shouldn't happen given the checks
    // above, but stay safe).
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

/**
 * Chunks every page of extracted PDF text, preserving each chunk's source
 * page number. Pages with no extractable text simply contribute no chunks.
 */
export function chunkPages(
  pages: { page: number; text: string }[],
  options: ChunkingOptions = {}
): TextChunk[] {
  const result: TextChunk[] = [];

  for (const page of pages) {
    const pieces = chunkText(page.text, options);
    for (const content of pieces) {
      result.push({ pageNumber: page.page, content });
    }
  }

  return result;
}
