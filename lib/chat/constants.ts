/**
 * Reasonable recent window of conversation history to use for context.
 * Applied both when the frontend trims what it sends and, defensively,
 * again on the server in case a client ever sends more.
 */
export const MAX_HISTORY_MESSAGES = 6;
