import { supabaseServer } from "@/lib/supabase/server";

/** Postgres error code for a unique constraint violation. */
const UNIQUE_VIOLATION = "23505";

export interface DocumentRow {
  id: number;
  filename: string;
  file_hash: string;
  created_at: string;
}

/**
 * Looks up a document by its content hash. Returns null when no matching
 * row exists. Throws on any database/query error — callers must not treat
 * a thrown error as "not found".
 */
export async function findDocumentByHash(fileHash: string): Promise<DocumentRow | null> {
  const { data, error } = await supabaseServer
    .from("documents")
    .select("id, filename, file_hash, created_at")
    .eq("file_hash", fileHash)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up document by hash: ${error.message}`);
  }

  return data;
}

/**
 * Inserts a new document row for a hash that isn't in the table yet.
 *
 * If two uploads of the same new file race each other, both may pass the
 * "not found" check before either inserts; the unique constraint on
 * file_hash will then reject the second insert. That specific case is
 * treated as a duplicate (we fetch and return the row the other request
 * created) rather than as a failure. Any other database error is thrown.
 */
export async function insertDocument(filename: string, fileHash: string): Promise<DocumentRow> {
  const { data, error } = await supabaseServer
    .from("documents")
    .insert({ filename, file_hash: fileHash })
    .select("id, filename, file_hash, created_at")
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const existing = await findDocumentByHash(fileHash);
      if (existing) {
        return existing;
      }
    }
    throw new Error(`Failed to save document record: ${error.message}`);
  }

  return data;
}
