'use client';

import { useState } from "react";
import { DashboardCard } from "./dashboard-card";
import { Asset } from "../hooks/use-portfolio";

interface AssetListProps {
  assets: Asset[];
  onUpdateAmount: (id: number, amount: string) => void;
  onDelete?: (id: number) => void;
}

export function AssetList({ assets, onUpdateAmount, onDelete }: AssetListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <DashboardCard title="Portfolio Assets" className="col-span-1 md:col-span-2 lg:col-span-3">
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/50">
                    <tr>
                        <th className="py-3 px-2 font-medium">Asset</th>
                        <th className="py-3 px-2 font-medium">Type</th>
                        <th className="py-3 px-2 font-medium text-right">Price</th>
                        <th className="py-3 px-2 font-medium text-right">Holdings</th>
                        <th className="py-3 px-2 font-medium text-right">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {assets.map((asset) => (
                        <tr key={asset.id} className="group border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="py-4 px-2">
                                <div className="font-medium text-foreground">{asset.symbol}</div>
                                <div className="text-xs text-muted-foreground font-light mt-0.5">{asset.name}</div>
                            </td>
                            <td className="py-4 px-2">
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-sm text-muted-foreground">
                                    {asset.type}
                                </span>
                            </td>
                            <td className="py-4 px-2 text-right font-mono text-muted-foreground">
                                ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 px-2 text-right font-mono text-foreground">
                                {editingId === asset.id ? (
                                    <input
                                        type="number"
                                        step="0.00000001"
                                        defaultValue={asset.amount}
                                        onBlur={(e) => {
                                            onUpdateAmount(asset.id, e.target.value);
                                            setEditingId(null);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                onUpdateAmount(asset.id, (e.target as HTMLInputElement).value);
                                                setEditingId(null);
                                            }
                                        }}
                                        autoFocus
                                        className="w-24 px-1 py-0.5 bg-background border border-accent text-right outline-none"
                                    />
                                ) : (
                                    <span
                                        className="cursor-pointer hover:text-accent hover:underline decoration-dashed underline-offset-4"
                                        onClick={() => setEditingId(asset.id)}
                                        title="Click to edit"
                                    >
                                        {asset.amount.toLocaleString()}
                                    </span>
                                )}
                            </td>
                            <td className="py-4 px-2 text-right font-mono font-medium text-foreground">
                                ${(asset.amount * asset.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                    {assets.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs uppercase tracking-widest">
                                No assets found. Add an entry to start tracking.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
         </div>
    </DashboardCard>
  )
}
