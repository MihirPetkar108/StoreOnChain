import type { Request, Response } from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../services/payment.service.js";

export const createOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    if (amount === undefined || amount === null) {
      res.status(400).json({
        success: false,
        message: "Amount is required",
      });
      return;
    }

    const order = await createRazorpayOrder({
      amount: Number(amount),
      currency: currency || "INR",
      receipt,
      notes,
    });

    res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      order,
    });
  } catch (error) {
    console.error("Create Razorpay order error:", error);

    const providerError = error as {
      error?: { description?: string };
      response?: { data?: { error?: { description?: string } } };
    };
    const providerMessage =
      providerError.error?.description ??
      providerError.response?.data?.error?.description;
    res.status(500).json({
      success: false,
      message:
        providerMessage ||
        (error instanceof Error
          ? error.message
          : "Failed to create Razorpay order"),
    });
  }
};

export const verifyPayment = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      res.status(400).json({
        success: false,
        message:
          "razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
      });
      return;
    }

    const isValid = verifyRazorpayPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      res.status(400).json({
        success: false,
        verified: false,
        message: "Invalid Razorpay payment signature",
      });
      return;
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: "Razorpay payment verified successfully",
    });
  } catch (error) {
    console.error("Verify Razorpay payment error:", error);

    res.status(500).json({
      success: false,
      verified: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to verify Razorpay payment",
    });
  }
};
