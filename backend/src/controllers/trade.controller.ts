import type { Request, Response } from "express";
import {
  getTrade,
  getExporterTradeIds,
  getExporterReputation,
  recordTrade,
  getTradesByTransactionId,
  getTradesByStatus,
  getTradesForExporterByStatus,
  fromBlockchainAmount,
} from "../services/tradeLedger.service.js";
import type { RecordTradeRequest } from "../types/trade.types.js";
import { hashInvoiceData } from "../services/hashing.service.js";
import { deleteInvoice, uploadInvoice } from "../services/storage.service.js";
import { calculateTrustScore } from "../services/trustScore.service.js";
import {
  createTrade,
  deleteTrade,
  getProductFromListing,
} from "../services/tradeDB.service.js";
import { isDbPersistedTradeStatus } from "../types/tradeDB.types.js";
import {
  createEscrow,
  deleteEscrow,
  fundEscrow,
  markAwaitingPayment,
  settleEscrow,
} from "../services/escrow.service.js";
import {
  releaseCryptoPayment,
  refundCryptoPayment,
} from "../services/cryptoPayment.service.js";
import {
  createPayment,
  deletePayment,
  getLatestPaymentForTrades,
} from "../services/paymentDB.service.js";
import { refundRazorpayPayment } from "../services/payment.service.js";
import { randomUUID } from "node:crypto";

// ============================================================
// RECORD TRADE
// POST /api/trades
// ============================================================

