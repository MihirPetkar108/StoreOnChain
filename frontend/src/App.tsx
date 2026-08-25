import { useState, useEffect } from "react";
import { api } from "./api/apiClient";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { MarketplaceView } from "./components/MarketplaceView";
import { RecordTradeView } from "./components/RecordTradeView";
import { InvoiceToolsView } from "./components/InvoiceToolsView";
import { TradeLedgerView } from "./components/TradeLedgerView";
import { ExporterReputationView } from "./components/ExporterReputationView";
import { ShieldCheck } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [backendConnected, setBackendConnected] = useState<boolean | null>(
    null,
  );
  const [healthMessage, setHealthMessage] = useState<string>("");
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);

  const checkBackendHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await api.checkHealth();
      setBackendConnected(res.success);
      setHealthMessage(res.message);
    } catch {
      setBackendConnected(false);
      setHealthMessage("Backend unreachable");
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendConnected={backendConnected}
        checkingHealth={checkingHealth}
        onRefreshHealth={checkBackendHealth}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "dashboard" && (
          <DashboardView
            setActiveTab={setActiveTab}
            backendConnected={backendConnected}
            healthMessage={healthMessage}
          />
        )}

        {activeTab === "record" && <RecordTradeView />}

        {activeTab === "marketplace" && <MarketplaceView />}

        {activeTab === "invoice" && <InvoiceToolsView />}

        {activeTab === "ledger" && <TradeLedgerView />}

        {activeTab === "reputation" && <ExporterReputationView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>
              StoreOnChain &copy; 2026 — Decentralized Trade & Invoice Platform
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
