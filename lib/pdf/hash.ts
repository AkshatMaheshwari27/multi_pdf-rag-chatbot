import { createHash } from "crypto";

/** SHA-256 hash (hex-encoded) of a file's raw bytes, used for de-duplication. */
export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
