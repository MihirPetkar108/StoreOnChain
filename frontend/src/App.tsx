import { useState, useEffect } from "react";
import { api } from "./api/apiClient";
import { Navbar } from "./components/Navbar";
import { DashboardView } from "./components/DashboardView";
import { MarketplaceView } from "./components/MarketplaceView";
import { PurchaseView } from "./components/PurchaseView";
import { RecordTradeView } from "./components/RecordTradeView";
import { InvoiceToolsView } from "./components/InvoiceToolsView";
import { TradeLedgerView } from "./components/TradeLedgerView";
import { ExporterReputationView } from "./components/ExporterReputationView";
import { ShieldCheck } from "lucide-react";

export function App() {
  const [activeTab, setActiveTab] = useState<string>(
    getPurchaseListingId() ? "marketplace" : "dashboard",
  );
  const [purchaseListingId, setPurchaseListingId] = useState<string | null>(
    getPurchaseListingId(),
  );
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

  const navigateToTab = (tab: string) => {
    if (tab === "marketplace") {
      window.history.pushState({}, "", "/");
      setPurchaseListingId(null);
    }
    setActiveTab(tab);
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      const listingId = getPurchaseListingId();
      setPurchaseListingId(listingId);
      if (listingId) setActiveTab("marketplace");
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigateToTab}
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

        {activeTab === "marketplace" && purchaseListingId ? (
          <PurchaseView listingId={purchaseListingId} />
        ) : activeTab === "marketplace" ? (
          <MarketplaceView />
        ) : null}

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

function getPurchaseListingId(): string | null {
  const match = window.location.pathname.match(/^\/marketplace\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default App;
