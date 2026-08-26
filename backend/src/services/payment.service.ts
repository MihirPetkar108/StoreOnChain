import Razorpay from "razorpay";
import crypto from "crypto";
import type {
  CreateRazorpayOrderInput,
  VerifyRazorpayPaymentInput,
} from "../types/payment..types.js";

const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeyId || !razorpayKeySecret) {
  throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set");
}

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

export const createRazorpayOrder = async ({
  amount,
  currency = "INR",
  receipt,
  notes,
}: CreateRazorpayOrderInput) => {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      "Amount must be a positive integer in the smallest currency unit",
    );
  }

  return razorpay.orders.create({
    amount,
    currency,
    receipt,
    ...(notes !== undefined ? { notes } : {}),
  });
};

export const verifyRazorpayPayment = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: VerifyRazorpayPaymentInput): boolean => {
  const generatedSignature = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, "utf8"),
    Buffer.from(razorpaySignature, "utf8"),
  );
};

export const getRazorpayPayment = async (paymentId: string) => {
  return razorpay.payments.fetch(paymentId);
};

export const refundRazorpayPayment = async (
  paymentId: string,
  amount?: number,
) => {
  return razorpay.payments.refund(paymentId, amount ? { amount } : {});
};
