import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
import { supabase } from "../config/supabase.config.js";
import {
  getPaymentByTradeIdAndMethod,
  markCryptoPaymentConfirmed,
  storeCryptoSettlementHash,
} from "./paymentDB.service.js";
import { getEscrowByTradeId, fundEscrow } from "./escrow.service.js";

const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "";
const CHAIN_ID = process.env.BLOCKCHAIN_CHAIN_ID || "11155111";
const ESCROW_ADDRESS = process.env.CRYPTO_ESCROW_CONTRACT_ADDRESS || "";
const USDC_ADDRESS = process.env.CRYPTO_USDC_CONTRACT_ADDRESS || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const PAYEE_ADDRESS = process.env.CRYPTO_PAYEE_ADDRESS || "";
const ETH_USD_RATE = Number(process.env.CRYPTO_ETH_USD_RATE || "3000");
const NETWORK = "ETHEREUM_SEPOLIA";

const ESCROW_ABI = [
  "function createEscrow(string,address,address,uint8,address,uint256)",
  "function deposit(string,uint256)",
  "function depositNative(string) payable",
  "function release(string)",
  "function refund(string)",
  "function raiseDispute(string)",
  "function escrowExists(string) view returns (bool)",
  "function getEscrow(string) view returns (tuple(string tradeId,address payer,address payee,uint8 assetType,address token,uint256 amount,uint8 status,uint256 createdAt,uint256 settledAt))",
];
const ERC20_ABI = [
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];
const escrowInterface = new ethers.Interface([
  "event EscrowFunded(string indexed tradeId,uint8 assetType,address token,uint256 amount)",
]);
const depositInterface = new ethers.Interface([
  "function deposit(string tradeId,uint256 amount)",
  "function depositNative(string tradeId)",
]);

export type CryptoAsset = "ETH" | "USDC";
const ASSET_TYPE = { ETH: 0, USDC: 1 } as const;

export interface PrepareCryptoPaymentInput {
  tradeId: string;
  payerAddress: string;
  asset: CryptoAsset;
}
export interface ConfirmCryptoPaymentInput {
  tradeId: string;
  txHash: string;
  walletAddress: string;
}

function provider() {
  if (!RPC_URL) throw new Error("BLOCKCHAIN_RPC_URL is not configured");
  return new ethers.JsonRpcProvider(RPC_URL);
}
function contract() {
  if (!ESCROW_ADDRESS) throw new Error("CRYPTO_ESCROW_CONTRACT_ADDRESS is not configured");
  return new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider()) as any;
}
function signer() {
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is not configured");
  return new ethers.Wallet(PRIVATE_KEY, provider());
}
function assertAddress(value: string, label: string) {
  if (!ethers.isAddress(value)) throw new Error(`Invalid ${label} address`);
}
function configuredUsdc() {
  if (!USDC_ADDRESS) throw new Error("CRYPTO_USDC_CONTRACT_ADDRESS is not configured");
  assertAddress(USDC_ADDRESS, "USDC contract");
  return USDC_ADDRESS;
}
function payee() {
  if (!PAYEE_ADDRESS) return signer().address;
  assertAddress(PAYEE_ADDRESS, "crypto payee");
  return PAYEE_ADDRESS;
}

async function chain() {
  const value = (await provider().getNetwork()).chainId.toString();
  if (value !== CHAIN_ID) throw new Error(`Wrong network: expected chain ${CHAIN_ID}, got ${value}`);
}
async function onChainEscrow(tradeId: string) {
  const c = contract();
  if (!(await c.escrowExists(tradeId))) return null;
  return c.getEscrow(tradeId);
}

function quote(tradeAmount: number, asset: CryptoAsset) {
  if (!Number.isFinite(tradeAmount) || tradeAmount <= 0) throw new Error("Trade amount must be positive");
  if (asset === "ETH") {
    if (!Number.isFinite(ETH_USD_RATE) || ETH_USD_RATE <= 0) throw new Error("CRYPTO_ETH_USD_RATE must be positive");
    return { amount: tradeAmount / ETH_USD_RATE, decimals: 18, token: ethers.ZeroAddress };
  }
  return { amount: tradeAmount, decimals: 6, token: configuredUsdc() };
}

