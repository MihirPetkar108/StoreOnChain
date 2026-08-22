import { Router } from "express";

import {
  getTradeController,
  getExporterTradeIdsController,
  getExporterReputationController,
  getTradesByStatusController,
  recordTradeController,
  getExporterTradeIdsByStatusController,
} from "../controllers/trade.controller.js";
import { uploadSingle } from "../utilities/storage.js";

const router = Router();

// ============================================================
// RECORD TRADE
// POST /api/trades
// ============================================================

router.post("/trades", uploadSingle("invoice"), recordTradeController);

// ============================================================
// GET TRADES BY STATUS
// GET /api/trades?status=<status>
// ============================================================

router.get("/trades", getTradesByStatusController);

// ============================================================
// GET ONE TRADE
// GET /api/trades/:transactionId
// ============================================================

router.get("/trades/:transactionId", getTradeController);

// ============================================================
// GET EXPORTER TRADES
// GET /api/exporters/:exporterId/trades
// GET /api/exporters/:exporterId/trades?status=<status>
// ============================================================

router.get("/exporters/:exporterId/trades", (req, res) => {
  if (typeof req.query.status === "string" && req.query.status.trim()) {
    return getExporterTradeIdsByStatusController(req, res);
  }

  return getExporterTradeIdsController(req, res);
});

// ============================================================
// GET EXPORTER REPUTATION
// GET /api/exporters/:exporterId/reputation
// ============================================================

router.get(
  "/exporters/:exporterId/reputation",
  getExporterReputationController,
);

export default router;
