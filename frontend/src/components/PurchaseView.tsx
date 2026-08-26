import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  Upload,
  Wallet,
} from "lucide-react";
import { api } from "../api/apiClient";
import { createPaymentOrder, verifyPayment } from "../api/paymentApi";
import {
  prepareCryptoPayment,
  confirmCryptoPayment,
  getTokenBalance,
} from "../api/cryptoPaymentApi";
import type { MarketplaceListing } from "../types";
import { ethers } from "ethers";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
  on: (
    event: string,
    handler: (response: RazorpayFailureResponse) => void,
  ) => void;
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureResponse {
  error?: { description?: string };
}

interface PurchaseViewProps {
  listingId: string;
}

const razorpayScriptUrl = "https://checkout.razorpay.com/v1/checkout.js";

// CryptoEscrow and ERC-20 interfaces used by the wallet. ETH uses
// depositNative; USDC uses approve followed by deposit.
const CRYPTO_ESCROW_ABI = [
  "function deposit(string tradeId, uint256 amount) external",
  "function depositNative(string tradeId) external payable",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

export const PurchaseView: React.FC<PurchaseViewProps> = ({ listingId }) => {
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [importerId, setImporterId] = useState("");
  const [purchaseDocument, setPurchaseDocument] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<
    "payment" | "blockchain" | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Crypto payment state
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "CRYPTO">("RAZORPAY");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [cryptoAsset, setCryptoAsset] = useState<"ETH" | "USDC">("USDC");
  const [walletBalance, setWalletBalance] = useState("0");


  useEffect(() => {
    api
      .getListings()
      .then((response) => {
        const found = response.listings?.find((item) => item.id === listingId);
        if (found) setListing(found);
        else setError(response.message || "Listing not found.");
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [listingId]);

  const totalPrice = listing ? Math.round(quantity * listing.unitPrice * 100) / 100 : 0;

  const goBack = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask not installed. Please install MetaMask to use crypto payments.");
        return;
      }

      const ethereum = window.ethereum;
      if (!ethereum) {
        throw new Error("MetaMask provider is unavailable.");
      }
      const provider = new ethers.BrowserProvider(ethereum);
      const network = await provider.getNetwork();
      const expectedChainId = BigInt(
        import.meta.env.VITE_BLOCKCHAIN_CHAIN_ID || "11155111",
      );
      if (network.chainId !== expectedChainId) {
        throw new Error(
          `Wrong network. Please switch MetaMask to chain ${expectedChainId}.`,
        );
      }
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      setWalletAddress(address);
      setWalletConnected(true);
      
      await refreshWalletBalance(address, cryptoAsset);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };


  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setWalletBalance("0");
  };

  const refreshWalletBalance = async (
    address: string,
    asset: "ETH" | "USDC",
  ) => {
    const ethereum = window.ethereum;
    if (!ethereum) return;
    const provider = new ethers.BrowserProvider(ethereum);
    if (asset === "ETH") {
      setWalletBalance(ethers.formatEther(await provider.getBalance(address)));
    } else {
      setWalletBalance(await getTokenBalance(address));
    }
  };

  useEffect(() => {
    if (walletConnected && walletAddress) {
      refreshWalletBalance(walletAddress, cryptoAsset).catch(() =>
        setWalletBalance("0"),
      );
    }
  }, [cryptoAsset, walletAddress, walletConnected]);

  const loadRazorpay = async (): Promise<void> => {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const script = window.document.createElement("script");
      script.src = razorpayScriptUrl;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Could not load Razorpay checkout."));
      document.body.appendChild(script);
    });
  };

  const handlePurchase = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!listing) {
      setError("Listing not found.");
      return;
    }
    if (!importerId.trim()) {
      setError("Buyer / Importer ID is required.");
      return;
    }
    if (!purchaseDocument) {
      setError("Please attach the purchase document.");
      return;
    }
    if (
      listing.availableQuantity !== null &&
      quantity > listing.availableQuantity
    ) {
      setError(`Only ${listing.availableQuantity} units are available.`);
      return;
    }

    setProcessing(true);
    setProcessingStage("payment");
    try {
      if (paymentMethod === "RAZORPAY") {
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          throw new Error("VITE_RAZORPAY_KEY_ID is not configured.");
        }
        await loadRazorpay();
        const orderResponse = await createPaymentOrder({
          amount: Math.round(totalPrice * 100),
          currency: listing.currency,
          receipt: `lst-${Date.now()}`,
          notes: { listingId: listing.id, importerId: importerId.trim() },
        });
        if (!orderResponse.order || !window.Razorpay) {
          throw new Error("Razorpay order could not be created.");
        }

        await new Promise<void>((resolve, reject) => {
          const checkout = new window.Razorpay!({
            key: razorpayKey,
            amount: orderResponse.order!.amount,
            currency: orderResponse.order!.currency,
            name: "StoreOnChain",
            description: listing!.product,
            order_id: orderResponse.order!.id,
            handler: async (payment) => {
              try {
                const verification = await verifyPayment({
                  razorpayOrderId: payment.razorpay_order_id,
                  razorpayPaymentId: payment.razorpay_payment_id,
                  razorpaySignature: payment.razorpay_signature,
                });
                if (!verification.verified) throw new Error(verification.message);

                setProcessingStage("blockchain");
                const trade = await api.recordTrade({
                  transactionId: crypto.randomUUID(),
                  listingId: listing!.id,
                  exporterId: listing!.exporterId,
                  importerId: importerId.trim(),
                  quantity,
                  totalAmount: totalPrice,
                  currency: listing!.currency,
                  tradeStatus: "CREATED",
                  inspectionStatus: "PENDING",
                  disputeStatus: "NONE",
                settlementStatus: "PENDING",
                expectedDelivery: new Date(Date.now() + 14 * 86400000)
                  .toISOString()
                  .slice(0, 10),
                actualDelivery: "",
                trustScoreAfterTrade: 0,
                invoiceFile: purchaseDocument!,
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
              });
              if (!trade.success)
                throw new Error(trade.message || "Trade recording failed.");
              setMessage(
                `Payment complete. Trade recorded: ${trade.data?.transactionId}`,
              );
              resolve();
            } catch (reason) {
              reject(reason);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
        });
        checkout.on("payment.failed", (failure) => {
          reject(
            new Error(
              failure.error?.description ||
                "Payment failed. No blockchain transaction was created.",
            ),
          );
        });
        checkout.open();
      });
      } else {
        // Crypto payment flow
        if (!walletConnected) {
          throw new Error("Please connect your wallet first.");
        }

        const requiredCrypto = cryptoAsset === "ETH"
          ? totalPrice / Number(import.meta.env.VITE_CRYPTO_ETH_USD_RATE || "3000")
          : totalPrice;
        if (Number(walletBalance) < requiredCrypto) {
          throw new Error(`Insufficient ${cryptoAsset} balance.`);
        }

        // Create the trade and its pending crypto payment first. The backend
        // returns the canonical DB record ID used as the on-chain escrow ID.
        const trade = await api.recordTrade({
          transactionId: crypto.randomUUID(),
          listingId: listing.id,
          exporterId: listing.exporterId,
          importerId: importerId.trim(),
          quantity,
          totalAmount: totalPrice,
          currency: listing.currency,
          tradeStatus: "CREATED",
          inspectionStatus: "PENDING",
          disputeStatus: "NONE",
          settlementStatus: "PENDING",
          expectedDelivery: new Date(Date.now() + 14 * 86400000)
            .toISOString()
            .slice(0, 10),
          actualDelivery: "",
          trustScoreAfterTrade: 0,
          invoiceFile: purchaseDocument,
          paymentMethod: "CRYPTO",
          cryptoAsset,
        });
        if (!trade.success || !trade.data?.recordId) {
          throw new Error(trade.message || "Failed to create crypto trade.");
        }

        const prepareResponse = await prepareCryptoPayment({
          tradeId: trade.data.recordId,
          payerAddress: walletAddress,
          asset: cryptoAsset,
        });

        if (!prepareResponse.success || !prepareResponse.data) {
          throw new Error("Failed to prepare crypto payment.");
        }

        // Get wallet provider and signer
        const ethereum = window.ethereum;
        if (!ethereum) {
          throw new Error("MetaMask provider is unavailable.");
        }
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();

        const amountInUnits = BigInt(prepareResponse.data.amountInUnits);
        const escrowContract = new ethers.Contract(
          prepareResponse.data.escrowContract,
          CRYPTO_ESCROW_ABI,
          signer,
        );
        let depositTx;
        if (cryptoAsset === "ETH") {
          depositTx = await escrowContract.depositNative(
            prepareResponse.data.tradeId,
            { value: amountInUnits },
          );
        } else {
          const tokenContract = new ethers.Contract(
            prepareResponse.data.tokenAddress,
            ERC20_ABI,
            signer,
          );
          const approveTx = await tokenContract.approve(
            prepareResponse.data.escrowContract,
            amountInUnits,
          );
          await approveTx.wait();
          depositTx = await escrowContract.deposit(
            prepareResponse.data.tradeId,
            amountInUnits,
          );
        }
        const receipt = await depositTx.wait();

        if (!receipt || receipt.status !== 1) {
          throw new Error("Deposit transaction failed.");
        }

        // Confirm payment with backend
        const confirmResponse = await confirmCryptoPayment({
          tradeId: prepareResponse.data.tradeId,
          txHash: receipt.hash,
          walletAddress: walletAddress,
        });

        if (!confirmResponse.success) {
          throw new Error("Failed to confirm crypto payment.");
        }

        setProcessingStage("blockchain");
        setMessage(
          `Crypto payment confirmed. Trade recorded: ${trade.data.transactionId}`,
        );
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Purchase failed.");
    } finally {
      setProcessing(false);
      setProcessingStage(null);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Loader2 className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>
      <div className="glass-card border border-slate-800 rounded-2xl p-6 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
            Secure purchase
          </p>
          <h1 className="text-2xl font-bold text-white mt-2">
            {listing?.product || "Listing unavailable"}
          </h1>
          {listing && (
            <p className="text-sm text-slate-400 mt-1">
              {listing.currency} {listing.unitPrice.toLocaleString()} per unit
            </p>
          )}
        </div>
        {error && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {message && (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
            {message}
          </div>
        )}
        {listing && (
          <form onSubmit={handlePurchase} className="space-y-5">
            <label className="block text-sm text-slate-300">
              Buyer / Importer ID
              <input
                required
                value={importerId}
                onChange={(event) => setImporterId(event.target.value)}
                className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Quantity
              <input
                required
                min="1"
                max={listing.availableQuantity ?? undefined}
                type="number"
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Number(event.target.value)))
                }
                className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
              />
            </label>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
              <span className="text-slate-400">Total price</span>
              <strong className="text-xl text-cyan-300">
                {listing.currency} {totalPrice.toLocaleString()}
              </strong>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm text-slate-300">Payment Method</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="RAZORPAY"
                    checked={paymentMethod === "RAZORPAY"}
                    onChange={() => setPaymentMethod("RAZORPAY")}
                    className="w-4 h-4 text-cyan-500"
                  />
                  <span className="text-slate-300">Razorpay</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CRYPTO"
                    checked={paymentMethod === "CRYPTO"}
                    onChange={() => setPaymentMethod("CRYPTO")}
                    className="w-4 h-4 text-cyan-500"
                  />
                  <span className="text-slate-300">Crypto Wallet</span>
                </label>
              </div>
            </div>

            {paymentMethod === "CRYPTO" && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 mb-2">Pay with</p>
                  <div className="flex gap-4">
                    {(["ETH", "USDC"] as const).map((asset) => (
                      <label key={asset} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="radio" name="cryptoAsset" checked={cryptoAsset === asset} onChange={() => setCryptoAsset(asset)} />
                        {asset}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div className="flex justify-between"><span>Network</span><span className="text-cyan-300">Ethereum Sepolia</span></div>
                  <div className="flex justify-between"><span>Required</span><span className="text-cyan-300 font-mono">{cryptoAsset === "ETH" ? `${(totalPrice / Number(import.meta.env.VITE_CRYPTO_ETH_USD_RATE || "3000")).toFixed(6)} ETH` : `${totalPrice.toLocaleString()} USDC`}</span></div>
                </div>
                {!walletConnected ? (
                  <button type="button" onClick={connectWallet} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2">
                    <Wallet className="w-4 h-4" /> Connect Wallet
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">Wallet</span><span className="text-xs text-emerald-400 font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-xs text-slate-400">{cryptoAsset} balance</span><span className="text-xs text-cyan-300 font-mono">{Number(walletBalance).toLocaleString()} {cryptoAsset}</span></div>
                    <button type="button" onClick={disconnectWallet} className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">Disconnect</button>
                  </div>
                )}
              </div>
            )}

            <label className="block text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" /> Purchase document
              </span>
              <input
                required
                type="file"
                onChange={(event) =>
                  setPurchaseDocument(event.target.files?.[0] || null)
                }
                className="mt-2 w-full text-sm text-slate-400"
              />
              {purchaseDocument && (
                <span className="flex items-center gap-2 text-xs text-emerald-400 mt-2">
                  <FileText className="w-3 h-3" />
                  {purchaseDocument.name}
                </span>
              )}
            </label>
            <button
              disabled={processing}
              className="w-full py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold disabled:opacity-50"
            >
              {processingStage === "blockchain"
                ? "Recording on blockchain..."
                : processingStage === "payment"
                  ? paymentMethod === "CRYPTO"
                    ? "Processing crypto payment..."
                    : "Processing payment..."
                  : paymentMethod === "CRYPTO"
                    ? "Pay with Crypto Wallet"
                    : "Pay with Razorpay"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
