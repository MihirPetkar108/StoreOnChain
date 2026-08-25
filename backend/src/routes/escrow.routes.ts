import { Router } from "express";

import {
  createEscrowController,
  getEscrowController,
  markAwaitingPaymentController,
  fundEscrowController,
  markInShipmentController,
  markDeliveredController,
  startInspectionController,
  releaseEscrowController,
  refundEscrowController,
  cancelEscrowController,
  getEscrowByTradeController,
  openDisputeController,
} from "../controllers/escrow.controller.js";

const router = Router();

// ============================================================
// CREATE ESCROW
// POST /api/escrows
// ============================================================

router.post("/", createEscrowController);

// ============================================================
// GET ESCROW BY TRADE
// GET /api/escrows/trade/:tradeId
// ============================================================

router.get("/trade/:tradeId", getEscrowByTradeController);

// ============================================================
// GET ESCROW BY ID
// GET /api/escrows/:escrowId
// ============================================================

router.get("/:escrowId", getEscrowController);

// ============================================================
// ESCROW STATE TRANSITIONS
// ============================================================

// CREATED → AWAITING_PAYMENT
router.patch("/:escrowId/awaiting-payment", markAwaitingPaymentController);

// AWAITING_PAYMENT → FUNDED
router.patch("/:escrowId/fund", fundEscrowController);

// FUNDED → IN_SHIPMENT
router.patch("/:escrowId/in-shipment", markInShipmentController);

// IN_SHIPMENT → DELIVERED
router.patch("/:escrowId/delivered", markDeliveredController);

// DELIVERED → INSPECTION
router.patch("/:escrowId/inspection", startInspectionController);

// INSPECTION → DISPUTED
router.patch("/:escrowId/dispute", openDisputeController);

// INSPECTION → RELEASED
router.patch("/:escrowId/release", releaseEscrowController);

// DISPUTED → REFUNDED
router.patch("/:escrowId/refund", refundEscrowController);

// CREATED / AWAITING_PAYMENT → CANCELLED
router.patch("/:escrowId/cancel", cancelEscrowController);

export default router;
