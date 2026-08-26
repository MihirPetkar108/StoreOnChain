export interface Trade {
  recordId: string;
  transactionId: string;
  listingId?: string;
  exporterId: string;
  importerId: string;
  product: string;
  quantity: string;
  totalAmount: string;
  currency: string;
  transactionHash: string;
  tradeStatus: string;
  inspectionStatus: string;
  disputeStatus: string;
  settlementStatus: string;
  expectedDelivery: string;
  actualDelivery: string;
  invoiceHash: string;
  trustScoreAfterTrade: string;
  timestamp: string;
}

export interface ExporterReputation {
  successfulTrades: string;
  disputedTrades: string;
  cancelledTrades: string;
  inspectedTrades: string;
  onTimeDeliveryRate: string;
  qualityPassRate: string;
  disputeRate: string;
  currentTrustScore: string;
  totalTrades: string;
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

export interface VerifyInvoiceResponse {
  success: boolean;
  verified?: boolean;
  message?: string;
}

export interface RecordTradePayload {
  transactionId: string;
  listingId: string;
  exporterId: string;
  importerId: string;
  quantity: number;
  totalAmount: number;
  currency: string;
  tradeStatus: string;
  inspectionStatus: string;
  disputeStatus: string;
  settlementStatus: string;
  expectedDelivery: string;
  actualDelivery: string;
  trustScoreAfterTrade?: number;
  invoiceFile?: File;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

export interface TradesByStatusResponse {
  success: boolean;
  status?: string;
  totalTrades?: number;
  trades?: Trade[];
  message?: string;
}

export interface ExporterTradesResponse {
  success: boolean;
  exporterId?: string;
  tradeIds?: string[];
  trades?: Trade[];
  totalTrades?: number;
  message?: string;
}

export interface ExporterReputationResponse {
  success: boolean;
  exporterId?: string;
  reputation?: ExporterReputation;
  message?: string;
}
