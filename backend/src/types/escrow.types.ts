// ============================================================
// ESCROW TYPES
// ============================================================

export type EscrowStatus =
  | "CREATED"
  | "AWAITING_PAYMENT"
  | "FUNDED"
  | "IN_SHIPMENT"
  | "DELIVERED"
  | "INSPECTION"
  | "DISPUTED"
  | "RELEASED"
  | "REFUNDED"
  | "CANCELLED";

export type PaymentMethod = "RAZORPAY" | "CRYPTO";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "REFUNDED";

export interface Escrow {
  id: string;

  tradeId: string;

  amount: string;

  currency: string;

  paymentMethod: PaymentMethod | null;

  status: EscrowStatus;

  createdAt: string;
  updatedAt: string;

  fundedAt: string | null;
  releasedAt: string | null;
  refundedAt: string | null;
}

export interface Payment {
  id: string;

  escrowId: string;
  tradeId: string;

  amount: string;
  currency: string;

  method: PaymentMethod;

  status: PaymentStatus;

  providerOrderId: string | null;
  providerPaymentId: string | null;

  createdAt: string;
  updatedAt: string;
}