export async function prepareCryptoPayment(input: PrepareCryptoPaymentInput) {
  await chain();
  assertAddress(input.payerAddress, "payer wallet");
  if (input.asset !== "ETH" && input.asset !== "USDC") throw new Error("Unsupported crypto asset");

  const payment = await getPaymentByTradeIdAndMethod(input.tradeId, "CRYPTO");
  if (!payment) throw new Error("Crypto payment was not created for this trade");
  const asset = input.asset;
  const amount = quote(Number(payment.amount), asset);
  const amountInUnits = ethers.parseUnits(amount.amount.toFixed(asset === "ETH" ? 18 : 6), amount.decimals);
  const existing = await onChainEscrow(input.tradeId);
  if (existing) {
    if (Number(existing.assetType) !== ASSET_TYPE[asset] || existing.amount.toString() !== amountInUnits.toString()) {
      throw new Error("An escrow already exists with a different asset or amount");
    }
  } else {
    const tx = await contract().connect(signer()).createEscrow(
      input.tradeId,
      input.payerAddress,
      payee(),
      ASSET_TYPE[asset],
      amount.token,
      amountInUnits,
    );
    await tx.wait();
  }

  await supabase.from("payments").update({
    crypto_asset: asset,
    crypto_network: NETWORK,
    crypto_amount: amountInUnits.toString(),
    token_address: amount.token === ethers.ZeroAddress ? null : amount.token,
    escrow_contract_address: ESCROW_ADDRESS,
    updated_at: new Date().toISOString(),
  }).eq("id", payment.id);

  return {
    tradeId: input.tradeId,
    network: NETWORK,
    chainId: CHAIN_ID,
    asset,
    escrowContract: ESCROW_ADDRESS,
    tokenAddress: amount.token,
    amount: amount.amount.toFixed(asset === "ETH" ? 6 : 2),
    amountInUnits: amountInUnits.toString(),
    decimals: amount.decimals,
    ethUsdRate: asset === "ETH" ? ETH_USD_RATE : undefined,
  };
}

export async function confirmCryptoPayment(input: ConfirmCryptoPaymentInput) {
  await chain();
  assertAddress(input.walletAddress, "wallet");
  const tx = await provider().getTransaction(input.txHash);
  if (!tx) throw new Error("Transaction not found");
  if (!tx.to || tx.to.toLowerCase() !== ESCROW_ADDRESS.toLowerCase()) throw new Error("Transaction was not sent to CryptoEscrow");
  if (!tx.from || tx.from.toLowerCase() !== input.walletAddress.toLowerCase()) throw new Error("Transaction payer does not match wallet");
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Payment transaction failed");

  const payment = await getPaymentByTradeIdAndMethod(input.tradeId, "CRYPTO");
  if (!payment) throw new Error("Crypto payment was not created for this trade");
  const asset = payment.crypto_asset as CryptoAsset;
  if (asset !== "ETH" && asset !== "USDC") throw new Error("Payment asset is not configured");
  const expected = quote(Number(payment.amount), asset);
  const expectedUnits = ethers.parseUnits(expected.amount.toFixed(asset === "ETH" ? 18 : 6), expected.decimals);
  if (payment.crypto_amount && payment.crypto_amount !== expectedUnits.toString()) throw new Error("Payment quote changed; prepare the payment again");
  if (asset === "ETH" && tx.value !== expectedUnits) throw new Error("Incorrect ETH payment value");
  if (asset === "USDC" && tx.value !== 0n) throw new Error("USDC payment must not include ETH");

  // Verify that this exact transaction called the correct deposit function
  // with the expected trade and amount. This is more reliable across RPC
  // providers than depending solely on decoded receipt log object shapes.
  const parsedDeposit = depositInterface.parseTransaction({ data: tx.data });
  if (!parsedDeposit || parsedDeposit.args[0] !== input.tradeId) {
    throw new Error("Transaction does not contain the expected escrow deposit");
  }
  if (asset === "ETH") {
    if (parsedDeposit.name !== "depositNative" || parsedDeposit.args.length !== 1) {
      throw new Error("Transaction is not an ETH escrow deposit");
    }
  } else {
    if (parsedDeposit.name !== "deposit" || parsedDeposit.args[1].toString() !== expectedUnits.toString()) {
      throw new Error("Transaction is not the expected USDC escrow deposit");
    }
  }

  // Also inspect the event when the provider exposes decoded/raw logs.
  // The contract state check below remains authoritative for funding.
  for (const log of receipt.logs) {
    try {
      const parsed = escrowInterface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed?.name === "EscrowFunded" && parsed.args[0] === input.tradeId && parsed.args[3].toString() === expectedUnits.toString()) break;
    } catch {
      // Some RPC providers return log objects without parseable topic metadata.
    }
  }

  const escrow = await onChainEscrow(input.tradeId);
  if (!escrow || Number(escrow.status) !== 1 || escrow.payer.toLowerCase() !== input.walletAddress.toLowerCase()) throw new Error("Escrow is not funded by the expected payer");
  const dbEscrow = await getEscrowByTradeId(input.tradeId);
  if (dbEscrow.status !== "FUNDED") await fundEscrow(dbEscrow.id);
  const updated = await markCryptoPaymentConfirmed(payment.id, {
    wallet_address: input.walletAddress,
    chain_id: CHAIN_ID,
    token_address: asset === "USDC" ? configuredUsdc() : null,
    escrow_contract_address: ESCROW_ADDRESS,
    deposit_tx_hash: input.txHash,
    crypto_asset: asset,
    crypto_network: NETWORK,
    crypto_amount: expectedUnits.toString(),
  });
  return { success: true, payment: updated, txHash: input.txHash };
}

