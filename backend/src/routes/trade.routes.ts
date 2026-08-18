import { Router } from "express";

import {
  getTradeController,
  getExporterTradeIdsController,
  getExporterReputationController,
} from "../controllers/trade.controller.js";

const router = Router();

// ============================================================
// GET ONE TRADE
// GET /api/trades/:transactionId
// ============================================================

router.get("/trades/:transactionId", getTradeController);

// ============================================================
// GET EXPORTER TRADE HISTORY
// GET /api/exporters/:exporterId/trades
// ============================================================

router.get("/exporters/:exporterId/trades", getExporterTradeIdsController);

// ============================================================
// GET EXPORTER REPUTATION
// GET /api/exporters/:exporterId/reputation
// ============================================================

router.get(
  "/exporters/:exporterId/reputation",
  getExporterReputationController,
);

export default router;
