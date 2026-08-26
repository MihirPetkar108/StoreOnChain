import React, { useState, useEffect } from "react";
import { api } from "../api/apiClient";
import type { Trade } from "../types";
import {
  ShieldCheck,
  Search,
  ListFilter,
  Loader2,
  AlertCircle,
  Eye,
  Copy,
  Check,
  RotateCw,
} from "lucide-react";

function formatBlockchainAmount(amount: string): string {
  const value = BigInt(amount);
  const whole = value / 100n;
  const cents = (value % 100n).toString().padStart(2, "0");
  return `${whole}.${cents}`;
}

export const TradeLedgerView: React.FC = () => {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const handleCopyValue = (value: string, cellKey: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedCell(cellKey);
    setTimeout(() => {
      setCopiedCell(null);
    }, 2000);
  };

  // Search single trade by ID
  const [searchTxId, setSearchTxId] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [selectedTrades, setSelectedTrades] = useState<Trade[]>([]);

  const statuses = [
    "ALL",
    "CREATED",
    "INSPECTED",
    "DISPUTED",
    "COMPLETED",
    "CANCELLED",
  ];

  const fetchTradesByStatus = async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getTradesByStatus(status);
      if (res.success && res.trades) {
        setTrades(res.trades);
      } else {
        setTrades([]);
        setError(res.message || "No trades found for this status.");
      }
    } catch (err: any) {
      setTrades([]);
      setError(err.message || "Failed to fetch trades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTradesByStatus(selectedStatus);
  }, [selectedStatus]);

  const handleSearchSingleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTxId.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSelectedTrade(null);
    setSelectedTrades([]);

    try {
      const res = await api.getTradeById(searchTxId.trim());
      if (res.success && res.trade) {
        setSelectedTrade(res.trade);
        setSelectedTrades(res.trades || [res.trade]);
      } else {
        setSearchError(res.message || `Trade '${searchTxId}' not found.`);
      }
    } catch (err: any) {
      setSearchError(err.message || `Trade '${searchTxId}' not found.`);
    } finally {
      setSearchLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "PASSED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "DISPUTED":
      case "FAILED":
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "INSPECTED":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Search Header */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
              <span>Blockchain Trade Ledger</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Endpoints:{" "}
              <code className="text-indigo-300">
                GET /api/trades?status=&lt;status&gt;
              </code>{" "}
              &{" "}
              <code className="text-indigo-300">
                GET /api/trades/:transactionId
              </code>
            </p>
          </div>

          {/* Search Bar for single trade */}
          <form
            onSubmit={handleSearchSingleTrade}
            className="flex items-center space-x-2"
          >
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Lookup Transaction ID..."
                value={searchTxId}
                onChange={(e) => setSearchTxId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 w-60"
              />
            </div>
            <button
              type="submit"
              disabled={searchLoading}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition disabled:opacity-50"
            >
              {searchLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Lookup"
              )}
            </button>
          </form>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex overflow-x-auto space-x-1.5 pt-2 border-t border-slate-800/80 no-scrollbar">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
                selectedStatus === st
                  ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30"
                  : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Single Trade Lookup Result */}
      {searchError && (
        <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {selectedTrade && (
        <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              <span>Lookup Result: {selectedTrade.transactionId}</span>
            </h3>
            <button
              onClick={() => setSelectedTrade(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Record ID</span>
              <span className="font-semibold text-slate-200 break-all">
                {selectedTrade.recordId}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Transaction ID</span>
              <span className="font-semibold text-indigo-300 break-all">
                {selectedTrade.transactionId}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Product</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.product}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Exporter ID</span>
              <span className="font-semibold text-indigo-300">
                {selectedTrade.exporterId}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Importer ID</span>
              <span className="font-semibold text-cyan-300">
                {selectedTrade.importerId}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Quantity</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.quantity}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Total Amount</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.currency}{" "}
                {formatBlockchainAmount(selectedTrade.totalAmount)}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Listing ID</span>
              <span className="font-semibold text-slate-200 break-all">
                {selectedTrade.listingId || "Unavailable"}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Trade Status</span>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(selectedTrade.tradeStatus)}`}
              >
                {selectedTrade.tradeStatus}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Inspection Status</span>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(selectedTrade.inspectionStatus)}`}
              >
                {selectedTrade.inspectionStatus}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Dispute Status</span>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(selectedTrade.disputeStatus)}`}
              >
                {selectedTrade.disputeStatus}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Settlement Status</span>
              <span
                className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(selectedTrade.settlementStatus)}`}
              >
                {selectedTrade.settlementStatus}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Expected Delivery</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.expectedDelivery}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Actual Delivery</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.actualDelivery}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Trust Score</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.trustScoreAfterTrade}
              </span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block">Timestamp</span>
              <span className="font-semibold text-slate-200">
                {selectedTrade.timestamp}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">
              Lifecycle Records ({selectedTrades.length})
            </h4>
            {selectedTrades.map((trade) => (
              <div
                key={trade.recordId}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs"
              >
                <span className="font-semibold text-indigo-300">
                  {trade.tradeStatus}
                </span>
                <span className="text-slate-400">Record: {trade.recordId}</span>
                <span className="text-slate-400">
                  Inspection: {trade.inspectionStatus}
                </span>
                <span className="text-slate-400">
                  Dispute: {trade.disputeStatus} / Settlement:{" "}
                  {trade.settlementStatus}
                </span>
                <span className="text-slate-400">
                  Delivery: {trade.expectedDelivery} / {trade.actualDelivery}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-indigo-300 flex items-center justify-between gap-2">
            <div className="truncate">
              <span className="text-slate-500 font-sans">Invoice Hash: </span>
              <span title={selectedTrade.invoiceHash}>
                {selectedTrade.invoiceHash}
              </span>
            </div>
            {selectedTrade.invoiceHash && (
              <button
                type="button"
                onClick={() =>
                  handleCopyValue(
                    selectedTrade.invoiceHash,
                    `${selectedTrade.recordId}:invoiceHash`,
                  )
                }
                title="Copy invoice hash"
                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-900 rounded-lg transition shrink-0 flex items-center space-x-1"
              >
                {copiedCell === `${selectedTrade.recordId}:invoiceHash` ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-sans">
                      Copied
                    </span>
                  </>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Trade List Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-300">
            <ListFilter className="w-4 h-4 text-indigo-400" />
            <span>
              Trades matching status:{" "}
              <span className="text-indigo-400">{selectedStatus}</span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-400">
              {trades.length} items
            </span>
            <button
              type="button"
              onClick={() => fetchTradesByStatus(selectedStatus)}
              disabled={loading}
              title="Refresh ledger"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition disabled:opacity-50"
            >
              <RotateCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <p className="text-xs">Querying blockchain trade ledger...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-slate-400 text-sm">{error}</div>
        ) : trades.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No trades found matching status "
            <span className="text-slate-200 font-semibold">
              {selectedStatus}
            </span>
            ". Try recording a new trade or changing the filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Exporter</th>
                  <th className="py-3 px-4">Importer</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Inspection</th>
                  <th className="py-3 px-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
                {trades.map((t) => (
                  <tr
                    key={t.recordId}
                    className="hover:bg-slate-900/40 transition"
                  >
                    <td className="py-3.5 px-4 font-mono text-indigo-300 font-semibold">
                      <div className="flex items-start gap-2">
                        <span className="break-all">{t.transactionId}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyValue(
                              t.transactionId,
                              `${t.recordId}:transactionId`,
                            )
                          }
                          title="Copy transaction ID"
                          className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition shrink-0"
                        >
                          {copiedCell === `${t.recordId}:transactionId` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      <div className="flex items-start gap-2">
                        <span className="break-all">{t.exporterId}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyValue(
                              t.exporterId,
                              `${t.recordId}:exporterId`,
                            )
                          }
                          title="Copy exporter ID"
                          className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition shrink-0"
                        >
                          {copiedCell === `${t.recordId}:exporterId` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-200">
                      <div className="flex items-start gap-2">
                        <span className="break-all">{t.importerId}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyValue(
                              t.importerId,
                              `${t.recordId}:importerId`,
                            )
                          }
                          title="Copy importer ID"
                          className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition shrink-0"
                        >
                          {copiedCell === `${t.recordId}:importerId` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      {t.product}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{t.quantity}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(t.tradeStatus)}`}
                      >
                        {t.tradeStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(t.inspectionStatus)}`}
                      >
                        {t.inspectionStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {t.currency} {formatBlockchainAmount(t.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
