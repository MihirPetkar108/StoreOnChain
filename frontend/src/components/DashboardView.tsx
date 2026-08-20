import React from "react";
import {
  FileCheck,
  FileSearch,
  Download,
  PlusCircle,
  Award,
  ListFilter,
  ArrowRight,
  Database,
  Lock,
  Zap,
} from "lucide-react";

interface DashboardViewProps {
  setActiveTab: (tab: string) => void;
  backendConnected: boolean | null;
  healthMessage: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  backendConnected,
  healthMessage,
}) => {
  const features = [
    {
      title: "Record Trade On-Chain",
      desc: "Upload invoice and record immutable trade details onto the blockchain ledger.",
      icon: PlusCircle,
      endpoint: "POST /api/trades",
      tab: "record",
      color: "from-indigo-500 to-blue-600",
    },
    {
      title: "Invoice Hash Processing",
      desc: "Extract and generate cryptographic SHA-256 hashes for raw invoice files.",
      icon: FileCheck,
      endpoint: "POST /api/invoice/process",
      tab: "invoice",
      color: "from-cyan-500 to-teal-600",
    },
    {
      title: "Invoice Authenticity Verification",
      desc: "Verify uploaded invoices against stored blockchain hashes to prevent fraud.",
      icon: FileSearch,
      endpoint: "GET /api/invoice/verify",
      tab: "invoice",
      color: "from-emerald-500 to-green-600",
    },
    {
      title: "Document Retrieval",
      desc: "Download full binary invoice documents associated with registered trades.",
      icon: Download,
      endpoint: "GET /api/invoice/document",
      tab: "invoice",
      color: "from-purple-500 to-indigo-600",
    },
    {
      title: "Trade Ledger & Filter",
      desc: "Query trades by lifecycle status or retrieve exact transaction details by ID.",
      icon: ListFilter,
      endpoint: "GET /api/trades?status=<status>",
      tab: "ledger",
      color: "from-amber-500 to-orange-600",
    },
    {
      title: "Exporter Reputation Ledger",
      desc: "View trust scores, trade volume, pass rates, and dispute analytics per exporter.",
      icon: Award,
      endpoint: "GET /api/exporters/:exporterId/reputation",
      tab: "reputation",
      color: "from-pink-500 to-rose-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-card p-8 sm:p-12 border border-indigo-500/20 bg-gradient-to-r from-indigo-950/50 via-slate-900/80 to-slate-950/80">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>StoreOnChain Trade Verification Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Cryptographic Trade Ledger &{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400">
              Invoice Authenticity
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            StoreOnChain bridges international trade workflows with blockchain
            immutability. Process invoice hashes, record cross-border trade
            transactions, verify document authenticity, and track exporter trust
            metrics seamlessly.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={() => setActiveTab("record")}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/30"
            >
              <span>Record New Trade</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab("invoice")}
              className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium text-sm transition"
            >
              <FileSearch className="w-4 h-4 text-cyan-400" />
              <span>Verify Invoice Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Backend API Connection Banner */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div
            className={`p-3 rounded-xl ${backendConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}
          >
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm">
                Backend API Status
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {healthMessage ||
                (backendConnected
                  ? "Backend engine is connected and ready to process requests."
                  : "Could not connect to backend server at http://localhost:3000.")}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${backendConnected ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/10 text-rose-300 border border-rose-500/30"}`}
          >
            {backendConnected ? "ONLINE" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Feature Endpoints Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            <span>Platform API Demonstrations</span>
          </h2>
          <span className="text-xs text-slate-400">7 Active Endpoints</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                onClick={() => setActiveTab(feature.tab)}
                className="glass-card glass-card-hover rounded-2xl p-6 cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 shadow-md`}
                    >
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-medium px-2 py-1 rounded bg-slate-900 text-indigo-300 border border-slate-800">
                      {feature.endpoint}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-100 text-base group-hover:text-indigo-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
                  <span>Try Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
