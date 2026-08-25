import { supabase } from "../config/supabase.config.js";
import type {
  CreateTradeData,
  UpdateTradeData,
} from "../types/tradeDB.types.js";

export async function createTrade(data: CreateTradeData) {
  const { data: trade, error } = await supabase
    .from("trades")
    .insert({
      id: data.id,
      listing_id: data.listing_id ?? null,
      exporter_id: data.exporter_id ?? null,
      importer_id: data.importer_id ?? null,
      status: data.status ?? null,
      total_amount: data.total_amount ?? null,
      currency: data.currency ?? null,
      quantity: data.quantity ?? null,
      agreed_price: data.agreed_price ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create trade: ${error.message}`);
  }

  return trade;
}

export async function getTradeById(tradeId: string) {
  const { data: trade, error } = await supabase
    .from("trades")
    .select("*")
    .eq("id", tradeId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch trade: ${error.message}`);
  }

  return trade;
}

export async function updateTrade(tradeId: string, updates: UpdateTradeData) {
  const { data: trade, error } = await supabase
    .from("trades")
    .update({
      ...updates,
      updated_at: updates.updated_at ?? new Date().toISOString(),
    })
    .eq("id", tradeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update trade: ${error.message}`);
  }

  return trade;
}

export async function getTradesForExporter(exporterId: string) {
  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .eq("exporter_id", exporterId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch exporter trades: ${error.message}`);
  }

  return trades;
}

export async function getTradesForImporter(importerId: string) {
  const { data: trades, error } = await supabase
    .from("trades")
    .select("*")
    .eq("importer_id", importerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch importer trades: ${error.message}`);
  }

  return trades;
}

export async function updateTradeStatus(tradeId: string, status: string) {
  return updateTrade(tradeId, {
    status,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteTrade(tradeId: string): Promise<void> {
  const { error } = await supabase.from("trades").delete().eq("id", tradeId);

  if (error) {
    throw new Error(`Failed to delete trade: ${error.message}`);
  }
}
