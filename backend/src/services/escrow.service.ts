import { supabase } from "../config/supabase.config.js";
import {
  getInboundPaymentByEscrowId,
  markInboundPaymentStatusByEscrowId,
  recordEscrowSettlementPayment,
} from "./paymentDB.service.js";
import type {
  Escrow,
  EscrowStatus,
  PaymentMethod,
} from "../types/escrow.types.js";

// ============================================================
// ESCROW STATE MACHINE
// ============================================================

const allowedTransitions: Record<EscrowStatus, EscrowStatus[]> = {
  CREATED: ["AWAITING_PAYMENT", "CANCELLED"],

  AWAITING_PAYMENT: ["FUNDED", "CANCELLED"],

  FUNDED: ["IN_SHIPMENT"],

  IN_SHIPMENT: ["DELIVERED"],

  DELIVERED: ["INSPECTION"],

  INSPECTION: ["RELEASED", "DISPUTED"],

  DISPUTED: ["RELEASED", "REFUNDED"],

  RELEASED: [],

  REFUNDED: [],

  CANCELLED: [],
};

// ============================================================
// DATABASE ROW -> ESCROW
// ============================================================

function mapEscrow(row: Record<string, unknown>): Escrow {
  return {
    id: String(row.id),
    tradeId: String(row.trade_id),
    amount: String(row.amount),
    currency: String(row.currency),
    paymentMethod: row.payment_method as PaymentMethod | null,
    status: row.status as EscrowStatus,

    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),

    fundedAt: row.funded_at ? String(row.funded_at) : null,
    releasedAt: row.released_at ? String(row.released_at) : null,
    refundedAt: row.refunded_at ? String(row.refunded_at) : null,
  };
}

// ============================================================
// VALIDATE ESCROW STATE TRANSITION
// ============================================================

export function validateEscrowTransition(
  currentStatus: EscrowStatus,
  nextStatus: EscrowStatus,
): void {
  const allowed = allowedTransitions[currentStatus];

  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `Invalid escrow transition: ${currentStatus} -> ${nextStatus}`,
    );
  }
}

// ============================================================
// CREATE ESCROW
// ============================================================

export async function createEscrow(
  tradeId: string,
  amount: string,
  currency: string,
  paymentMethod?: PaymentMethod,
): Promise<Escrow> {
  if (!tradeId) {
    throw new Error("Trade ID is required");
  }

  if (!amount || Number(amount) <= 0) {
    throw new Error("Escrow amount must be greater than zero");
  }

  if (!currency || !currency.trim()) {
    throw new Error("Currency is required");
  }

  // ----------------------------------------------------------
  // Fetch the trade
  // ----------------------------------------------------------

  const { data: trade, error: tradeError } = await supabase
    .from("trades")
    .select("id, total_amount, currency")
    .eq("id", tradeId)
    .single();

  if (tradeError || !trade) {
    throw new Error("Trade not found");
  }

  // ----------------------------------------------------------
  // IMPORTANT:
  // Escrow amount MUST match the locked trade amount.
  //
  // The importer cannot change this amount.
  // Use numeric comparison with tolerance for floating point precision
  // ----------------------------------------------------------

  const tradeAmount = Number(trade.total_amount);
  const escrowAmount = Number(amount);
  const tolerance = 0.01; // 1 cent tolerance for currency amounts

  if (Math.abs(tradeAmount - escrowAmount) > tolerance) {
    throw new Error("Escrow amount must match the locked trade amount");
  }

  // Round the amount to 2 decimal places for consistency
  const roundedAmount = Math.round(escrowAmount * 100) / 100;

  if (String(trade.currency) !== String(currency)) {
    throw new Error("Escrow currency must match the trade currency");
  }

  // ----------------------------------------------------------
  // Create escrow
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("escrows")
    .insert({
      trade_id: tradeId,
      amount: roundedAmount,
      currency,
      payment_method: paymentMethod ?? null,
      status: "CREATED",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("An escrow already exists for this trade");
    }

    throw new Error(`Failed to create escrow: ${error.message}`);
  }

  return mapEscrow(data);
}

export async function deleteEscrow(escrowId: string): Promise<void> {
  const { error } = await supabase.from("escrows").delete().eq("id", escrowId);
  if (error) {
    throw new Error(`Failed to delete escrow: ${error.message}`);
  }
}

async function syncPaymentForEscrowSettlement(
  escrow: Escrow,
  status: "RELEASED" | "REFUNDED",
): Promise<void> {
  const inboundPayment = await getInboundPaymentByEscrowId(escrow.id);
  const amount = Number(inboundPayment?.amount ?? escrow.amount);
  const method =
    (inboundPayment?.method as PaymentMethod | undefined) ??
    escrow.paymentMethod ??
    "RAZORPAY";

  await recordEscrowSettlementPayment({
    escrowId: escrow.id,
    tradeId: escrow.tradeId,
    amount,
    currency: escrow.currency,
    method,
    kind: status,
    providerPaymentId: inboundPayment?.provider_payment_id ?? null,
  });
}

