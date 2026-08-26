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
  if (!date) {
    return 0n;
  }

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

function toBlockchainAmount(value: number): bigint {
  const amount = String(value);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(amount)) {
    throw new Error(
      "totalAmount must be a non-negative amount with up to 2 decimals",
    );
  }

  return ethers.parseUnits(amount, 2);
}

export function fromBlockchainAmount(value: bigint): number {
  return Number(ethers.formatUnits(value, 2));
}

// ============================================================
// RECORD TRADE
// ============================================================

export async function recordTrade(input: RecordTradeRequest): Promise<{
  transactionHash: string;
  blockNumber: number;
}> {
  try {
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

    if (
      !Number.isFinite(Number(input.quantity)) ||
      Number(input.quantity) < 0
    ) {
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
      input.recordId,
      [
        input.transactionId,
        input.listingId,
        input.exporterId,
        input.importerId,
        input.product,
        BigInt(input.quantity),
        toBlockchainAmount(input.totalAmount),
        input.currency,
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
  } catch (error: any) {
    //   console.error("Error recording trade:", error);
    //   const message =
    //     error instanceof Error ? error.message : "Trade already exists";

    //   if (message.includes("Trade already exists")) {
    //     throw new Error("Trade already exists");
    //   }

    //   throw new Error("Failed to record trade");
    // }

    console.error("========== BLOCKCHAIN RECORD TRADE ERROR ==========");

    console.error("Error:", error);

    console.error("Message:", error?.message);

    console.error("Reason:", error?.reason);

    console.error("Short Message:", error?.shortMessage);

    console.error("Code:", error?.code);

    console.error("Data:", error?.data);

    console.error("Error Info:", error?.info);

    console.error("====================================================");

    if (
      error instanceof Error &&
      error.message.includes("Trade already exists")
    ) {
      throw new Error("Trade already exists");
    }

    throw new Error(
      error?.shortMessage ||
        error?.reason ||
        error?.message ||
        "Failed to record trade",
    );
  }
}

// ============================================================
// GET ONE TRADE
// ============================================================

function mapTrade(trade: any): Trade {
  return {
    recordId: trade.recordId,
    transactionId: trade.transactionId,
    listingId: trade.listingId,
    exporterId: trade.exporterId,
    importerId: trade.importerId,
    product: trade.product,
    quantity: BigInt(trade.quantity.toString()),
    totalAmount: BigInt(trade.totalAmount.toString()),
    currency: trade.currency,
    transactionHash: "",
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

export async function getTrade(recordId: string): Promise<Trade> {
  const trade = await tradeLedgerContract.getFunction("getTrade")(recordId);
  return mapTrade(trade);
}

export async function getTradesByTransactionId(
  transactionId: string,
): Promise<Trade[]> {
  const trades = await tradeLedgerContract.getFunction(
    "getTradesByTransactionId",
  )(transactionId);
  return trades.map((trade: any) => mapTrade(trade));
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
  const trades = await Promise.all(
    tradeIds.map(async (id: string) => ({
      id,
      trade: await getTrade(id),
    })),
  );

  return trades
    .sort(
      (
        first: { id: string; trade: Trade },
        second: { id: string; trade: Trade },
      ) => (first.trade.timestamp > second.trade.timestamp ? -1 : 1),
    )
    .map(({ id }) => id);
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

  const tradeIds = await getExporterTradeIds(exporterId);
  const trades = await Promise.all(tradeIds.map((id: string) => getTrade(id)));
  const disputedTrades = trades.filter(
    (trade) =>
      trade.tradeStatus.trim().toUpperCase() === "DISPUTED" ||
      trade.disputeStatus.trim().toUpperCase() !== "NONE",
  ).length;
  const inspectedTrades = trades.filter((trade) => {
    const inspectionStatus = trade.inspectionStatus.trim().toUpperCase();
    return (
      trade.tradeStatus.trim().toUpperCase() === "INSPECTED" ||
      inspectionStatus === "PASSED" ||
      inspectionStatus === "FAILED"
    );
  }).length;
  const passedInspections = trades.filter(
    (trade) => trade.inspectionStatus.trim().toUpperCase() === "PASSED",
  ).length;
  const failedInspections = trades.filter(
    (trade) => trade.inspectionStatus.trim().toUpperCase() === "FAILED",
  ).length;
  const evaluatedInspections = passedInspections + failedInspections;
  const qualityPassRate = evaluatedInspections
    ? Math.floor((passedInspections * 10000) / evaluatedInspections)
    : 0;
  const disputeRate = tradeIds.length
    ? Math.floor((disputedTrades * 10000) / tradeIds.length)
    : 0;

  return {
    successfulTrades: BigInt(reputation.successfulTrades.toString()),
    disputedTrades: BigInt(disputedTrades),
    failedTrades: BigInt(reputation.failedTrades.toString()),
    cancelledTrades: BigInt(reputation.cancelledTrades.toString()),
    inspectedTrades: BigInt(inspectedTrades),
    onTimeDeliveryRate: BigInt(reputation.onTimeDeliveryRate.toString()),
    qualityPassRate: BigInt(qualityPassRate),
    disputeRate: BigInt(disputeRate),
    currentTrustScore: BigInt(reputation.currentTrustScore.toString()),
    totalTrades: BigInt(reputation.totalTrades.toString()),
  };
}

export async function getAllTrades(): Promise<Trade[]> {
  try {
    const tradeIds: string[] =
      await tradeLedgerContract.getFunction("getAllTradeIds")();
    const trades = await Promise.all(
      tradeIds.map(async (id: string) => {
        return await getTrade(id);
      }),
    );
    return trades.sort((first, second) =>
      first.timestamp > second.timestamp ? -1 : 1,
    );
  } catch (error) {
    console.error("Error fetching all trades:", error);
    throw new Error("Failed to fetch all trades");
  }
}

export async function getTradesByStatus(status: string): Promise<Trade[]> {
  try {
    if (!status || status.toUpperCase() === "ALL") {
      return await getAllTrades();
    }

    const trades =
      await tradeLedgerContract.getFunction("getTradesByStatus")(status);

    return (
      await Promise.all(trades.map((trade: any) => getTrade(trade.recordId)))
    ).sort((first: Trade, second: Trade) =>
      first.timestamp > second.timestamp ? -1 : 1,
    );
  } catch (error) {
    console.error("Error fetching trades by status:", error);
    const message =
      error instanceof Error ? error.message : "Trade already exists";

    if (message.includes("Trade already exists")) {
      throw new Error("Trade already exists");
    }

    throw new Error("Failed to fetch trades by status");
  }
}

// ============================================================
// GET EXPORTER TRADES BY STATUS
// ============================================================

export async function getTradesForExporterByStatus(
  exporterId: string,
  status: string,
): Promise<Trade[]> {
  try {
    // Get all trade IDs belonging to the exporter
    const tradeIds = await getExporterTradeIds(exporterId);

    // Fetch all trades
    const trades = await Promise.all(
      tradeIds.map(async (id: string) => {
        return await getTrade(id);
      }),
    );

    // If no status or ALL → return all exporter trades
    if (!status || status.toUpperCase() === "ALL") {
      return trades;
    }

    // Normalize status for comparison
    const normalizedStatus = status.trim().toUpperCase();

    // Filter trades by status
    return trades
      .filter(
        (trade) => trade.tradeStatus.trim().toUpperCase() === normalizedStatus,
      )
      .sort((first, second) => (first.timestamp > second.timestamp ? -1 : 1));
  } catch (error) {
    console.error("Error fetching exporter trades by status:", error);
    throw new Error("Failed to fetch exporter trades by status");
  }
}
