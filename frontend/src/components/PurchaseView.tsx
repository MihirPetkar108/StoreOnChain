import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { api } from "../api/apiClient";
import { createPaymentOrder, verifyPayment } from "../api/paymentApi";
import type { MarketplaceListing } from "../types";

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
                  ? "Processing payment..."
                  : "Pay with Razorpay"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
