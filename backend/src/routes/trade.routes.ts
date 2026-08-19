import { Router } from "express";

import {
  getTradeController,
  getExporterTradeIdsController,
  getExporterReputationController,
  recordTradeController,
} from "../controllers/trade.controller.js";
import { upload } from "../utilities/storage.js";

const router = Router();

// ============================================================
// RECORD TRADE
// POST /api/trades
// ============================================================

router.post("/trades", upload.single("invoice"), recordTradeController);

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
