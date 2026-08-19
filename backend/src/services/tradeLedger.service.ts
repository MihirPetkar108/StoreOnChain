import "dotenv/config";
import { ethers } from "ethers";

import {
  privateKey,
  provider,
  TRADE_LEDGER_ABI,
  tradeLedgerAddress,
} from "../config/blockchain.config.js";
import type {
  ExporterReputation,
  Trade,
  RecordTradeRequest,
} from "../types/trade.types.js";

// ============================================================
// CONTRACT INSTANCE
// ============================================================

const tradeLedgerContract = new ethers.Contract(
  tradeLedgerAddress,
  TRADE_LEDGER_ABI,
  provider,
);

// ============================================================
// WRITE CONTRACT
// ============================================================

const signer = new ethers.Wallet(privateKey, provider);

const tradeLedgerWriteContract = new ethers.Contract(
  tradeLedgerAddress,
  TRADE_LEDGER_ABI,
  signer,
);

// ============================================================
// DATE → UNIX TIMESTAMP
// ============================================================

function dateToUnixTimestamp(date: string): bigint {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD`);
  }

  const timestamp = Math.floor(
    new Date(`${date}T00:00:00.000Z`).getTime() / 1000,
  );

  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid date: ${date}`);
  }

  return BigInt(timestamp);
}

// ============================================================
// RECORD TRADE
// ============================================================

export async function recordTrade(input: RecordTradeRequest): Promise<{
  transactionHash: string;
  blockNumber: number;
}> {
  // ----------------------------------------------------------
  // VALIDATE REQUIRED STRING FIELDS
  // ----------------------------------------------------------

  const requiredStrings: Array<[string, string]> = [
    ["transactionId", input.transactionId],
    ["exporterId", input.exporterId],
    ["importerId", input.importerId],
    ["product", input.product],
    ["tradeStatus", input.tradeStatus],
    ["inspectionStatus", input.inspectionStatus],
    ["disputeStatus", input.disputeStatus],
    ["settlementStatus", input.settlementStatus],
    ["invoiceHash", input.invoiceHash],
  ];

  for (const [field, value] of requiredStrings) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`${field} is required`);
    }
  }

  // ----------------------------------------------------------
  // VALIDATE QUANTITY
  // ----------------------------------------------------------

  if (!Number.isFinite(Number(input.quantity)) || Number(input.quantity) < 0) {
    throw new Error("quantity must be a non-negative number");
  }

  // ----------------------------------------------------------
  // VALIDATE TRUST SCORE
  // ----------------------------------------------------------

  if (
    !Number.isFinite(Number(input.trustScoreAfterTrade)) ||
    Number(input.trustScoreAfterTrade) < 0
  ) {
    throw new Error("trustScoreAfterTrade must be a non-negative number");
  }

  // ----------------------------------------------------------
  // CONVERT DATES TO UNIX TIMESTAMPS
  // ----------------------------------------------------------

  const expectedDelivery = dateToUnixTimestamp(input.expectedDelivery);

  const actualDelivery = dateToUnixTimestamp(input.actualDelivery);

  // ----------------------------------------------------------
  // CALL SMART CONTRACT
  // ----------------------------------------------------------

  const tx = await tradeLedgerWriteContract.getFunction("recordTrade")(
    [
      input.transactionId,
      input.exporterId,
      input.importerId,
      input.product,
      BigInt(input.quantity),
      input.tradeStatus,
      input.inspectionStatus,
      input.disputeStatus,
      input.settlementStatus,
      expectedDelivery,
      actualDelivery,
      input.invoiceHash,
    ],
    BigInt(input.trustScoreAfterTrade),
  );

  // ----------------------------------------------------------
  // WAIT FOR BLOCKCHAIN CONFIRMATION
  // ----------------------------------------------------------

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction was not mined");
  }

  // ----------------------------------------------------------
  // RETURN BLOCKCHAIN TRANSACTION DETAILS
  // ----------------------------------------------------------

  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
  };
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
