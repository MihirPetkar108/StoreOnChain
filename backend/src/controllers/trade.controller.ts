import type { Request, Response } from "express";
import {
  getTrade,
  getExporterTradeIds,
  getExporterReputation,
} from "../services/tradeLedger.service.js";

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
