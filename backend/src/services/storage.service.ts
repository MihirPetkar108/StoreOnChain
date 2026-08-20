// ============================================================
// STORAGE SERVICE
// Handles invoice files in Supabase Storage.
// ============================================================

import { supabase } from "../config/supabase.config.js";

// ============================================================
// CONSTANTS
// ============================================================

const INVOICE_BUCKET = "invoice";

// ============================================================
// UPLOAD INVOICE
//
// The SHA-256 hash is used as the filename.
//
// Example:
//
// hash:
// 8f3a91c2...c921
//
// stored as:
// invoice/8f3a91c2...c921.pdf
// ============================================================

export async function uploadInvoice(
  fileBuffer: Buffer,
  invoiceHash: string,
  mimeType: string,
): Promise<string> {
  // ----------------------------------------------------------
  // Determine file extension
  // ----------------------------------------------------------

  const extensionMap: Record<string, string> = {
    "application/pdf": "pdf",
  };

  const extension = extensionMap[mimeType];

  if (!extension) {
    throw new Error(`Unsupported invoice file type: ${mimeType}`);
  }

  // ----------------------------------------------------------
  // Create storage path
  // ----------------------------------------------------------

  const filePath = `${invoiceHash}.${extension}`;

  // ----------------------------------------------------------
  // Upload to Supabase Storage
  // ----------------------------------------------------------

  const { error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    if (error.message.toLowerCase().includes("already exists")) {
      throw new Error("Invoice already exists");
    }
    throw new Error(`Failed to upload invoice: ${error.message}`);
  }

  return filePath;
}

// ============================================================
// GET INVOICE
//
// Retrieves the invoice file from Supabase Storage.
// ============================================================

export async function getInvoice(invoiceHash: string): Promise<Buffer> {
  const extensions = ["pdf"];

  for (const extension of extensions) {
    const filePath = `${invoiceHash}.${extension}`;

    const { data, error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .download(filePath);

    if (!error && data) {
      return Buffer.from(await data.arrayBuffer());
    }
  }

  throw new Error("Invoice file not found");
}

// ============================================================
// GET INVOICE URL
//
// Generates a temporary signed URL for accessing the invoice.
// ============================================================

export async function getInvoiceUrl(
  invoiceHash: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const extensions = ["pdf"];

  for (const extension of extensions) {
    const filePath = `${invoiceHash}.${extension}`;

    const { data, error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  throw new Error("Invoice file not found");
}

export async function deleteInvoice(invoiceHash: string) {
  const filePath = `${invoiceHash}.pdf`;

  const { error } = await supabase.storage
    .from(INVOICE_BUCKET)
    .remove([filePath]);
  if (error) {
    throw new Error(`Failed to delete invoice: ${error.message}`);
  }
  console.log(`Invoice file deleted successfully`);
}
