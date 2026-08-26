import { supabase } from "../config/supabase.config.js";
import type {
  CreateTradeData,
  TradeStatus,
  UpdateTradeData,
} from "../types/tradeDB.types.js";
import { DB_TRADE_STATUSES } from "../types/tradeDB.types.js";

function normalizeTradeStatus(status: string): TradeStatus {
  const normalized = status.trim().toUpperCase() as TradeStatus;
  if (!DB_TRADE_STATUSES.includes(normalized)) {
    throw new Error(
      `Invalid trade status: ${status}. Allowed values: ${DB_TRADE_STATUSES.join(", ")}`,
    );
  }
  return normalized;
}

export interface MarketplaceListing {
  id: string;
  product: string;
  unitPrice: number;
  currency: string;
  availableQuantity: number | null;
  exporterId: string;
  description: string;
}

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  const { data, error } = await supabase.from("listings").select("*");

  if (error) {
    throw new Error(`Failed to fetch marketplace listings: ${error.message}`);
  }

  return (data ?? [])
    .filter(
      (row: Record<string, unknown>) =>
        row.status == null || String(row.status).toUpperCase() === "ACTIVE",
    )
    .map((row: Record<string, unknown>) => ({
      id: String(row.id),
      product: String(row.product_name ?? row.product ?? "Unnamed product"),
      unitPrice: Number(row.unit_price ?? row.price ?? 0),
      currency: String(row.currency ?? "USD"),
      availableQuantity:
        row.quantity_available == null &&
        row.available_quantity == null &&
        row.quantity == null
          ? null
          : Number(
              row.quantity_available ?? row.available_quantity ?? row.quantity,
            ),
      exporterId: String(
        row.exporter_id ?? row.organization_id ?? row.seller_id ?? "",
      ),
      description: String(row.description ?? ""),
    }));
}

export async function createTrade(data: CreateTradeData) {
  const status = data.status ? normalizeTradeStatus(data.status) : null;
  const { data: trade, error } = await supabase
    .from("trades")
    .insert({
      id: data.id,
      listing_id: data.listing_id ?? null,
      exporter_id: data.exporter_id ?? null,
      importer_id: data.importer_id ?? null,
      status,
      total_amount: data.total_amount ?? null,
      currency: data.currency ?? null,
      quantity: data.quantity ?? null,
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
    status: normalizeTradeStatus(status),
    updated_at: new Date().toISOString(),
  });
}

export async function deleteTrade(tradeId: string): Promise<void> {
  const { error } = await supabase.from("trades").delete().eq("id", tradeId);

  if (error) {
    throw new Error(`Failed to delete trade: ${error.message}`);
  }
}

export async function getProductFromListing(
  listingId: string,
): Promise<string | null> {
  const { data: listingData, error: listingError } = await supabase
    .from("listings")
    .select("product_name")
    .eq("id", listingId)
    .single();

  if (listingError || !listingData) {
    throw new Error(
      `Listing lookup failed: ${listingError?.message ?? "No listing found"}`,
    );
  }

  return listingData.product_name;
}
