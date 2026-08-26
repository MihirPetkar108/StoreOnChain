import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
const contractAddress = process.env.TRADE_LEDGER_CONTRACT_ADDRESS;
const chainId = Number(process.env.BLOCKCHAIN_CHAIN_ID || 11155111);

if (!rpcUrl) {
  throw new Error("BLOCKCHAIN_RPC_URL is not defined in .env");
}

if (!contractAddress) {
  throw new Error("TRADE_LEDGER_CONTRACT_ADDRESS is not defined in .env");
}

if (!Number.isInteger(chainId) || chainId <= 0) {
  throw new Error("BLOCKCHAIN_CHAIN_ID must be a positive integer");
}

const getPrivateKey = process.env.PRIVATE_KEY;
if (!getPrivateKey) {
  throw new Error("PRIVATE_KEY is not configured in .env");
}

// ============================================================
// TRADE LEDGER ABI
// ============================================================
//
// We only include the contract functions that our backend
// currently needs.
//
// Later we can add recordTrade(), events, etc.
// ============================================================

export const TRADE_LEDGER_ABI = [
  "event TradeRecorded(string recordId, string transactionId, string exporterId, string importerId, uint256 trustScoreAfterTrade, uint256 timestamp)",

  // ----------------------------------------------------------
  // GET ONE TRADE
  // ----------------------------------------------------------

  "function getTrade(string recordId) view returns (tuple(string recordId, string transactionId, string listingId, string exporterId, string importerId, string product, uint256 quantity, uint256 totalAmount, string currency, string tradeStatus, string inspectionStatus, string disputeStatus, string settlementStatus, uint256 expectedDelivery, uint256 actualDelivery, string invoiceHash, uint256 trustScoreAfterTrade, uint256 timestamp))",

  "function getTradesByTransactionId(string transactionId) view returns (tuple(string recordId, string transactionId, string listingId, string exporterId, string importerId, string product, uint256 quantity, uint256 totalAmount, string currency, string tradeStatus, string inspectionStatus, string disputeStatus, string settlementStatus, uint256 expectedDelivery, uint256 actualDelivery, string invoiceHash, uint256 trustScoreAfterTrade, uint256 timestamp)[])",

  // ----------------------------------------------------------
  // GET EXPORTER TRADE IDS
  // ----------------------------------------------------------

  "function getExporterTradeIds(string exporterId) view returns (string[])",

  // ----------------------------------------------------------
  // GET EXPORTER REPUTATION
  // ----------------------------------------------------------

  "function getExporterReputation(string exporterId) view returns (uint256 successfulTrades, uint256 disputedTrades, uint256 failedTrades, uint256 cancelledTrades, uint256 onTimeDeliveryRate, uint256 qualityPassRate, uint256 disputeRate, uint256 currentTrustScore, uint256 totalTrades)",

  // ----------------------------------------------------------
  // RECORD TRADE
  // ----------------------------------------------------------

  "function recordTrade(string recordId,(string transactionId,string listingId,string exporterId,string importerId,string product,uint256 quantity,uint256 totalAmount,string currency,string tradeStatus,string inspectionStatus,string disputeStatus,string settlementStatus,uint256 expectedDelivery,uint256 actualDelivery,string invoiceHash) input,uint256 trustScoreAfterTrade)",

  // ----------------------------------------------------------
  // GET TRADES BY STATUS
  // ----------------------------------------------------------

  "function getTradesByStatus(string status) view returns (tuple(string recordId, string transactionId, string listingId, string exporterId, string importerId, string product, uint256 quantity, uint256 totalAmount, string currency, string tradeStatus, string inspectionStatus, string disputeStatus, string settlementStatus, uint256 expectedDelivery, uint256 actualDelivery, string invoiceHash, uint256 trustScoreAfterTrade, uint256 timestamp)[])",

  // ----------------------------------------------------------
  // GET ALL TRADE IDS
  // ----------------------------------------------------------

  "function getAllTradeIds() view returns (string[])",
];

export const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
  staticNetwork: true,
});

export const tradeLedgerAddress = contractAddress;

export const privateKey = getPrivateKey;
