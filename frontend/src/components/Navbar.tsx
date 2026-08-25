import React from "react";
import {
  ShieldCheck,
  FileText,
  Boxes,
  Award,
  Activity,
  Server,
  ShoppingBag,
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendConnected: boolean | null;
  checkingHealth: boolean;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  backendConnected,
  checkingHealth,
  onRefreshHealth,
}) => {
  const navItems = [
    { id: "dashboard", label: "Overview", icon: Activity },
    { id: "marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "record", label: "Record Trade", icon: Boxes },
    { id: "invoice", label: "Invoice Tools", icon: FileText },
    { id: "ledger", label: "Trade Ledger", icon: ShieldCheck },
    { id: "reputation", label: "Exporter Reputation", icon: Award },
  ];

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-lg text-white tracking-wide">
                  StoreOnChain
                </span>
                <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  dApp
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Decentralized Trade & Invoice Verification
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Backend Health Status */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onRefreshHealth}
              title="Click to check backend status"
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition"
            >
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    checkingHealth
                      ? "bg-amber-400 animate-ping"
                      : backendConnected
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : "bg-rose-500"
                  }`}
                />
                <span className="text-xs font-medium text-slate-300">
                  {checkingHealth
                    ? "Checking..."
                    : backendConnected
                      ? "Backend Active"
                      : "Disconnected"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Nav Tabs */}
        <div className="md:hidden flex overflow-x-auto space-x-1 py-2 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 bg-slate-900/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
