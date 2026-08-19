// ============================================================
// EXTRACTED INVOICE
// Fields extracted directly from the invoice through OCR.
// ============================================================

export interface ExtractedInvoice {
  // Invoice identification
  invoiceNumber: string | undefined;
  invoiceDate: string | undefined;

  // Product information
  product: string | undefined;
  quantity: number | undefined;

  // Financial information
  invoiceAmount: number | undefined;
  currency: string | undefined;

  // Payment information
  dueDate: string | undefined;
}

// ============================================================
// CANONICAL INVOICE
// This is the exact structure that will eventually be hashed.
// ============================================================

export interface CanonicalInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  product: string;
  quantity: number;
  invoiceAmount: number;
  currency: string;
  dueDate: string;
}
