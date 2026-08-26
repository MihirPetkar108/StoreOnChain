import type { Request, Response } from "express";

import { hashInvoiceData } from "../services/hashing.service.js";
import { getInvoice } from "../services/storage.service.js";
import { getTradesByTransactionId } from "../services/tradeLedger.service.js";
import type { Trade } from "../types/trade.types.js";

async function getLatestTradeWithInvoice(
  transactionId: string,
): Promise<Trade | undefined> {
  const trades = await getTradesByTransactionId(transactionId);

  for (let index = trades.length - 1; index >= 0; index -= 1) {
    const trade = trades[index];
    if (trade && trade.invoiceHash.trim().length > 0) {
      return trade;
    }
  }

  return undefined;
}

export async function verifyInvoiceController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    // --------------------------------------------------------
    // Check invoice file and transaction ID
    // --------------------------------------------------------

    const transactionId = String(
      req.body?.transactionId ?? req.query.transactionId ?? "",
    ).trim();

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

    const trade = await getLatestTradeWithInvoice(transactionId);
    if (!trade) {
      res.status(404).json({
        success: false,
        message: `Trade ${transactionId} does not exist`,
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

    if (message.includes("Trade does not exist")) {
      const transactionId = String(
        req.body?.transactionId ?? req.query.transactionId ?? "",
      ).trim();

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

    const trade = await getLatestTradeWithInvoice(transactionId);
    if (!trade) {
      res.status(404).json({
        success: false,
        message: `Trade ${transactionId} does not exist`,
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

    if (message.includes("Invoice file not found")) {
      res.status(404).json({
        success: false,
        message,
      });

      return;
    }

    res.status(500).json({
      success: false,
      message,
    });
  }
}
