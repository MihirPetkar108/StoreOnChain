import React, { useState } from "react";
import { api } from "../api/apiClient";
import type { ExporterReputation } from "../types";
import {
  Award,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Building2,
  Percent,
} from "lucide-react";

export const ExporterReputationView: React.FC = () => {
  const [exporterId, setExporterId] = useState("EXP-9001");
  const [reputation, setReputation] = useState<ExporterReputation | null>(null);
  const [exporterTradeIds, setExporterTradeIds] = useState<string[]>([]);
  const [totalTrades, setTotalTrades] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchReputation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exporterId.trim()) return;

    setLoading(true);
    setError(null);
    setReputation(null);
    setExporterTradeIds([]);

    try {
      // Fetch reputation metrics
      const repRes = await api.getExporterReputation(exporterId.trim());
      if (repRes.success && repRes.reputation) {
        setReputation(repRes.reputation);
      } else {
        setError(repRes.message || "Failed to load exporter reputation.");
      }

      // Fetch exporter trade history IDs
      const tradesRes = await api.getExporterTrades(exporterId.trim());
      if (tradesRes.success) {
        setExporterTradeIds(tradesRes.tradeIds || []);
        setTotalTrades(tradesRes.totalTrades || 0);
      }
    } catch (err: any) {
      setError(err.message || "Error fetching exporter metrics.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header & Search */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Award className="w-6 h-6 text-pink-400" />
              <span>Exporter Reputation & Trust Ledger</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Endpoints: <code className="text-pink-300">GET /api/exporters/:exporterId/reputation</code> & <code className="text-pink-300">GET /api/exporters/:exporterId/trades</code>
            </p>
          </div>

          <form onSubmit={handleFetchReputation} className="flex items-center space-x-2">
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="Enter Exporter ID (e.g. EXP-9001)"
                value={exporterId}
                onChange={(e) => setExporterId(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-pink-500 w-56"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Fetch Reputation"}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex items-center space-x-3 text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Dashboard */}
      {reputation && (
        <div className="space-y-6">
          {/* Top Score Banner */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-950/30 via-slate-900 to-slate-950 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-pink-400" />
                <span>Exporter Scorecard</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">Exporter ID: {exporterId}</h2>
              <p className="text-xs text-slate-400">Total Recorded Trades On-Chain: <span className="text-white font-semibold">{reputation.totalTrades}</span></p>
            </div>

            {/* Trust Gauge Badge */}
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-slate-800 min-w-44 glow-indigo">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Trust Score</span>
              <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-indigo-400 mt-1">
                {reputation.currentTrustScore}
                <span className="text-lg text-slate-500 font-normal">/100</span>
              </span>
            </div>
          </div>

          {/* Key Rates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">On-Time Delivery Rate</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {(Number(reputation.onTimeDeliveryRate) / 100).toFixed(2)}%
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Quality Pass Rate</span>
                <span className="text-2xl font-bold text-cyan-400 mt-1 block">
                  {(Number(reputation.qualityPassRate) / 100).toFixed(2)}%
                </span>
              </div>
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Dispute Rate</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">
                  {(Number(reputation.disputeRate) / 100).toFixed(2)}%
                </span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                <Percent className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Trade Status Breakdown Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <span className="text-xs text-slate-400">Successful Trades</span>
              <span className="text-xl font-bold text-emerald-400 block mt-1">
                {reputation.successfulTrades}
              </span>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <span className="text-xs text-slate-400">Disputed Trades</span>
              <span className="text-xl font-bold text-amber-400 block mt-1">
                {reputation.disputedTrades}
              </span>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <span className="text-xs text-slate-400">Failed Trades</span>
              <span className="text-xl font-bold text-rose-400 block mt-1">
                {reputation.failedTrades}
              </span>
            </div>

            <div className="glass-card p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <span className="text-xs text-slate-400">Cancelled Trades</span>
              <span className="text-xl font-bold text-slate-400 block mt-1">
                {reputation.cancelledTrades}
              </span>
            </div>
          </div>

          {/* Associated Trade IDs */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Associated Trade IDs for Exporter ({totalTrades})</span>
              <span className="text-xs text-slate-400 font-normal">Registered on ledger</span>
            </h3>

            {exporterTradeIds.length === 0 ? (
              <p className="text-xs text-slate-500">No trade IDs listed for this exporter.</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-2">
                {exporterTradeIds.map((id) => (
                  <span
                    key={id}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-indigo-300 font-mono text-xs border border-slate-800"
                  >
                    {id}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
