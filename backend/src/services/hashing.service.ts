import { createHash } from "crypto";

// ============================================================
// HASH INVOICE DATA
// Generates a SHA-256 hash from canonicalized invoice data.
// ============================================================

export function hashInvoiceData(fileBuffer: Buffer): string {
  return createHash("sha256").update(fileBuffer).digest("hex");
}
