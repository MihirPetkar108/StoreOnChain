import React, { useEffect, useState } from "react";
import { api } from "../api/apiClient";
import type { MarketplaceListing } from "../types";
import {
  AlertCircle,
  FileText,
  Loader2,
  Search,
  ShoppingCart,
  Upload,
  X,
} from "lucide-react";

export const MarketplaceView: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MarketplaceListing | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [importerId, setImporterId] = useState("");
  const [document, setDocument] = useState<File | null>(null);
  const [buying, setBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .getListings()
      .then((response) => {
        if (response.success && response.listings)
          setListings(response.listings);
        else setError(response.message || "Could not load listings.");
        setLoading(false);
      })
      .catch((reason: Error) => {
        setError(reason.message);
        setLoading(false);
      });
  }, []);

  const filteredListings = listings.filter((listing) =>
    `${listing.product} ${listing.description}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const openPurchase = (listing: MarketplaceListing) => {
    setSelected(listing);
    setQuantity(1);
    setMessage(null);
  };

  const totalPrice = selected ? quantity * selected.unitPrice : 0;

  const handleBuy = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      setMessage("Please select a listing first.");
      return;
    }
    if (!importerId.trim()) {
      setMessage("Buyer / Importer ID is required.");
      return;
    }
    if (!document) {
      setMessage("Please attach the purchase document.");
      return;
    }
    if (
      selected.availableQuantity !== null &&
      quantity > selected.availableQuantity
    ) {
      setMessage(`Only ${selected.availableQuantity} units are available.`);
      return;
    }
    setBuying(true);
    setMessage(null);
    try {
      const response = await api.recordTrade({
        transactionId: crypto.randomUUID(),
        listingId: selected.id,
        exporterId: selected.exporterId,
        importerId: importerId.trim(),
        quantity,
        totalAmount: totalPrice,
        currency: selected.currency,
        tradeStatus: "CREATED",
        inspectionStatus: "PENDING",
        disputeStatus: "NONE",
        settlementStatus: "PENDING",
        expectedDelivery: new Date(Date.now() + 14 * 86400000)
          .toISOString()
          .slice(0, 10),
        actualDelivery: "",
        trustScoreAfterTrade: 0,
        invoiceFile: document,
      });
      if (!response.success)
        throw new Error(response.message || "Purchase failed.");
      setMessage(
        `Purchase recorded. Transaction ID: ${response.data?.transactionId}`,
      );
      setSelected(null);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
            On-chain commerce
          </p>
          <h1 className="text-3xl font-extrabold text-white mt-2">
            Marketplace
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Choose a listing, set your quantity, and attach the purchase
            document.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 flex gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {message && (
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
          {message}
        </div>
      )}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin text-cyan-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredListings.map((listing) => (
            <article
              key={listing.id}
              className="glass-card border border-slate-800 rounded-2xl p-5 flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {listing.product}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Seller: {listing.exporterId || "Unlisted"}
                  </p>
                </div>
                <ShoppingCart className="text-cyan-400 shrink-0" />
              </div>
              <p className="text-sm text-slate-400 min-h-10">
                {listing.description || "Verified marketplace listing"}
              </p>
              <div className="flex items-end justify-between mt-auto">
                <div>
                  <span className="text-xs text-slate-500 block">
                    Unit price
                  </span>
                  <strong className="text-xl text-white">
                    {listing.currency} {listing.unitPrice.toLocaleString()}
                  </strong>
                </div>
                <button
                  onClick={() => openPurchase(listing)}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm hover:bg-cyan-400"
                >
                  Buy
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleBuy}
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 space-y-5"
          >
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Buy {selected.product}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selected.currency} {selected.unitPrice.toLocaleString()} per
                  unit
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>
                <X className="text-slate-400" />
              </button>
            </div>
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
                max={selected.availableQuantity ?? undefined}
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
                {selected.currency} {totalPrice.toLocaleString()}
              </strong>
            </div>
            <label className="block text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Purchase document
              </span>
              <input
                required
                type="file"
                onChange={(event) =>
                  setDocument(event.target.files?.[0] || null)
                }
                className="mt-2 w-full text-sm text-slate-400"
              />
              {document && (
                <span className="flex items-center gap-2 text-xs text-emerald-400 mt-2">
                  <FileText className="w-3 h-3" />
                  {document.name}
                </span>
              )}
            </label>
            <button
              disabled={buying}
              className="w-full py-3 rounded-lg bg-cyan-500 text-slate-950 font-bold disabled:opacity-50"
            >
              {buying ? "Recording on blockchain..." : "Confirm purchase"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
