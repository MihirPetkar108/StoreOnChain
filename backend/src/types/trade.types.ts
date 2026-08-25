// ============================================================
// TYPES
// ============================================================

// ============================================================
// TRADE
// ============================================================

export interface Trade {
  transactionId: string;

  exporterId: string;
  importerId: string;

  product: string;
  quantity: bigint;

  tradeStatus: string;
  inspectionStatus: string;
  disputeStatus: string;
  settlementStatus: string;

  expectedDelivery: bigint;
  actualDelivery: bigint;

  invoiceHash: string;

  trustScoreAfterTrade: bigint;

  timestamp: bigint;
}

// ============================================================
// EXPORTER REPUTATION
// ============================================================

export interface ExporterReputation {
  successfulTrades: bigint;

  disputedTrades: bigint;

  failedTrades: bigint;

  cancelledTrades: bigint;

  inspectedTrades: bigint;

  onTimeDeliveryRate: bigint;

  qualityPassRate: bigint;

  disputeRate: bigint;

  currentTrustScore: bigint;

  totalTrades: bigint;
}

// ============================================================
// RECORD TRADE REQUEST
// ============================================================

export interface RecordTradeRequest {
  transactionId: string;

  // Database trade fields
  listingId: string;
  exporterId: string;
  importerId: string;

  totalAmount: number;
  currency: string;
  quantity: number;
  agreedPrice: number;

  // Blockchain trade fields
  product: string;

  tradeStatus: string;
  inspectionStatus: string;
  disputeStatus: string;
  settlementStatus: string;

  expectedDelivery: string;
  actualDelivery: string;

  file: Buffer;
  invoiceHash: string;

  trustScoreAfterTrade: number;
}
