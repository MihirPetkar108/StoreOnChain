import type { ExtractedInvoice } from "../types/invoice.types.js";

// ============================================================
// EXTRACT VALUE
// Finds a value after a label.
//
// Example:
// Invoice Number: INV-10293
// → INV-10293
// ============================================================

function extractValue(
  text: string,

  label: string,
): string | undefined {
  const escapedLabel = label.replace(
    /[.*+?^${}()|[\]\\]/g,

    "\\$&",
  );

  const regex = new RegExp(
    `${escapedLabel}\\s*[:：]\\s*([^\\n\\r]+)`,

    "i",
  );

  const match = text.match(regex);

  return match?.[1]?.trim();
}

// ============================================================
// EXTRACT NUMBER
//
// Handles values such as:
//
// 10,000 KGS
// USD 26,700.00
// 26700.00
// ============================================================

function extractNumber(
  text: string,

  label: string,
): number | undefined {
  const value = extractValue(
    text,

    label,
  );

  if (!value) {
    return undefined;
  }

  const numericValue = value

    .replace(/,/g, "")

    .match(/[0-9]+(?:\.[0-9]+)?/);

  if (!numericValue) {
    return undefined;
  }

  const number = Number(numericValue[0]);

  return Number.isNaN(number) ? undefined : number;
}

// ============================================================
// EXTRACT PRODUCT
//
// Example OCR:
// Product : Cotton Bales Discount (USD) : 0.00
//
// We only want:
// Cotton Bales
// ============================================================

function extractProduct(text: string): string | undefined {
  const regex =
    /Product\s*[:：]\s*([^\n\r]+?)(?=\s+Discount\b|\s+Tax\b|\s+Invoice\s+Amount\b|\s+Currency\b|\s*$)/i;

  const match = text.match(regex);

  return match?.[1]?.trim();
}

function extractCurrency(text: string): string | undefined {
  const regex = /Currency\s*[:：©@]\s*([A-Z]{3})\b/i;

  const match = text.match(regex);

  return match?.[1]?.toUpperCase();
}

// ============================================================
// EXTRACT STRUCTURED INVOICE DATA
// ============================================================

export function extractInvoiceFields(rawText: string): ExtractedInvoice {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("OCR text cannot be empty");
  }

  return {
    invoiceNumber: extractValue(rawText, "Invoice Number"),
    invoiceDate: extractValue(rawText, "Invoice Date"),

    product: extractProduct(rawText),
    quantity: extractNumber(rawText, "Quantity"),

    invoiceAmount: extractNumber(rawText, "Invoice Amount"),
    currency: extractCurrency(rawText),

    dueDate: extractValue(rawText, "Due Date"),
  };
}
