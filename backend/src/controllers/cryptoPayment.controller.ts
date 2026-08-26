import type { Request, Response } from "express";
import {
  prepareCryptoPayment,
  confirmCryptoPayment,
  releaseCryptoPayment,
  refundCryptoPayment,
  raiseDisputeCryptoPayment,
  getTokenBalance,
  getTokenAllowance,
  getCryptoPaymentByTradeId,
} from "../services/cryptoPayment.service.js";

export const prepareCryptoPaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tradeId, payerAddress, asset } = req.body;

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
      return;
    }

    if (!payerAddress) {
      res.status(400).json({
        success: false,
        message: "Payer wallet address is required",
      });
      return;
    }

    const result = await prepareCryptoPayment({
      tradeId,
      payerAddress,
      asset,
    });

    res.status(200).json({
      success: true,
      message: "Crypto payment prepared successfully",
      data: result,
    });
  } catch (error) {
    console.error("Prepare crypto payment error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to prepare crypto payment",
    });
  }
};

export const confirmCryptoPaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tradeId, txHash, walletAddress } = req.body;

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
      return;
    }

    if (!txHash) {
      res.status(400).json({
        success: false,
        message: "Transaction hash is required",
      });
      return;
    }

    if (!walletAddress) {
      res.status(400).json({
        success: false,
        message: "Wallet address is required",
      });
      return;
    }

    const result = await confirmCryptoPayment({
      tradeId,
      txHash,
      walletAddress,
    });

    res.status(200).json({
      success: true,
      message: "Crypto payment confirmed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Confirm crypto payment error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to confirm crypto payment",
    });
  }
};

export const releaseCryptoPaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tradeId } = req.body;

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
      return;
    }

    const result = await releaseCryptoPayment({ tradeId });

    res.status(200).json({
      success: true,
      message: "Crypto payment released successfully",
      data: result,
    });
  } catch (error) {
    console.error("Release crypto payment error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to release crypto payment",
    });
  }
};

export const refundCryptoPaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tradeId } = req.body;

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
      return;
    }

    const result = await refundCryptoPayment({ tradeId });

    res.status(200).json({
      success: true,
      message: "Crypto payment refunded successfully",
      data: result,
    });
  } catch (error) {
    console.error("Refund crypto payment error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to refund crypto payment",
    });
  }
};

export const raiseDisputeCryptoPaymentController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { tradeId } = req.body;

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
      return;
    }

    const result = await raiseDisputeCryptoPayment({ tradeId });

    res.status(200).json({
      success: true,
      message: "Escrow dispute raised on the blockchain",
      data: result,
    });
  } catch (error) {
    console.error("Raise dispute error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to raise dispute",
    });
  }
};

export const getTokenBalanceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { address } = req.params;

    const addressStr = Array.isArray(address) ? address[0] : address;
    if (!addressStr) {
      res.status(400).json({
        success: false,
        message: "Address is required",
      });
      return;
    }
    const balance = await getTokenBalance(addressStr);

    res.status(200).json({
      success: true,
      balance,
    });
  } catch (error) {
    console.error("Get token balance error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get token balance",
    });
  }
};

export const getTokenAllowanceController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { owner, spender } = req.params;

    const ownerStr = Array.isArray(owner) ? owner[0] : owner;
    const spenderStr = Array.isArray(spender) ? spender[0] : spender;
    if (!ownerStr || !spenderStr) {
      res.status(400).json({
        success: false,
        message: "Owner and spender addresses are required",
      });
      return;
    }
    const allowance = await getTokenAllowance(ownerStr, spenderStr);

    res.status(200).json({
      success: true,
      allowance,
    });
  } catch (error) {
    console.error("Get token allowance error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get token allowance",
    });
  }
};


export const getCryptoPaymentStatusController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const tradeId = String(req.params.tradeId);

    if (!tradeId) {
      res.status(400).json({
        success: false,
        message: "Trade ID is required",
      });
      return;
    }

    const payment = await getCryptoPaymentByTradeId(tradeId);

    if (!payment) {
      res.status(404).json({
        success: false,
        message: "No crypto payment found for this trade",
      });
      return;
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Get crypto payment status error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to get payment status",
    });
  }
};