async function settle(tradeId: string, kind: "release" | "refund") {
  await chain();
  const escrow = await onChainEscrow(tradeId);
  if (!escrow) throw new Error("Escrow does not exist on the blockchain");
  const terminal = kind === "release" ? 2 : 3;
  if (Number(escrow.status) === terminal) return { success: true, txHash: "" };
  if (Number(escrow.status) !== 1 && Number(escrow.status) !== 4) throw new Error("Escrow is not settleable");
  const tx = await contract().connect(signer())[kind](tradeId);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${kind} transaction failed`);
  const payment = await getPaymentByTradeIdAndMethod(tradeId, "CRYPTO");
  if (payment) await storeCryptoSettlementHash(payment.id, kind, receipt.hash);
  return { success: true, txHash: receipt.hash };
}
export const releaseCryptoPayment = ({ tradeId }: { tradeId: string }) => settle(tradeId, "release");
export const refundCryptoPayment = ({ tradeId }: { tradeId: string }) => settle(tradeId, "refund");

export async function raiseDisputeCryptoPayment({ tradeId }: { tradeId: string }) {
  await chain();
  const escrow = await onChainEscrow(tradeId);
  if (!escrow || Number(escrow.status) === 4) return { success: true, skipped: true };
  if (Number(escrow.status) !== 1) throw new Error("Escrow is not funded");
  const tx = await contract().connect(signer()).raiseDispute(tradeId);
  const receipt = await tx.wait();
  return { success: true, txHash: receipt.hash };
}

export async function getTokenBalance(address: string) {
  assertAddress(address, "wallet");
  const token = new ethers.Contract(configuredUsdc(), ERC20_ABI, provider()) as any;
  return ethers.formatUnits(await token.balanceOf(address), 6);
}
export async function getTokenAllowance(owner: string, spender: string) {
  assertAddress(owner, "owner"); assertAddress(spender, "spender");
  const token = new ethers.Contract(configuredUsdc(), ERC20_ABI, provider()) as any;
  return ethers.formatUnits(await token.allowance(owner, spender), 6);
}

export async function getCryptoPaymentByTradeId(tradeId: string) {
  const payment = await getPaymentByTradeIdAndMethod(tradeId, "CRYPTO");
  if (!payment) return null;
  return payment;
}