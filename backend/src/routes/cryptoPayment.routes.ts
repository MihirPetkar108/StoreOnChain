import { Router } from "express";
import {
  prepareCryptoPaymentController,
  confirmCryptoPaymentController,
  releaseCryptoPaymentController,
  refundCryptoPaymentController,
  raiseDisputeCryptoPaymentController,
  getTokenBalanceController,
  getTokenAllowanceController,
  getCryptoPaymentStatusController,
} from "../controllers/cryptoPayment.controller.js";

const router = Router();

router.post("/prepare", prepareCryptoPaymentController);
router.post("/confirm", confirmCryptoPaymentController);
router.post("/release", releaseCryptoPaymentController);
router.post("/refund", refundCryptoPaymentController);
router.post("/dispute", raiseDisputeCryptoPaymentController);

router.get("/balance/:address", getTokenBalanceController);
router.get("/allowance/:owner/:spender", getTokenAllowanceController);
router.get("/payments/:tradeId", getCryptoPaymentStatusController);

export default router;