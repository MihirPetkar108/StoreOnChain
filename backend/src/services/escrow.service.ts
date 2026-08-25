import { supabase } from "../config/supabase.config.js";
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
  // ----------------------------------------------------------

  if (String(trade.total_amount) !== String(amount)) {
    throw new Error("Escrow amount must match the locked trade amount");
  }

  if (String(trade.currency) !== currency) {
    throw new Error("Escrow currency must match the trade currency");
  }

  // ----------------------------------------------------------
  // Create escrow
  // ----------------------------------------------------------

  const { data, error } = await supabase
    .from("escrows")
    .insert({
      trade_id: tradeId,
      amount,
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
