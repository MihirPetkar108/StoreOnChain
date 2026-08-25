import React, { useState } from "react";
import { api } from "../api/apiClient";
import type { Trade } from "../types";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Boxes,
  ShieldCheck,
} from "lucide-react";

export const RecordTradeView: React.FC = () => {
  const [transactionId, setTransactionId] = useState("");
  const [listingId] = useState("00000004-0000-0000-0000-000000000001");
  const [exporterId] = useState("EXP-9001");
  const [importerId] = useState("00000002-0000-0000-0000-000000000023");
  const [quantity] = useState<number>(5000);
  const [totalAmount] = useState<number>(5000000);
  const [currency] = useState("USD");
  const [tradeStatus, setTradeStatus] = useState("COMPLETED");
  const [inspectionStatus, setInspectionStatus] = useState("PENDING");
  const [disputeStatus, setDisputeStatus] = useState("NONE");
  const [settlementStatus, setSettlementStatus] = useState("PENDING");
  const [expectedDelivery, setExpectedDelivery] = useState("2026-09-15");
  const [actualDelivery, setActualDelivery] = useState("2026-09-14");
  const [trustScoreAfterTrade, setTrustScoreAfterTrade] = useState<number>(95);

  const normalizedTradeStatus = tradeStatus.trim().toUpperCase();
  const showInspectionStatus = normalizedTradeStatus === "INSPECTED";
  const showDisputeStatus = normalizedTradeStatus === "DISPUTED";
  const showSettlementDetails =
    normalizedTradeStatus === "CANCELLED" ||
    normalizedTradeStatus === "COMPLETED";

  const handleTradeStatusChange = (status: string) => {
    setTradeStatus(status);
    if (status === "INSPECTED") {
      setDisputeStatus("NONE");
      setSettlementStatus("PENDING");
    } else if (status === "DISPUTED") {
      setInspectionStatus("PENDING");
      setSettlementStatus("PENDING");
    } else {
      setInspectionStatus("PENDING");
      setDisputeStatus("NONE");
      setSettlementStatus("PENDING");
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    trade?: Trade;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      setError("Transaction ID is required.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessResult(null);

    try {
      const res = await api.recordTrade({
        transactionId: transactionId.trim(),
        listingId,
        exporterId,
        importerId,
        quantity,
        totalAmount,
        currency,
        tradeStatus,
        inspectionStatus: showInspectionStatus ? inspectionStatus : "PENDING",
        disputeStatus: showDisputeStatus ? disputeStatus : "NONE",
        settlementStatus: showSettlementDetails ? settlementStatus : "PENDING",
        expectedDelivery: showSettlementDetails ? expectedDelivery : "",
        actualDelivery: showSettlementDetails ? actualDelivery : "",
        trustScoreAfterTrade: showSettlementDetails ? trustScoreAfterTrade : 0,
      });

      if (res.success) {
        setSuccessResult({
          message: res.message || "Trade recorded successfully",
          trade: {
            recordId: res.data?.recordId || "",
            transactionId: res.data?.transactionId || transactionId,
            exporterId,
            importerId,
            product: res.data?.product || "",
            quantity: quantity.toString(),
            totalAmount: totalAmount.toString(),
            currency,
            transactionHash: res.data?.transactionHash || "",
            tradeStatus,
            inspectionStatus,
            disputeStatus,
            settlementStatus,
            expectedDelivery,
            actualDelivery,
            trustScoreAfterTrade: trustScoreAfterTrade.toString(),
            invoiceHash: res.data?.invoiceHash || "",
            timestamp: Math.floor(Date.now() / 1000).toString(),
            ...res.data,
          },
        });
      } else {
        setError(res.message || "Failed to record trade.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-indigo-500/20">
        <div>
          <div className="flex items-center space-x-2">
            <Boxes className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold text-white">
              Record Trade On-Chain
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Add a lifecycle status to an existing blockchain transaction.
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="glass-card rounded-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Trade Details Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Transaction ID
            </label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Use the same ID to add another lifecycle status.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Trade Status
            </label>
            <select
              value={tradeStatus}
              onChange={(e) => handleTradeStatusChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="DISPUTED">DISPUTED</option>
              <option value="INSPECTED">INSPECTED</option>
            </select>
          </div>

          {showInspectionStatus && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Inspection Status
              </label>
              <select
                value={inspectionStatus}
                onChange={(e) => setInspectionStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="PASSED">PASSED</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
          )}

          {showDisputeStatus && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Dispute Status
              </label>
              <select
                value={disputeStatus}
                onChange={(e) => setDisputeStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="NONE">NONE</option>
                <option value="RAISED">RAISED</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
          )}

          {showSettlementDetails && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Settlement Status
              </label>
              <select
                value={settlementStatus}
                onChange={(e) => setSettlementStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="PENDING">PENDING</option>
                <option value="SETTLED">SETTLED</option>
                <option value="REFUNDED">REFUNDED</option>
              </select>
            </div>
          )}

          {showSettlementDetails && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Expected Delivery
              </label>
              <input
                type="date"
                required
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {showSettlementDetails && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Actual Delivery
              </label>
              <input
                type="date"
                required
                value={actualDelivery}
                onChange={(e) => setActualDelivery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {showSettlementDetails && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Trust Score After Trade (0-100)
              </label>
              <input
                type="number"
                required
                min="0"
                max="100"
                value={trustScoreAfterTrade}
                onChange={(e) =>
                  setTrustScoreAfterTrade(Number(e.target.value))
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}
        </div>
        {/* Form Action */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Recording Trade...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Record Trade On Blockchain</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-start space-x-3 text-rose-300">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* Success Modal / Result Card */}
      {successResult && (
        <div className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-4">
          <div className="flex items-center space-x-3 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="text-base font-bold">{successResult.message}</h3>
          </div>

          {successResult.trade && (
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 text-xs font-mono space-y-2 text-slate-300">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Transaction ID:</span>{" "}
                  <span className="text-slate-100 font-semibold">
                    {successResult.trade.transactionId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Exporter ID:</span>{" "}
                  <span className="text-slate-100 font-semibold">
                    {successResult.trade.exporterId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Importer ID:</span>{" "}
                  <span className="text-slate-100 font-semibold">
                    {successResult.trade.importerId}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{" "}
                  <span className="text-emerald-400 font-semibold">
                    {successResult.trade.tradeStatus}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 text-indigo-300 truncate">
                <span className="text-slate-500">Invoice Hash:</span>{" "}
                {successResult.trade.invoiceHash}
              </div>
              {(successResult.trade as any).transactionHash && (
                <div className="text-emerald-400 truncate">
                  <span className="text-slate-500">Blockchain Tx:</span>{" "}
                  {(successResult.trade as any).transactionHash}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
