import type { Request, Response } from "express";

import {
  createEscrow,
  getEscrow,
  getEscrowByTradeId,
  markAwaitingPayment,
  fundEscrow,
  markInShipment,
  markDelivered,
  startInspection,
  openDispute,
  releaseEscrow,
  refundEscrow,
  cancelEscrow,
} from "../services/escrow.service.js";

import type { PaymentMethod } from "../types/escrow.types.js";
import {
  raiseDisputeCryptoPayment,
  releaseCryptoPayment,
  refundCryptoPayment,
} from "../services/cryptoPayment.service.js";

// ============================================================
// CREATE ESCROW
// POST /api/escrows
// ============================================================
//
// IMPORTANT:
// The amount comes from the locked trade value.
// The controller does NOT allow the frontend to redefine the
// final trade price.
//
// We still accept amount here because the service verifies that
// it exactly matches trades.total_amount.
// ============================================================

export async function createEscrowController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { tradeId, amount, currency, paymentMethod } = req.body as {
      tradeId?: string;
      amount?: string;
      currency?: string;
      paymentMethod?: PaymentMethod;
    };

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });

      return;
    }

    if (!amount) {
      res.status(400).json({
        success: false,
        message: "Amount is required",
      });

      return;
    }

    if (!currency) {
      res.status(400).json({
        success: false,
        message: "Currency is required",
      });

      return;
    }

    if (
      paymentMethod !== undefined &&
      paymentMethod !== "RAZORPAY" &&
      paymentMethod !== "CRYPTO"
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });

      return;
    }

    const escrow = await createEscrow(tradeId, amount, currency, paymentMethod);

    res.status(201).json({
      success: true,
      message: "Escrow created successfully",
      escrow: {
        id: escrow.id,
        tradeId: escrow.tradeId,
        amount: escrow.amount,
        currency: escrow.currency,
        paymentMethod: escrow.paymentMethod,
        status: escrow.status,
        createdAt: escrow.createdAt,
        updatedAt: escrow.updatedAt,
        fundedAt: escrow.fundedAt,
        releasedAt: escrow.releasedAt,
        refundedAt: escrow.refundedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (
      message === "Trade not found" ||
      message === "Escrow amount must match the locked trade amount" ||
      message === "Escrow currency must match the trade currency" ||
      message === "An escrow already exists for this trade"
    ) {
      res.status(400).json({
        success: false,
        message,
      });

      return;
    }

    console.error("Error creating escrow:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create escrow",
    });
  }
}

// ============================================================
// GET ESCROW
// GET /api/escrows/:escrowId
// ============================================================

export async function getEscrowController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    if (!escrowId) {
      res.status(400).json({
        success: false,
        message: "Escrow ID is required",
      });

      return;
    }

    const escrow = await getEscrow(escrowId);

    res.status(200).json({
      success: true,
      escrow,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "Escrow does not exist") {
      res.status(404).json({
        success: false,
        message: "Escrow not found",
      });

      return;
    }

    console.error("Error fetching escrow:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch escrow",
    });
  }
}

// ============================================================
// GET ESCROW BY TRADE
// GET /api/escrows/trade/:tradeId
// ============================================================

export async function getEscrowByTradeController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const tradeId = String(req.params.tradeId);

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });

      return;
    }

    const escrow = await getEscrowByTradeId(tradeId);

    res.status(200).json({
      success: true,
      escrow,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "Escrow does not exist for this trade") {
      res.status(404).json({
        success: false,
        message: "Escrow not found for this trade",
      });

      return;
    }

    console.error("Error fetching escrow by trade:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch escrow",
    });
  }
}

// ============================================================
// MOVE TO AWAITING PAYMENT
// PATCH /api/escrows/:escrowId/awaiting-payment
// ============================================================

export async function markAwaitingPaymentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const escrow = await markAwaitingPayment(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow is awaiting payment",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "awaiting payment");
  }
}

// ============================================================
// FUND ESCROW
// PATCH /api/escrows/:escrowId/fund
// ============================================================

export async function fundEscrowController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const escrow = await fundEscrow(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow funded successfully",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "fund escrow");
  }
}

// ============================================================
// MOVE TO IN SHIPMENT
// PATCH /api/escrows/:escrowId/in-shipment
// ============================================================

export async function markInShipmentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const escrow = await markInShipment(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow moved to shipment",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "in shipment");
  }
}

// ============================================================
// MARK DELIVERED
// PATCH /api/escrows/:escrowId/delivered
// ============================================================

export async function markDeliveredController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const escrow = await markDelivered(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow marked as delivered",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "delivered");
  }
}

// ============================================================
// START INSPECTION
// PATCH /api/escrows/:escrowId/inspection
// ============================================================

export async function startInspectionController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const escrow = await startInspection(escrowId);

    res.status(200).json({
      success: true,
      message: "Inspection started",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "inspection");
  }
}

// ============================================================
// OPEN DISPUTE
// PATCH /api/escrows/:escrowId/dispute
// ============================================================

export async function openDisputeController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const currentEscrow = await getEscrow(escrowId);
    if (currentEscrow.paymentMethod === "CRYPTO") {
      await raiseDisputeCryptoPayment({ tradeId: currentEscrow.tradeId });
    }

    const escrow = await openDispute(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow dispute opened",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "dispute");
  }
}

// ============================================================
// RELEASE ESCROW
// PATCH /api/escrows/:escrowId/release
// ============================================================

export async function releaseEscrowController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const currentEscrow = await getEscrow(escrowId);
    if (currentEscrow.paymentMethod === "CRYPTO") {
      await releaseCryptoPayment({ tradeId: currentEscrow.tradeId });
    }

    const escrow = await releaseEscrow(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow released successfully",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "release escrow");
  }
}

// ============================================================
// REFUND ESCROW
// PATCH /api/escrows/:escrowId/refund
// ============================================================

export async function refundEscrowController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const currentEscrow = await getEscrow(escrowId);
    if (currentEscrow.paymentMethod === "CRYPTO") {
      await refundCryptoPayment({ tradeId: currentEscrow.tradeId });
    }

    const escrow = await refundEscrow(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow refunded successfully",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "refund escrow");
  }
}

// ============================================================
// CANCEL ESCROW
// PATCH /api/escrows/:escrowId/cancel
// ============================================================

export async function cancelEscrowController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const escrowId = String(req.params.escrowId);

    const escrow = await cancelEscrow(escrowId);

    res.status(200).json({
      success: true,
      message: "Escrow cancelled successfully",
      escrow,
    });
  } catch (error) {
    handleEscrowTransitionError(error, res, "cancel escrow");
  }
}

// ============================================================
// COMMON TRANSITION ERROR HANDLER
// ============================================================

function handleEscrowTransitionError(
  error: unknown,
  res: Response,
  action: string,
): void {
  const message = error instanceof Error ? error.message : "Unknown error";

  // Invalid state transition
  if (message.startsWith("Invalid escrow transition:")) {
    res.status(409).json({
      success: false,
      message,
    });

    return;
  }

  // Escrow not found
  if (message === "Escrow does not exist") {
    res.status(404).json({
      success: false,
      message: "Escrow not found",
    });

    return;
  }

  console.error(`Error attempting to ${action}:`, error);

  res.status(500).json({
    success: false,
    message: `Failed to ${action}`,
  });
}
