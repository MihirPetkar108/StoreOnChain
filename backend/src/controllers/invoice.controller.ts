import type { Request, Response } from "express";

import { hashInvoiceData } from "../services/hashing.service.js";
import { getInvoice, uploadInvoice } from "../services/storage.service.js";
import { getTrade } from "../services/tradeLedger.service.js";

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

    const statusCode = message === "Invoice already exists" ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      message,
    });
  }
}

export async function verifyInvoiceController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // --------------------------------------------------------
    // Check invoice file and transaction ID
    // --------------------------------------------------------

    const { transactionId } = (req.body ?? {}) as { transactionId?: string };

    if (!transactionId || !req.file) {
      res.status(400).json({
        success: false,
        message: "Transaction ID and invoice file are required",
      });
      return;
    }

    // --------------------------------------------------------
    // Calculate hash of submitted invoice
    // --------------------------------------------------------

    const calculatedHash = hashInvoiceData(req.file.buffer);

    // --------------------------------------------------------
    // Get trade from blockchain
    // --------------------------------------------------------

    const trade = await getTrade(transactionId);
    if (!trade) {
      res.status(404).json({
        success: false,
        message: "Trade not found",
      });

      return;
    }
    const storedHash = trade.invoiceHash;

    // --------------------------------------------------------
    // Compare hashes
    // --------------------------------------------------------

    const verified = calculatedHash === storedHash;

    // --------------------------------------------------------
    // Return verification result
    // --------------------------------------------------------

    res.status(200).json({
      success: true,
      verified,
      message: verified ? "Invoice is authentic" : "Invoice has been modified",
    });
  } catch (error) {
    console.error("Error verifying invoice:", error);

    const message =
      error instanceof Error ? error.message : "Failed to verify invoice";

    res.status(500).json({
      success: false,
      message,
    });
  }
}

export async function getInvoiceController(
  req: Request,
  res: Response,
): Promise<void> {
  const transactionId = String(req.query.transactionId ?? "").trim();
  try {
    if (!transactionId) {
      res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
      return;
    }

    const trade = await getTrade(String(transactionId));
    if (!trade) {
      res.status(404).json({
        success: false,
        message: "Trade not found",
      });
      return;
    }

    const invoiceBuffer = await getInvoice(trade.invoiceHash);

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${transactionId}.pdf"`,
    );
    res.status(200).send(invoiceBuffer);
  } catch (error) {
    console.error("Error fetching invoice:", error);

    const message =
      error instanceof Error ? error.message : "Failed to fetch invoice";

    if (message.includes("Trade does not exist")) {
      res.status(404).json({
        success: false,
        message: `Trade ${transactionId} does not exist`,
      });

      return;
    }

    res.status(500).json({
      success: false,
      message,
    });
  }
}
