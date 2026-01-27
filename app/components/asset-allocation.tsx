import { DashboardCard } from "./dashboard-card";
import { Asset } from "../hooks/use-portfolio";

interface AssetAllocationProps {
  assets: Asset[];
}

export function AssetAllocation({ assets }: AssetAllocationProps) {
  const visibleAssets = assets.filter(a => !a.isHidden);

  // Group by type and collect assets
  const typeGroups: Record<string, { total: number, label: string, assets: { symbol: string, value: number, percent: number }[] }> = {
    stock: { total: 0, label: 'Stocks', assets: [] },
    crypto: { total: 0, label: 'Crypto', assets: [] },
    bank: { total: 0, label: 'Cash & Bank', assets: [] }
  };

  const totalValue = visibleAssets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

  visibleAssets.forEach(asset => {
    if (typeGroups[asset.type]) {
      const value = asset.amount * asset.price;
      typeGroups[asset.type].total += value;
      typeGroups[asset.type].assets.push({
        symbol: asset.symbol,
        value: value,
        percent: totalValue > 0 ? (value / totalValue * 100) : 0
      });
    }
  });

  // Sort assets within each group and categories by total value
  Object.values(typeGroups).forEach(group => {
    group.assets.sort((a, b) => b.value - a.value);
  });

  const colors: Record<string, string> = {
    stock: 'bg-indigo-500',
    crypto: 'bg-emerald-500',
    bank: 'bg-amber-500',
  };

  const allocation = Object.entries(typeGroups)
    .filter(([_, group]) => group.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([type, group]) => ({
      type,
      name: group.label,
      value: group.total,
      percent: totalValue > 0 ? (group.total / totalValue * 100) : 0,
      color: colors[type] || 'bg-neutral-500',
      assets: group.assets
    }));

  return (
    <DashboardCard title="Allocation" className="col-span-1">
      <div className="flex flex-col justify-center h-full space-y-6">
        {allocation.length > 0 ? (
            <>
                <div className="flex w-full h-4 gap-px bg-neutral-900 border border-border p-0.5 rounded-sm overflow-hidden">
                    {allocation.map((group, i) => (
                        <div key={`${group.name}-${i}`} style={{ width: `${group.percent}%` }} className={`h-full ${group.color} transition-all duration-500`} />
                    ))}
                </div>

                <div className="space-y-6">
                    {allocation.map((group, i) => (
                        <div key={`${group.name}-${i}`} className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${group.color}`} />
                                    <span className="text-foreground uppercase text-xs tracking-widest font-bold">{group.name}</span>
                                </div>
                                <span className="font-mono text-foreground text-xs font-bold">{group.percent.toFixed(1)}%</span>
                            </div>

                            <div className="pl-5 space-y-1 border-l border-border/50 ml-1">
                                {group.assets.map((asset, j) => (
                                    <div key={`${asset.symbol}-${j}`} className="flex justify-between items-center text-[11px]">
                                        <span className="text-muted-foreground font-mono">{asset.symbol}</span>
                                        <span className="text-muted-foreground/70 font-mono">{asset.percent.toFixed(1)}%</span>
                                    </div>
                                ))}
                            </div>
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
