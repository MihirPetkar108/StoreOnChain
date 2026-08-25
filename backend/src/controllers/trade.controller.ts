import type { Request, Response } from "express";
import {
  getTrade,
  getExporterTradeIds,
  getExporterReputation,
  recordTrade,
  getTradesByTransactionId,
  getTradesByStatus,
  getTradesForExporterByStatus,
} from "../services/tradeLedger.service.js";
import type { RecordTradeRequest } from "../types/trade.types.js";
import axios from "axios";
import { deleteInvoice } from "../services/storage.service.js";
import { getProductFromListing } from "../services/tradeDB.service.js";
import { randomUUID } from "node:crypto";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// ============================================================
// RECORD TRADE
// POST /api/trades
// ============================================================

export async function recordTradeController(
  req: Request,
  res: Response,
): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const input: RecordTradeRequest = {
    ...body,
    transactionId: body.transactionId ?? body.transaction_id,
    exporterId: body.exporterId ?? body.exporter_id,
    importerId:
      body.importerId ??
      body.importer_id ??
      "00000002-0000-0000-0000-000000000023",
    listingId: body.listingId ?? body.listing_id,
    totalAmount: body.totalAmount ?? body.total_amount,
    tradeStatus: body.tradeStatus ?? body.trade_status ?? "PENDING",
    trustScoreAfterTrade:
      body.trustScoreAfterTrade ?? body.trust_score_after_trade,
  } as RecordTradeRequest;
  try {
    if (
      typeof input.transactionId !== "string" ||
      input.transactionId.trim().length === 0
    ) {
      res.status(400).json({
        success: false,
        message: "transactionId is required",
      });
      return;
    }

    const history = await getTradesByTransactionId(input.transactionId);
    const originalTrade = history[0];
    const isInitialTrade = input.tradeStatus.trim().toUpperCase() === "CREATED";
    if (!originalTrade && !isInitialTrade) {
      res.status(404).json({
        success: false,
        message: "Transaction ID was not found on the blockchain",
      });
      return;
    }

    if (originalTrade) {
      input.exporterId = originalTrade.exporterId;
      input.importerId = originalTrade.importerId;
      input.product = originalTrade.product;
      input.quantity = Number(originalTrade.quantity);
      input.totalAmount = Number(originalTrade.totalAmount);
      input.currency = originalTrade.currency;
    }

    if (originalTrade) {
      const previousInspection = [...history]
        .reverse()
        .find(
          (trade) => trade.inspectionStatus.trim().toUpperCase() !== "PENDING",
        );
      if (
        input.tradeStatus.trim().toUpperCase() !== "INSPECTED" &&
        previousInspection
      ) {
        input.inspectionStatus = previousInspection.inspectionStatus;
      }
    }

    if (req.file) {
      const formData = new FormData();
      const fileBytes = new Uint8Array(req.file.buffer.length);
      fileBytes.set(req.file.buffer);

      const fileBlob = new Blob([fileBytes], {
        type: req.file.mimetype,
      });

      formData.append("invoice", fileBlob, req.file.originalname);

      const { data } = await axios.post(
        `${BACKEND_URL}/api/invoice/process`,
        formData,
      );

      input.invoiceHash = data.invoiceHash;
    } else if (originalTrade) {
      input.invoiceHash = originalTrade.invoiceHash;
    }

    const product = await getProductFromListing(input.listingId);
    if (!product) {
      throw new Error("Product is required for the listing");
    }
    input.product = product;

    input.recordId = randomUUID();
    const result = await recordTrade(input);

    res.status(201).json({
      success: true,
      message: "Trade recorded successfully",
      data: {
        transactionId: input.transactionId,
        recordId: input.recordId,
        listingId: input.listingId,
        exporterId: input.exporterId,
        importerId: input.importerId,
        product: product,
        quantity: String(input.quantity),
        totalAmount: String(input.totalAmount),
        currency: input.currency,
        tradeStatus: input.tradeStatus,
        inspectionStatus: input.inspectionStatus,
        disputeStatus: input.disputeStatus,
        settlementStatus: input.settlementStatus,
        expectedDelivery: input.expectedDelivery,
        actualDelivery: input.actualDelivery,
        invoiceHash: input.invoiceHash,
        trustScoreAfterTrade: String(input.trustScoreAfterTrade),
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
      },
    });
  } catch (error) {
    console.error("Error recording trade:", error);

    // Delete file uploaded from supabase storage if trade recording fails
    if (req.file) {
      try {
        await deleteInvoice(input.invoiceHash);
        console.log("Invoice file deleted successfully");
      } catch (deleteError) {
        console.error("Error deleting invoice file:", deleteError);
      }
    }

    // Handle errors coming from the invoice processing API
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 409 || status === 400) {
        res.status(status).json({
          success: false,
          message: message || "Invalid request or file format",
        });

        return;
      }
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    const validationErrorMessages = [
      "is required",
      "must be a non-negative number",
      "Invalid date",
      "Invalid date format",
      "File type is not supported",
      "Only PDF files are allowed",
      "not supported",
    ];

    const isValidationError = validationErrorMessages.some((text) =>
      message.includes(text),
    );

    res.status(isValidationError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}

// ============================================================
// GET ONE TRADE
// GET /api/trades/:transactionId
// ============================================================

