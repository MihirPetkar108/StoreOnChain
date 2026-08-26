export type TradeStatus = "CREATED" | "CANCELLED";

export const DB_TRADE_STATUSES: TradeStatus[] = ["CREATED", "CANCELLED"];

export function isDbPersistedTradeStatus(status: string): boolean {
  return DB_TRADE_STATUSES.includes(
    status.trim().toUpperCase() as TradeStatus,
  );
}

export interface CreateTradeData {
  id: string;
  listing_id?: string | null;
  exporter_id?: string | null;
  importer_id?: string | null;
  status?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  quantity?: number | null;
}

export interface UpdateTradeData {
  status?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  quantity?: number | null;
  updated_at?: string;
}
