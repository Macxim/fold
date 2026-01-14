import { DashboardCard } from "./dashboard-card";
import { Asset } from "../hooks/use-portfolio";

interface AssetAllocationProps {
  assets: Asset[];
}

export function AssetAllocation({ assets }: AssetAllocationProps) {
  const totalValue = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

  // Group by symbol to account for multiple entries of same asset if needed,
  // but looking at logic it seems we treat individual entries or unique assets.
  // The user's snippet logic for allocation groups by symbol:
  // allocation = assets.map(...) -> this implies assets are unique by symbol or they list individually.
  // Let's assume the hook list is granular. But for allocation we might want to aggregate by type or symbol.
  // User snippet: `allocation = assets.map(asset => ({...}))`.
  // It effectively lists every asset entry.

  const allocation = assets.map(asset => ({
    name: asset.symbol,
    value: asset.amount * asset.price,
    percent: totalValue > 0 ? ((asset.amount * asset.price) / totalValue * 100) : 0,
    // Cycle colors
    color: asset.type === 'crypto' ? 'bg-foreground' : asset.type === 'stock' ? 'bg-neutral-500' : 'bg-accent'
  })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5

  return (
    <DashboardCard title="Allocation" className="col-span-1">
      <div className="flex flex-col justify-center h-full space-y-8">
        {assets.length > 0 ? (
            <>
                <div className="flex w-full h-4 gap-px bg-neutral-900 border border-border p-0.5">
                    {allocation.map((asset, i) => (
                        <div key={`${asset.name}-${i}`} style={{ width: `${asset.percent}%` }} className={`h-full ${asset.color} ${i > 2 ? 'opacity-50' : ''}`} />
                    ))}
                </div>

                <div className="space-y-3">
                    {allocation.map((asset, i) => (
                        <div key={`${asset.name}-${i}`} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-sm ${asset.color} ${i > 2 ? 'opacity-50' : ''}`} />
                                <span className="text-muted-foreground uppercase text-xs tracking-wider">{asset.name}</span>
                            </div>
                            <span className="font-mono text-foreground">{asset.percent.toFixed(1)}%</span>
                        </div>
                    ))}
                </div>
            </>
        ) : (
            <div className="text-center text-xs text-muted-foreground">
                No assets added yet.
            </div>
        )}
      </div>
    </DashboardCard>
  );
}
