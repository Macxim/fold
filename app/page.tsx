"use client";

import { Sidebar } from "./components/sidebar";
import { PortfolioSummary } from "./components/portfolio-summary";
import { AssetAllocation } from "./components/asset-allocation";
import { AssetList } from "./components/asset-list";
import { usePortfolio } from "./hooks/use-portfolio";

export default function Home() {
  const { assets, history, lastUpdate, updateAssetAmount, updateAssetPrice } = usePortfolio();

  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground selection:bg-accent selection:text-accent-foreground">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
        <header className="mb-12 flex justify-between items-end">
            <div>
                <h2 className="text-muted-foreground text-xs md:text-sm uppercase tracking-widest mb-2 font-medium">Portfolio Overview</h2>
                <p className="text-2xl md:text-3xl font-light text-foreground tracking-tight">Hello there, LFG!</p>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <PortfolioSummary assets={assets} history={history} lastUpdate={lastUpdate} />
            <AssetAllocation assets={assets} />
            <AssetList assets={assets} onUpdateAmount={updateAssetAmount} onUpdatePrice={updateAssetPrice} />
        </div>
      </main>
    </div>
  );
}