export async function recordTradeController(
  req: Request,
  res: Response,
): Promise<void> {
  let databaseTradeCreated = false;
  let escrowId: string | null = null;
  let paymentId: string | null = null;
  let razorpayPaymentId = "";
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
      const normalizedTradeStatus = input.tradeStatus.trim().toUpperCase();
      const normalizedSettlementStatus = input.settlementStatus
        .trim()
        .toUpperCase();
      // Only invalid combination: CANCELLED + SETTLED
      // CANCELLED trades should have REFUNDED or PARTIAL settlement status
      // COMPLETED trades should have SETTLED or REFUNDED settlement status
      if (
        normalizedTradeStatus === "CANCELLED" &&
        normalizedSettlementStatus === "SETTLED"
      ) {
        throw new Error(
          "Settlement status is not valid for the selected trade status",
        );
      }

      input.exporterId = originalTrade.exporterId;
      input.importerId = originalTrade.importerId;
      input.listingId = originalTrade.listingId;
      input.product = originalTrade.product;
      input.quantity = Number(originalTrade.quantity);
      input.totalAmount = fromBlockchainAmount(originalTrade.totalAmount);
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
      const invoiceHash = hashInvoiceData(req.file.buffer);
      await uploadInvoice(req.file.buffer, invoiceHash, req.file.mimetype);
      input.invoiceHash = invoiceHash;
    } else if (originalTrade) {
      input.invoiceHash = originalTrade.invoiceHash;
    }

    if (!originalTrade) {
      const product = await getProductFromListing(input.listingId);
      if (!product) {
        throw new Error("Product is required for the listing");
      }
      input.product = product;
    }

    input.recordId = randomUUID();
    const razorpayOrderId = String(body.razorpayOrderId ?? "").trim();
    razorpayPaymentId = String(body.razorpayPaymentId ?? "").trim();

    // ----------------------------------------------------------
    // AUTO-COMPUTE TRUST SCORE FOR TERMINAL STATUSES
    // ----------------------------------------------------------
    const normalizedStatus = input.tradeStatus.trim().toUpperCase();
    const isTerminalStatus =
      normalizedStatus === "COMPLETED" || normalizedStatus === "CANCELLED";

    if (isTerminalStatus) {
      input.trustScoreAfterTrade = await calculateTrustScore(input.exporterId, {
        tradeStatus: input.tradeStatus,
        inspectionStatus: input.inspectionStatus,
        disputeStatus: input.disputeStatus,
        expectedDelivery: input.expectedDelivery,
        actualDelivery: input.actualDelivery,
      });
    } else {
      // Intermediate statuses (INSPECTED, DISPUTED, CREATED)
      // do not update the trust score.
      input.trustScoreAfterTrade = 0;
    }

    if (isDbPersistedTradeStatus(input.tradeStatus)) {
      await createTrade({
        id: input.recordId,
        listing_id: input.listingId,
        exporter_id: input.exporterId,
        importer_id: input.importerId,
        status: input.tradeStatus,
        total_amount: input.totalAmount,
        currency: input.currency,
        quantity: input.quantity,
      });
      databaseTradeCreated = true;
    }

    if (razorpayOrderId && razorpayPaymentId) {
      const escrow = await createEscrow(
        input.recordId,
        String(input.totalAmount),
        input.currency,
        "RAZORPAY",
      );
      escrowId = escrow.id;
      const payment = await createPayment({
        escrow_id: escrow.id,
        trade_id: input.recordId,
        amount: Number(input.totalAmount),
        currency: input.currency,
        method: "RAZORPAY",
        status: "SUCCESS",
        provider_order_id: razorpayOrderId,
        provider_payment_id: razorpayPaymentId,
      });
      paymentId = payment.id;
      await markAwaitingPayment(escrow.id);
      await fundEscrow(escrow.id);
    }

    // Handle crypto payment method
    const paymentMethod = String(
      input.paymentMethod || body.paymentMethod || body.payment_method || "",
    )
      .trim()
      .toUpperCase();
    const cryptoTxHash = (input.cryptoTxHash ||
      body.cryptoTxHash ||
      body.crypto_tx_hash ||
      "") as string;
    const cryptoAsset = String(
      input.cryptoAsset || body.cryptoAsset || body.crypto_asset || "USDC",
    ).trim().toUpperCase();

    if (paymentMethod === "CRYPTO") {
      if (cryptoAsset !== "ETH" && cryptoAsset !== "USDC") {
        throw new Error("Unsupported crypto asset");
      }
      const escrow = await createEscrow(
        input.recordId,
        String(input.totalAmount),
        input.currency,
        "CRYPTO",
      );
      escrowId = escrow.id;
      const payment = await createPayment({
        escrow_id: escrow.id,
        trade_id: input.recordId,
        amount: Number(input.totalAmount),
        currency: input.currency,
        method: "CRYPTO",
        status: "PENDING",
        provider_order_id: cryptoTxHash || null,
        provider_payment_id: cryptoTxHash || null,
        crypto_asset: cryptoAsset as "ETH" | "USDC",
        crypto_network: "ETHEREUM_SEPOLIA",
      });
      paymentId = payment.id;
      await markAwaitingPayment(escrow.id);
    }

    const result = await recordTrade(input);

    if (originalTrade) {
      const normalizedSettlementStatus = input.settlementStatus
        .trim()
        .toUpperCase();
      const payment = await getLatestPaymentForTrades(
        history.map((trade) => trade.recordId),
      );
      if (payment && normalizedSettlementStatus === "REFUNDED") {
        if (payment.method === "CRYPTO") {
          await refundCryptoPayment({ tradeId: payment.trade_id });
        } else {
          await refundRazorpayPayment(
            payment.provider_payment_id,
            Math.round(Number(payment.amount) * 100),
          );
        }
        await settleEscrow(payment.escrow_id, "REFUNDED");
      } else if (payment && normalizedSettlementStatus === "SETTLED") {
        if (payment.method === "CRYPTO") {
          await releaseCryptoPayment({ tradeId: payment.trade_id });
        }
        await settleEscrow(payment.escrow_id, "RELEASED");
      }
    }

    res.status(201).json({
      success: true,
      message: "Trade recorded successfully",
      data: {
        transactionId: input.transactionId,
        recordId: input.recordId,
        listingId: input.listingId,
        exporterId: input.exporterId,
        importerId: input.importerId,
        product: input.product,
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

    if (razorpayPaymentId) {
      try {
        await refundRazorpayPayment(
          razorpayPaymentId,
          Math.round(Number(input.totalAmount) * 100),
        );
      } catch (refundError) {
        console.error("Error refunding Razorpay payment:", refundError);
      }
    }

    // Delete file uploaded from supabase storage if trade recording fails
    if (req.file) {
      try {
        await deleteInvoice(input.invoiceHash);
        console.log("Invoice file deleted successfully");
      } catch (deleteError) {
        console.error("Error deleting invoice file:", deleteError);
      }
    }

    if (paymentId) {
      try {
        await deletePayment(paymentId);
      } catch (cleanupError) {
        console.error("Error deleting payment during rollback:", cleanupError);
      }
    }
    if (escrowId) {
      try {
        await deleteEscrow(escrowId);
      } catch (cleanupError) {
        console.error("Error deleting escrow during rollback:", cleanupError);
      }
    }
    if (databaseTradeCreated) {
      try {
        await deleteTrade(input.recordId);
      } catch (cleanupError) {
        console.error("Error deleting trade during rollback:", cleanupError);
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

    if (message === "Invoice already exists") {
      res.status(409).json({
        success: false,
        message,
      });

      return;
    }

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
