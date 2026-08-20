import "dotenv/config";
import { ethers } from "ethers";

const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
const contractAddress = process.env.TRADE_LEDGER_CONTRACT_ADDRESS;

if (!rpcUrl) {
  throw new Error("BLOCKCHAIN_RPC_URL is not defined in .env");
}

if (!contractAddress) {
  throw new Error("TRADE_LEDGER_CONTRACT_ADDRESS is not defined in .env");
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

  // ----------------------------------------------------------
  // RECORD TRADE
  // ----------------------------------------------------------

  "function recordTrade((string transactionId,string exporterId,string importerId,string product,uint256 quantity,string tradeStatus,string inspectionStatus,string disputeStatus,string settlementStatus,uint256 expectedDelivery,uint256 actualDelivery,string invoiceHash) input,uint256 trustScoreAfterTrade)",

  // ----------------------------------------------------------
  // GET TRADES BY STATUS
  // ----------------------------------------------------------

  "function getTradesByStatus(string status) view returns (tuple(string transactionId, string exporterId, string importerId, string product, uint256 quantity, string tradeStatus, string inspectionStatus, string disputeStatus, string settlementStatus, uint256 expectedDelivery, uint256 actualDelivery, string invoiceHash, uint256 trustScoreAfterTrade, uint256 timestamp)[])",

  // ----------------------------------------------------------
  // GET ALL TRADE IDS
  // ----------------------------------------------------------

  "function getAllTradeIds() view returns (string[])",
];

export const provider = new ethers.JsonRpcProvider(rpcUrl);

export const tradeLedgerAddress = contractAddress;

export const privateKey = getPrivateKey;
