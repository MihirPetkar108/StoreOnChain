import { supabase } from "../config/supabase.config.js";
import type { PaymentMethod, PaymentStatus } from "../types/escrow.types.js";

export type EscrowSettlementKind = "RELEASED" | "REFUNDED";

export interface CreatePaymentData {
  escrow_id: string;
  trade_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  crypto_asset?: "ETH" | "USDC" | null;
  crypto_network?: string | null;
  crypto_amount?: string | null;
}

export interface CryptoPaymentDetails {
  wallet_address?: string | null;
  crypto_asset?: "ETH" | "USDC" | null;
  crypto_network?: string | null;
  crypto_amount?: string | null;
  chain_id?: string | null;
  token_address?: string | null;
  escrow_contract_address?: string | null;
  deposit_tx_hash?: string | null;
  release_tx_hash?: string | null;
  refund_tx_hash?: string | null;
}

const inboundPaymentStatuses: PaymentStatus[] = [
  "CREATED",
  "PENDING",
  "SUCCESS",
];

const SETTLEMENT_ORDER_PREFIX: Record<EscrowSettlementKind, string> = {
  RELEASED: "escrow-settlement:released:",
  REFUNDED: "escrow-settlement:refunded:",
};

const settlementPaymentStatus: Record<EscrowSettlementKind, PaymentStatus> = {
  RELEASED: "SUCCESS",
  REFUNDED: "REFUNDED",
};

export function settlementOrderId(
  kind: EscrowSettlementKind,
  escrowId: string,
): string {
  return `${SETTLEMENT_ORDER_PREFIX[kind]}${escrowId}`;
}

function isSettlementOrderId(orderId: string | null | undefined): boolean {
  return Boolean(orderId?.startsWith("escrow-settlement:"));
}

export async function createPayment(data: CreatePaymentData) {
  // Round the amount to 2 decimal places for currency precision
  const roundedAmount = Math.round(data.amount * 100) / 100;

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      ...data,
      amount: roundedAmount,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create payment: ${error.message}`);
  return payment;
}

export async function deletePayment(paymentId: string): Promise<void> {
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId);
  if (error) throw new Error(`Failed to delete payment: ${error.message}`);
}

export async function getInboundPaymentByEscrowId(escrowId: string) {
  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .eq("escrow_id", escrowId)
    .in("status", inboundPaymentStatuses)
    .not("provider_payment_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to find payment: ${error.message}`);

  return (
    payments?.find(
      (payment) => !isSettlementOrderId(payment.provider_order_id),
    ) ?? null
  );
}

export async function getSettlementPaymentByEscrowId(
  escrowId: string,
  kind: EscrowSettlementKind,
) {
  const { data: payment, error } = await supabase
    .from("payments")
    .select("*")
    .eq("escrow_id", escrowId)
    .eq("provider_order_id", settlementOrderId(kind, escrowId))
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to find settlement payment: ${error.message}`);
  }

  return payment;
}

export async function recordEscrowSettlementPayment(input: {
  escrowId: string;
  tradeId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  kind: EscrowSettlementKind;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
}) {
  const existing = await getSettlementPaymentByEscrowId(
    input.escrowId,
    input.kind,
  );
  if (existing) {
    return existing;
  }

  return createPayment({
    escrow_id: input.escrowId,
    trade_id: input.tradeId,
    amount: input.amount,
    currency: input.currency,
    method: input.method,
    status: settlementPaymentStatus[input.kind],
    provider_order_id: settlementOrderId(input.kind, input.escrowId),
    provider_payment_id: input.providerPaymentId ?? null,
  });
}

export async function getPaymentByTradeIdAndMethod(
  tradeId: string,
  method: PaymentMethod,
) {
  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .eq("trade_id", tradeId)
    .eq("method", method)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to find payment: ${error.message}`);

  return (
    payments?.find(
      (payment) => !isSettlementOrderId(payment.provider_order_id),
    ) ?? null
  );
}

// ============================================================
// CRYPTO PAYMENT CONFIRMATION / SETTLEMENT UPDATES
// ============================================================

export async function markCryptoPaymentConfirmed(
  paymentId: string,
  details: CryptoPaymentDetails,
) {
  const { data, error } = await supabase
    .from("payments")
    .update({
      status: "SUCCESS",
      provider_order_id: details.deposit_tx_hash ?? null,
      provider_payment_id: details.deposit_tx_hash ?? null,
      wallet_address: details.wallet_address ?? null,
      chain_id: details.chain_id ?? null,
      token_address: details.token_address ?? null,
      escrow_contract_address: details.escrow_contract_address ?? null,
      deposit_tx_hash: details.deposit_tx_hash ?? null,
      crypto_asset: details.crypto_asset ?? null,
      crypto_network: details.crypto_network ?? null,
      crypto_amount: details.crypto_amount ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update crypto payment: ${error.message}`);
  }
  return data;
}

export async function storeCryptoSettlementHash(
  paymentId: string,
  kind: "release" | "refund",
  txHash: string | null,
): Promise<void> {
  const column = kind === "release" ? "release_tx_hash" : "refund_tx_hash";
  const { error } = await supabase
    .from("payments")
    .update({ [column]: txHash, updated_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) {
    throw new Error(`Failed to store crypto ${kind} hash: ${error.message}`);
  }
}

export async function getLatestPaymentForTrades(tradeIds: string[]) {
  if (tradeIds.length === 0) return null;

  const { data: payments, error } = await supabase
    .from("payments")
    .select("*")
    .in("trade_id", tradeIds)
    .in("status", inboundPaymentStatuses)
    .not("provider_payment_id", "is", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to find payment: ${error.message}`);

  return (
    payments?.find(
      (payment) => !isSettlementOrderId(payment.provider_order_id),
    ) ?? null
  );
}

export async function markPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
) {
  const { data, error } = await supabase
    .from("payments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update payment: ${error.message}`);
  return data;
}

export async function markInboundPaymentStatusByEscrowId(
  escrowId: string,
  status: PaymentStatus,
) {
  const payment = await getInboundPaymentByEscrowId(escrowId);
  if (!payment) {
    return null;
  }

  if (isSettlementOrderId(payment.provider_order_id)) {
    return null;
  }

  return markPaymentStatus(payment.id, status);
}
