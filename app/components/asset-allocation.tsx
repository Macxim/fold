import { DashboardCard } from "./dashboard-card";
import { Asset } from "../hooks/use-portfolio";

interface AssetAllocationProps {
  assets: Asset[];
}

export function AssetAllocation({ assets }: AssetAllocationProps) {
  const visibleAssets = assets.filter(a => !a.isHidden);
  const totalValue = visibleAssets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

  // Group by symbol to account for multiple entries of same asset if needed,
  // but looking at logic it seems we treat individual entries or unique assets.
  // The user's snippet logic for allocation groups by symbol:
  // allocation = assets.map(...) -> this implies assets are unique by symbol or they list individually.
  // Let's assume the hook list is granular. But for allocation we might want to aggregate by type or symbol.
  // User snippet: `allocation = assets.map(asset => ({...}))`.
  // It effectively lists every asset entry.

  const colors = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
  ];

  const allocation = visibleAssets
    .sort((a, b) => (b.amount * b.price) - (a.amount * a.price))
    .slice(0, 5)
    .map((asset, i) => ({
      name: asset.symbol,
      value: asset.amount * asset.price,
      percent: totalValue > 0 ? ((asset.amount * asset.price) / totalValue * 100) : 0,
      color: colors[i % colors.length]
    }));

  return (
    <DashboardCard title="Allocation" className="col-span-1">
      <div className="flex flex-col justify-center h-full space-y-8">
        {visibleAssets.length > 0 ? (
            <>
                <div className="flex w-full h-4 gap-px bg-neutral-900 border border-border p-0.5 rounded-sm overflow-hidden">
                    {allocation.map((asset, i) => (
                        <div key={`${asset.name}-${i}`} style={{ width: `${asset.percent}%` }} className={`h-full ${asset.color} transition-all duration-500`} />
                    ))}
                </div>

                <div className="space-y-3">
                    {allocation.map((asset, i) => (
                        <div key={`${asset.name}-${i}`} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${asset.color}`} />
                                <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-medium">{asset.name}</span>
                            </div>
                            <span className="font-mono text-foreground text-xs">{asset.percent.toFixed(1)}%</span>
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
