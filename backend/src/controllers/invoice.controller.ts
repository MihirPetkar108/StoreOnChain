import type { Request, Response } from "express";

import { hashInvoiceData } from "../services/hashing.service.js";
import { uploadInvoice } from "../services/storage.service.js";

// ============================================================
// PROCESS INVOICE
// POST /api/invoices/process
//
// Flow:
//
// Invoice
//    ↓
// Hashing the buffer and blockchain recording will be connected later.
// ============================================================

export async function processInvoiceController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // --------------------------------------------------------
    // Check whether a file was uploaded
    // --------------------------------------------------------

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Invoice file is required",
      });

      return;
    }

    const invoiceHash = hashInvoiceData(req.file.buffer);

    await uploadInvoice(req.file.buffer, invoiceHash, req.file.mimetype);

    // --------------------------------------------------------
    // Return result
    // --------------------------------------------------------

    res.status(200).json({
      success: true,
      message: "Invoice processed successfully",
      invoiceHash,
    });
  } catch (error) {
    console.error("Error processing invoice:", error);

    const message =
      error instanceof Error ? error.message : "Failed to process invoice";

    res.status(500).json({
      success: false,
      message,
    });
  }
}
