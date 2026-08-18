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

export const provider = new ethers.JsonRpcProvider(rpcUrl);

export const tradeLedgerAddress = contractAddress;
