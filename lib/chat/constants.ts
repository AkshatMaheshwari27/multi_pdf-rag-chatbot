/**
 * Reasonable recent window of conversation history to use for context.
 * Applied both when the frontend trims what it sends and, defensively,
 * again on the server in case a client ever sends more.
 */
export const MAX_HISTORY_MESSAGES = 6;

/**
 * Minimum cosine similarity a retrieved chunk must have to be shown to the
 * client as a "source" for the answer. Retrieval always returns Top-K
 * candidates regardless of how weak the match is, but a candidate that
 * merely made the Top-K cut isn't necessarily evidence the answer actually
 * relied on — this trims the ones that clearly weren't.
 *
 * Chosen from real similarity scores observed in manual testing against
 * this project's live Supabase + Gemini data: genuinely relevant matches
 * (including secondary documents in a multi-document answer) consistently
 * scored >= ~0.62, while unrelated documents pulled in only because they
 * filled out the Top-K scored <= ~0.53 (occasionally as high as 0.53 for
 * topically-similar-but-wrong documents, e.g. an office-hours policy
 * showing up for a returns-policy question). 0.55 sits in the gap between
 * those two clusters with margin on both sides. This is a deliberately
 * conservative cut — biased toward keeping a borderline-real source rather
 * than risking hiding one — not a rigorously tuned value; revisit if the
 * document set grows or gets more topically similar.
 */
export const MIN_SOURCE_SIMILARITY = 0.55;