export async function settleEscrow(
  escrowId: string,
  status: "RELEASED" | "REFUNDED",
): Promise<Escrow> {
  const existing = await getEscrow(escrowId);

  if (existing.status === status) {
    await syncPaymentForEscrowSettlement(existing, status);
    return existing;
  }

  if (
    existing.status === "RELEASED" ||
    existing.status === "REFUNDED" ||
    existing.status === "CANCELLED"
  ) {
    throw new Error(`Escrow is already settled with status ${existing.status}`);
  }

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  update[status === "RELEASED" ? "released_at" : "refunded_at"] =
    new Date().toISOString();

  const { data, error } = await supabase
    .from("escrows")
    .update(update)
    .eq("id", escrowId)
    .eq("status", existing.status)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to settle escrow: ${error.message}`);
  }

  let settled = data ? mapEscrow(data) : null;

  if (!settled) {
    const refreshed = await getEscrow(escrowId);
    if (refreshed.status === status) {
      settled = refreshed;
    } else {
      throw new Error(
        `Failed to settle escrow: escrow changed to ${refreshed.status}`,
      );
    }
  }

  await syncPaymentForEscrowSettlement(settled, status);

  return settled;
}

// ============================================================
// GET ESCROW BY ID
// ============================================================

export async function getEscrow(escrowId: string): Promise<Escrow> {
  if (!escrowId) {
    throw new Error("Escrow ID is required");
  }

  const { data, error } = await supabase
    .from("escrows")
    .select("*")
    .eq("id", escrowId)
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw new Error("Escrow does not exist");
    }

    throw new Error(
      `Failed to fetch escrow: ${error?.message ?? "Unknown error"}`,
    );
  }

  return mapEscrow(data);
}

// ============================================================
// GET ESCROW BY TRADE ID
// ============================================================

export async function getEscrowByTradeId(tradeId: string): Promise<Escrow> {
  if (!tradeId) {
    throw new Error("Trade ID is required");
  }

  const { data, error } = await supabase
    .from("escrows")
    .select("*")
    .eq("trade_id", tradeId)
    .single();

  if (error || !data) {
    if (error?.code === "PGRST116") {
      throw new Error("Escrow does not exist for this trade");
    }

    throw new Error(
      `Failed to fetch escrow: ${error?.message ?? "Unknown error"}`,
    );
  }

  return mapEscrow(data);
}

// ============================================================
// TRANSITION ESCROW
// ============================================================

export async function transitionEscrow(
  escrowId: string,
  nextStatus: EscrowStatus,
): Promise<Escrow> {
  const escrow = await getEscrow(escrowId);

  // ----------------------------------------------------------
  // Validate state transition
  // ----------------------------------------------------------

  validateEscrowTransition(escrow.status, nextStatus);

  const update: Record<string, unknown> = {
    status: nextStatus,
  };

  // ----------------------------------------------------------
  // Record important timestamps
  // ----------------------------------------------------------

  if (nextStatus === "FUNDED") {
    update.funded_at = new Date().toISOString();
  }

  if (nextStatus === "RELEASED") {
    update.released_at = new Date().toISOString();
  }

  if (nextStatus === "REFUNDED") {
    update.refunded_at = new Date().toISOString();
  }

  // ----------------------------------------------------------
  // Update only if the status hasn't changed meanwhile
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("escrows")
    .update(update)
    .eq("id", escrowId)
    .eq("status", escrow.status)
    .select()
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to transition escrow: ${
        error?.message ?? "Escrow may have changed state"
      }`,
    );
  }

  if (nextStatus === "RELEASED" || nextStatus === "REFUNDED") {
    await syncPaymentForEscrowSettlement(mapEscrow(data), nextStatus);
  }

  if (nextStatus === "FUNDED") {
    await markInboundPaymentStatusByEscrowId(escrowId, "SUCCESS");
  }

  return mapEscrow(data);
}

// ============================================================
// CONVENIENCE TRANSITIONS
// ============================================================

export async function markAwaitingPayment(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "AWAITING_PAYMENT");
}

export async function fundEscrow(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "FUNDED");
}

export async function markInShipment(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "IN_SHIPMENT");
}

export async function markDelivered(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "DELIVERED");
}

export async function startInspection(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "INSPECTION");
}

export async function openDispute(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "DISPUTED");
}

export async function releaseEscrow(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "RELEASED");
}

export async function refundEscrow(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "REFUNDED");
}

export async function cancelEscrow(escrowId: string): Promise<Escrow> {
  return transitionEscrow(escrowId, "CANCELLED");
}
