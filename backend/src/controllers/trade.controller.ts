import type { Request, Response } from "express";
import {
  getTrade,
  getExporterTradeIds,
  getExporterReputation,
  recordTrade,
  getTradesByStatus,
} from "../services/tradeLedger.service.js";
import type { RecordTradeRequest } from "../types/trade.types.js";
import axios from "axios";
import { deleteInvoice } from "../services/storage.service.js";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

// ============================================================
// RECORD TRADE
// POST /api/trades
// ============================================================

export async function recordTradeController(
  req: Request,
  res: Response,
): Promise<void> {
  const input: RecordTradeRequest = req.body as RecordTradeRequest;
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Invoice file is required",
      });

      return;
    }

    // --------------------------------------------------------
    // Convert the uploaded file into FormData
    // --------------------------------------------------------

    const formData = new FormData();
    const fileBytes = new Uint8Array(req.file.buffer.length);
    fileBytes.set(req.file.buffer);

    const fileBlob = new Blob([fileBytes], {
      type: req.file?.mimetype,
    });

    formData.append("invoice", fileBlob, req.file?.originalname);

    const { data } = await axios.post(
      `${BACKEND_URL}/api/invoice/process`,
      formData,
    );

    input.invoiceHash = data.invoiceHash;
    console.log("Invoice Hash:", input.invoiceHash);

    const result = await recordTrade(input);

    res.status(201).json({
      success: true,
      message: "Trade recorded successfully",
      data: {
        transactionId: input.transactionId,
        exporterId: input.exporterId,
        importerId: input.importerId,
        product: input.product,
        quantity: String(input.quantity),
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

    const trade = await getTrade(transactionId);

    res.status(200).json({
      success: true,
      trade: {
        transactionId: trade.transactionId,
        exporterId: trade.exporterId,
        importerId: trade.importerId,
        product: trade.product,
        quantity: trade.quantity.toString(),
        tradeStatus: trade.tradeStatus,
        inspectionStatus: trade.inspectionStatus,
        disputeStatus: trade.disputeStatus,
        settlementStatus: trade.settlementStatus,
        expectedDelivery: trade.expectedDelivery.toString(),
        actualDelivery: trade.actualDelivery.toString(),
        invoiceHash: trade.invoiceHash,
        trustScoreAfterTrade: trade.trustScoreAfterTrade.toString(),
        timestamp: trade.timestamp.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message.includes("Trade does not exist")) {
      res.status(404).json({
        success: false,
        message: "Trade not found",
      });
      return;
    }

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
        transactionId: trade.transactionId,
        exporterId: trade.exporterId,
        importerId: trade.importerId,
        product: trade.product,
        quantity: trade.quantity.toString(),
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

    const trades = await getTradesByStatus(status);

    // Filter trades by exporterId
    const filteredTrades = trades.filter(
      (trade) => trade.exporterId === exporterId,
    );

    res.status(200).json({
      success: true,
      exporterId,
      status,
      totalTrades: filteredTrades.length,
      trades: filteredTrades.map((trade) => ({
        transactionId: trade.transactionId,
        exporterId: trade.exporterId,
        importerId: trade.importerId,
        product: trade.product,
        quantity: trade.quantity.toString(),
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
