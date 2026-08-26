import React, { useState } from "react";
import { api } from "../api/apiClient";
import {
  FileSearch,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

export const InvoiceToolsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"verify" | "download">(
    "verify",
  );

  // Verify State
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyTxId, setVerifyTxId] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    verified?: boolean;
    message?: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Download State
  const [downloadTxId, setDownloadTxId] = useState("");
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Handlers
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyFile || !verifyTxId) {
      setVerifyError("Please provide both transaction ID and invoice file.");
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await api.verifyInvoice(verifyFile, verifyTxId);
      if (res.success) {
        setVerifyResult({
          verified: res.verified,
          message: res.message,
        });
      } else {
        setVerifyError(res.message || "Verification failed.");
      }
    } catch (err: any) {
      setVerifyError(err.message || "Error verifying invoice.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDownloadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadTxId) {
      setDownloadError("Please enter a transaction ID.");
      return;
    }
    setDownloadLoading(true);
    setDownloadError(null);

    try {
      const blob = await api.downloadInvoiceDocument(downloadTxId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${downloadTxId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setDownloadError(err.message || "Failed to download invoice document.");
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Tabs */}
      <div className="glass-card p-2 rounded-2xl border border-slate-800 flex space-x-2">
        <button
          onClick={() => setActiveSubTab("verify")}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeSubTab === "verify"
              ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>1. Verify Authenticity</span>
        </button>

        <button
          onClick={() => setActiveSubTab("download")}
          className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition ${
            activeSubTab === "download"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
          }`}
        >
          <Download className="w-4 h-4" />
          <span>2. Download Document</span>
        </button>
      </div>

      {/* SubTab 1: Verify Invoice */}
      {activeSubTab === "verify" && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-cyan-500/20">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileSearch className="w-5 h-5 text-cyan-400" />
              <span>Verify Invoice Authenticity</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Endpoint:{" "}
              <code className="text-cyan-300">POST /api/invoice/verify</code>{" "}
              — Compares uploaded document hash with trade's stored hash.
            </p>
          </div>

          <form
            onSubmit={handleVerifySubmit}
            className="glass-card p-6 rounded-2xl space-y-6"
          >
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Transaction ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. TX-123456"
                value={verifyTxId}
                onChange={(e) => setVerifyTxId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Invoice File to Verify
              </label>
              <div className="relative border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center transition bg-slate-900/40">
                <input
                  type="file"
                  onChange={(e) => setVerifyFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="w-6 h-6 text-cyan-400" />
                  {verifyFile ? (
                    <span className="text-sm font-medium text-cyan-400">
                      {verifyFile.name} ({(verifyFile.size / 1024).toFixed(1)}{" "}
                      KB)
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Attach file to verify authenticity
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition shadow-lg shadow-cyan-600/30 disabled:opacity-50"
            >
              {verifyLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying On-Chain...</span>
                </>
              ) : (
                <>
                  <FileSearch className="w-4 h-4" />
                  <span>Verify Invoice</span>
                </>
              )}
            </button>
          </form>

          {verifyError && (
            <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center space-x-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifyResult && (
            <div
              className={`glass-card p-6 rounded-2xl border ${
                verifyResult.verified
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              <div className="flex items-center space-x-3 font-bold text-base">
                {verifyResult.verified ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-400" />
                )}
                <span>
                  {verifyResult.verified
                    ? "Authenticity Verified: Document matches recorded blockchain hash!"
                    : "Tamper Warning: Invoice hash does NOT match recorded trade."}
                </span>
              </div>
              {verifyResult.message && (
                <p className="text-xs mt-2 opacity-90">
                  {verifyResult.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Download Document */}
      {activeSubTab === "download" && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-2xl border border-purple-500/20">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Download className="w-5 h-5 text-purple-400" />
              <span>Download Stored Invoice Document</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Endpoint:{" "}
              <code className="text-purple-300">GET /api/invoice/document</code>{" "}
              — Fetches binary file stored for a transaction ID.
            </p>
          </div>

          <form
            onSubmit={handleDownloadSubmit}
            className="glass-card p-6 rounded-2xl space-y-6"
          >
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Transaction ID
              </label>
              <input
                type="text"
                required
                placeholder="Enter Transaction ID (e.g. TX-123456)"
                value={downloadTxId}
                onChange={(e) => setDownloadTxId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={downloadLoading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition shadow-lg shadow-purple-600/30 disabled:opacity-50"
            >
              {downloadLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Retrieving Binary File...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Invoice Binary</span>
                </>
              )}
            </button>
          </form>

          {downloadError && (
            <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center space-x-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{downloadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