export async function getTradeController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const transactionId = String(req.params.transactionId);

    if (!transactionId) {
      res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
      return;
    }

    const trades = await getTradesByTransactionId(transactionId);

    if (trades.length === 0) {
      res.status(404).json({
        success: false,
        message: "Trade not found",
      });
      return;
    }

    const serializedTrades = trades.map((trade) => ({
      ...trade,
      quantity: trade.quantity.toString(),
      totalAmount: trade.totalAmount.toString(),
      trustScoreAfterTrade: trade.trustScoreAfterTrade.toString(),
      expectedDelivery: trade.expectedDelivery.toString(),
      actualDelivery: trade.actualDelivery.toString(),
      timestamp: trade.timestamp.toString(),
    }));

    res.status(200).json({
      success: true,
      trades: serializedTrades,
      trade: serializedTrades[serializedTrades.length - 1],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    console.error("Error fetching trade:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trade",
    });
  }
}

// ============================================================
// GET EXPORTER TRADE HISTORY
// GET /api/exporters/:exporterId/trades
// ============================================================

export async function getExporterTradeIdsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const exporterId = String(req.params.exporterId);

    if (!exporterId) {
      res.status(400).json({
        success: false,
        message: "Exporter ID is required",
      });
      return;
    }

    const tradeIds = await getExporterTradeIds(exporterId);

    res.status(200).json({
      success: true,
      exporterId,
      tradeIds,
      totalTrades: tradeIds.length,
    });
  } catch (error) {
    console.error("Error fetching exporter trade history:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exporter trade history",
    });
  }
}

// ============================================================
// GET EXPORTER REPUTATION
// GET /api/exporters/:exporterId/reputation
// ============================================================

export async function getExporterReputationController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const exporterId = String(req.params.exporterId);

    if (!exporterId) {
      res.status(400).json({
        success: false,
        message: "Exporter ID is required",
      });
      return;
    }

    const reputation = await getExporterReputation(exporterId);

    res.status(200).json({
      success: true,
      exporterId,
      reputation: {
        successfulTrades: reputation.successfulTrades.toString(),
        disputedTrades: reputation.disputedTrades.toString(),
        failedTrades: reputation.failedTrades.toString(),
        cancelledTrades: reputation.cancelledTrades.toString(),
        inspectedTrades: reputation.inspectedTrades.toString(),
        onTimeDeliveryRate: reputation.onTimeDeliveryRate.toString(),
        qualityPassRate: reputation.qualityPassRate.toString(),
        disputeRate: reputation.disputeRate.toString(),
        currentTrustScore: reputation.currentTrustScore.toString(),
        totalTrades: reputation.totalTrades.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching exporter reputation:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch exporter reputation",
    });
  }
}

// ============================================================
// GET TRADES BY STATUS
// GET /api/trades?status=COMPLETED
// ============================================================

export async function getTradesByStatusController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const status = String(req.query.status || "ALL").trim();

    const trades = await getTradesByStatus(status);

    res.status(200).json({
      success: true,
      status,
      totalTrades: trades.length,
      trades: trades.map((trade) => ({
        recordId: trade.recordId,
        transactionId: trade.transactionId,
        listingId: trade.listingId,
        exporterId: trade.exporterId,
        importerId: trade.importerId,
        product: trade.product,
        quantity: trade.quantity.toString(),
        totalAmount: trade.totalAmount.toString(),
        currency: trade.currency,
        transactionHash: trade.transactionHash,
        tradeStatus: trade.tradeStatus,
        inspectionStatus: trade.inspectionStatus,
        disputeStatus: trade.disputeStatus,
        settlementStatus: trade.settlementStatus,
        expectedDelivery: trade.expectedDelivery.toString(),
        actualDelivery: trade.actualDelivery.toString(),
        invoiceHash: trade.invoiceHash,
        trustScoreAfterTrade: trade.trustScoreAfterTrade.toString(),
        timestamp: trade.timestamp.toString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Invalid trade status")) {
      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    console.error("Error filtering trades:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trades by status",
    });
  }
}

// ============================================================
// GET EXPORTER TRADE HISTORY BY STATUS
// GET /api/exporters/:exporterId/trades?status=COMPLETED
// ============================================================

export async function getExporterTradeIdsByStatusController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const exporterId = String(req.params.exporterId);

    if (!exporterId) {
      res.status(400).json({
        success: false,
        message: "Exporter ID is required",
      });
      return;
    }

    const status = String(req.query.status || "").trim();

    if (!status) {
      res.status(400).json({
        success: false,
        message: "Status query parameter is required",
      });

      return;
    }

    const trades = await getTradesForExporterByStatus(exporterId, status);

    res.status(200).json({
      success: true,
      exporterId,
      status,
      totalTrades: trades.length,
      trades: trades.map((trade) => ({
        recordId: trade.recordId,
        transactionId: trade.transactionId,
        listingId: trade.listingId,
        exporterId: trade.exporterId,
        importerId: trade.importerId,
        product: trade.product,
        quantity: trade.quantity.toString(),
        totalAmount: trade.totalAmount.toString(),
        currency: trade.currency,
        transactionHash: trade.transactionHash,
        tradeStatus: trade.tradeStatus,
        inspectionStatus: trade.inspectionStatus,
        disputeStatus: trade.disputeStatus,
        settlementStatus: trade.settlementStatus,
        expectedDelivery: trade.expectedDelivery.toString(),
        actualDelivery: trade.actualDelivery.toString(),
        invoiceHash: trade.invoiceHash,
        trustScoreAfterTrade: trade.trustScoreAfterTrade.toString(),
        timestamp: trade.timestamp.toString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Invalid trade status")) {
      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    console.error("Error filtering trades by exporter and status:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trades by exporter and status",
    });
  }
}
