import React, { useState } from "react";
import { api } from "../api/apiClient";
import type { Trade } from "../types";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Boxes,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export const RecordTradeView: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [transactionId, setTransactionId] = useState(`TX-${Date.now().toString().slice(-6)}`);
  const [exporterId, setExporterId] = useState("EXP-9001");
  const [importerId, setImporterId] = useState("IMP-4002");
  const [product, setProduct] = useState("Industrial Silicon Wafers 300mm");
  const [quantity, setQuantity] = useState<number>(5000);
  const [tradeStatus, setTradeStatus] = useState("CREATED");
  const [inspectionStatus, setInspectionStatus] = useState("PENDING");
  const [disputeStatus, setDisputeStatus] = useState("NONE");
  const [settlementStatus, setSettlementStatus] = useState("PENDING");
  const [expectedDelivery, setExpectedDelivery] = useState("2026-09-15");
  const [actualDelivery, setActualDelivery] = useState("2026-09-14");
  const [trustScoreAfterTrade, setTrustScoreAfterTrade] = useState<number>(95);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    message: string;
    trade?: Trade;
  } | null>(null);

  const handleFillDemoData = () => {
    const randomId = Math.floor(100000 + Math.random() * 900000);
    setTransactionId(`TX-${randomId}`);
    setExporterId(`EXP-${Math.floor(1000 + Math.random() * 9000)}`);
    setImporterId(`IMP-${Math.floor(1000 + Math.random() * 9000)}`);
    setProduct("High-Grade Copper Cathodes (99.99%)");
    setQuantity(250);
    setTradeStatus("IN_TRANSIT");
    setInspectionStatus("PASSED");
    setDisputeStatus("NONE");
    setSettlementStatus("PENDING");
    setExpectedDelivery("2026-10-01");
    setActualDelivery("2026-09-30");
    setTrustScoreAfterTrade(98);

    // Create a dummy sample invoice file if none is selected
    if (!file) {
      const sampleBlob = new Blob(
        [
          `INVOICE SUMMARY\nTransaction ID: TX-${randomId}\nAmount: $450,000 USD\nItem: Copper Cathodes\nDate: 2026-08-20\nStoreOnChain Verified.`
        ],
        { type: "text/plain" }
      );
      const dummyFile = new File([sampleBlob], `invoice-tx-${randomId}.txt`, {
        type: "text/plain",
      });
      setFile(dummyFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please attach an invoice file (PDF).");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessResult(null);

    try {
      const res = await api.recordTrade({
        transactionId,
        exporterId,
        importerId,
        product,
        quantity,
        tradeStatus,
        inspectionStatus,
        disputeStatus,
        settlementStatus,
        expectedDelivery,
        actualDelivery,
        trustScoreAfterTrade,
        invoiceFile: file,
      });

      if (res.success) {
        setSuccessResult({
          message: res.message || "Trade recorded successfully",
          trade: {
            transactionId,
            exporterId,
            importerId,
            product,
            quantity: quantity.toString(),
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
            <h1 className="text-xl font-bold text-white">Record Trade On-Chain</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Endpoint: <code className="text-indigo-300">POST /api/trades</code> — Upload invoice file and persist trade metadata.
          </p>
        </div>
        <button
          type="button"
          onClick={handleFillDemoData}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20 text-xs font-semibold transition"
        >
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Auto-Fill Sample Trade</span>
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Invoice File Upload Dropzone */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Invoice Attachment (Required)
          </label>
          <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center transition bg-slate-900/40">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                <Upload className="w-6 h-6" />
              </div>
              {file ? (
                <div className="flex items-center space-x-2 text-sm text-emerald-400 font-medium">
                  <FileText className="w-4 h-4" />
                  <span>Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-200">
                    Click to upload invoice or drag & drop file
                  </p>
                  <p className="text-xs text-slate-500">PDF Files up to 10MB</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Trade Details Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Transaction ID</label>
            <input
              type="text"
              required
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Exporter ID</label>
            <input
              type="text"
              required
              value={exporterId}
              onChange={(e) => setExporterId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Importer ID</label>
            <input
              type="text"
              required
              value={importerId}
              onChange={(e) => setImporterId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">Product Description</label>
            <input
              type="text"
              required
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Quantity</label>
            <input
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Trade Status</label>
            <select
              value={tradeStatus}
              onChange={(e) => setTradeStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="CREATED">CREATED</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="INSPECTED">INSPECTED</option>
              <option value="DISPUTED">DISPUTED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Inspection Status</label>
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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Dispute Status</label>
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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Settlement Status</label>
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

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Expected Delivery</label>
            <input
              type="date"
              required
              value={expectedDelivery}
              onChange={(e) => setExpectedDelivery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Actual Delivery</label>
            <input
              type="date"
              required
              value={actualDelivery}
              onChange={(e) => setActualDelivery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Trust Score After Trade (0-100)</label>
            <input
              type="number"
              required
              min="0"
              max="100"
              value={trustScoreAfterTrade}
              onChange={(e) => setTrustScoreAfterTrade(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
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
                <span>Processing & Hashing...</span>
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
                <div><span className="text-slate-500">Transaction ID:</span> <span className="text-slate-100 font-semibold">{successResult.trade.transactionId}</span></div>
                <div><span className="text-slate-500">Exporter ID:</span> <span className="text-slate-100 font-semibold">{successResult.trade.exporterId}</span></div>
                <div><span className="text-slate-500">Importer ID:</span> <span className="text-slate-100 font-semibold">{successResult.trade.importerId}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className="text-emerald-400 font-semibold">{successResult.trade.tradeStatus}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-800 text-indigo-300 truncate">
                <span className="text-slate-500">Invoice Hash:</span> {successResult.trade.invoiceHash}
              </div>
              {(successResult.trade as any).transactionHash && (
                <div className="text-emerald-400 truncate">
                  <span className="text-slate-500">Blockchain Tx:</span> {(successResult.trade as any).transactionHash}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
