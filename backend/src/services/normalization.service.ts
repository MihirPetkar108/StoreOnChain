// ============================================================
// NORMALIZATION SERVICE
// Converts extracted invoice data into a canonical format
// before SHA-256 hashing.
// ============================================================

import type {
  CanonicalInvoice,
  ExtractedInvoice,
} from "../types/invoice.types.js";

// ============================================================
// NORMALIZE STRING
// Removes unnecessary whitespace and converts text to uppercase.
// ============================================================

function normalizeString(value: string | undefined): string {
  if (!value) {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

// ============================================================
// NORMALIZE DATE
//
// Converts common invoice date formats into:
// YYYY-MM-DD
//
// Example:
// "18 Aug 2026" → "2026-08-18"
// ============================================================

function normalizeDate(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return normalizeString(value);
  }

  return String(date.toISOString().split("T")[0]);
}

// ============================================================
// NORMALIZE NUMBER
//
// Removes formatting differences.
//
// Example:
// 26,700.00 → 26700
// ============================================================

function normalizeNumber(value: number | undefined): number {
  if (value === undefined || value === null) {
    return 0;
  }

  return Number(value.toFixed(2));
}

// ============================================================
// NORMALIZE INVOICE
// ============================================================

export function normalizeInvoice(invoice: ExtractedInvoice): CanonicalInvoice {
  return {
    invoiceNumber: normalizeString(invoice.invoiceNumber),

    invoiceDate: normalizeDate(invoice.invoiceDate),

    product: normalizeString(invoice.product),

    quantity: normalizeNumber(invoice.quantity),

    invoiceAmount: normalizeNumber(invoice.invoiceAmount),

    currency: normalizeString(invoice.currency),

    dueDate: normalizeDate(invoice.dueDate),
  };
}
