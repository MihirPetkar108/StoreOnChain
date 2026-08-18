import { ethers } from "ethers";

import { provider, tradeLedgerAddress } from "../config/blockchain.config.js";

// ============================================================
// TRADE LEDGER ABI
// ============================================================
//
// We only include the contract functions that our backend
// currently needs.
//
// Later we can add recordTrade(), events, etc.
// ============================================================

const TRADE_LEDGER_ABI = [
  // ----------------------------------------------------------
  // GET ONE TRADE
  // ----------------------------------------------------------

  "function getTrade(string transactionId) view returns (tuple(string transactionId, string exporterId, string importerId, string product, uint256 quantity, string tradeStatus, string inspectionStatus, string disputeStatus, string settlementStatus, uint256 expectedDelivery, uint256 actualDelivery, string invoiceHash, uint256 trustScoreAfterTrade, uint256 timestamp))",

  // ----------------------------------------------------------
  // GET EXPORTER TRADE IDS
  // ----------------------------------------------------------

  "function getExporterTradeIds(string exporterId) view returns (string[])",

  // ----------------------------------------------------------
  // GET EXPORTER REPUTATION
  // ----------------------------------------------------------

  "function getExporterReputation(string exporterId) view returns (uint256 successfulTrades, uint256 disputedTrades, uint256 failedTrades, uint256 cancelledTrades, uint256 onTimeDeliveryRate, uint256 qualityPassRate, uint256 disputeRate, uint256 currentTrustScore, uint256 totalTrades)",
];

// ============================================================
// CONTRACT INSTANCE
// ============================================================

const tradeLedgerContract = new ethers.Contract(
  tradeLedgerAddress,
  TRADE_LEDGER_ABI,
  provider,
);

// ============================================================
// TYPES
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
// GET ONE TRADE
// ============================================================

export async function getTrade(transactionId: string): Promise<Trade> {
  const trade =
    await tradeLedgerContract.getFunction("getTrade")(transactionId);

  return {
    transactionId: trade.transactionId,

    exporterId: trade.exporterId,

    importerId: trade.importerId,

    product: trade.product,

    quantity: BigInt(trade.quantity.toString()),

    tradeStatus: trade.tradeStatus,

    inspectionStatus: trade.inspectionStatus,

    disputeStatus: trade.disputeStatus,

    settlementStatus: trade.settlementStatus,

    expectedDelivery: BigInt(trade.expectedDelivery.toString()),

    actualDelivery: BigInt(trade.actualDelivery.toString()),

    invoiceHash: trade.invoiceHash,

    trustScoreAfterTrade: BigInt(trade.trustScoreAfterTrade.toString()),

    timestamp: BigInt(trade.timestamp.toString()),
  };
}

// ============================================================
// GET EXPORTER TRADE IDS
// ============================================================

export async function getExporterTradeIds(
  exporterId: string,
): Promise<string[]> {
  const tradeIds = await tradeLedgerContract.getFunction("getExporterTradeIds")(
    exporterId,
  );

  return tradeIds.map((id: string) => id);
}

// ============================================================
// GET EXPORTER REPUTATION
// ============================================================

export interface ExporterReputation {
  successfulTrades: bigint;

  disputedTrades: bigint;

  failedTrades: bigint;

  cancelledTrades: bigint;

  onTimeDeliveryRate: bigint;

  qualityPassRate: bigint;

  disputeRate: bigint;

  currentTrustScore: bigint;

  totalTrades: bigint;
}

export async function getExporterReputation(
  exporterId: string,
): Promise<ExporterReputation> {
  const reputation = await tradeLedgerContract.getFunction(
    "getExporterReputation",
  )(exporterId);

  return {
    successfulTrades: BigInt(reputation.successfulTrades.toString()),

    disputedTrades: BigInt(reputation.disputedTrades.toString()),

    failedTrades: BigInt(reputation.failedTrades.toString()),

    cancelledTrades: BigInt(reputation.cancelledTrades.toString()),

    onTimeDeliveryRate: BigInt(reputation.onTimeDeliveryRate.toString()),

    qualityPassRate: BigInt(reputation.qualityPassRate.toString()),

    disputeRate: BigInt(reputation.disputeRate.toString()),

    currentTrustScore: BigInt(reputation.currentTrustScore.toString()),

    totalTrades: BigInt(reputation.totalTrades.toString()),
  };
}
