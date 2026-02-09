'use client';

import React, { useState, useRef, useEffect } from "react";
import { DashboardCard } from "./dashboard-card";
import { Asset } from "@/types/portfolio";
import { useCurrency } from "../context/currency-context";

interface AssetListProps {
  assets: Asset[];
  onUpdateAmount: (id: number, amount: string) => void;
  onUpdatePrice: (id: number, price: string) => void;
  onUpdateSymbol: (id: number, symbol: string) => void;
  onUpdateName: (id: number, name: string) => void;
  onToggleHide: (id: number) => void;
  onDelete: (id: number) => void;
  onRefreshPrices: () => void;
  lastUpdate: string | null;
}

/**
 * Formats holdings amount with full precision (up to 8 decimals).
 * Always preserves all significant digits for crypto accuracy.
 */
function formatAmount(amount: number): string {
  if (amount === 0) return '0';

  // Always show up to 8 decimals, trimming trailing zeros
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  });
}

export function AssetList({
  assets,
  onUpdateAmount,
  onUpdatePrice,
  onUpdateSymbol,
  onUpdateName,
  onToggleHide,
  onDelete,
  onRefreshPrices,
  lastUpdate
}: AssetListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'amount' | 'price' | 'symbol' | 'name' | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { formatPriceFromOriginal, formatValueFromOriginal } = useCurrency();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    onRefreshPrices();
    // Simulate some loading behavior for visual feedback if instant
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSave = (assetId: number, value: string, field: 'amount' | 'price' | 'symbol' | 'name') => {
    if (value === undefined || value === null) {
      setEditingId(null);
      setEditingField(null);
      return;
    }

    switch (field) {
      case 'price':
        if (!isNaN(parseFloat(value))) onUpdatePrice(assetId, value);
        break;
      case 'amount':
        if (!isNaN(parseFloat(value))) onUpdateAmount(assetId, value);
        break;
      case 'symbol':
        if (value.trim()) onUpdateSymbol(assetId, value.trim());
        break;
      case 'name':
        onUpdateName(assetId, value.trim());
        break;
    }
    setEditingId(null);
    setEditingField(null);
  };

  // Grouping and Sorting Logic
  const groupedAssets = assets.reduce((groups, asset) => {
    const type = asset.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(asset);
    return groups;
  }, {} as Record<string, Asset[]>);

  // Define display order and labels
  const typeConfigs: Record<string, { label: string, order: number }> = {
    stock: { label: 'Stocks', order: 1 },
    crypto: { label: 'Crypto', order: 2 },
    bank: { label: 'Cash & Bank', order: 3 },
  };

  const sortedTypes = Object.keys(groupedAssets).sort((a, b) =>
    (typeConfigs[a]?.order || 99) - (typeConfigs[b]?.order || 99)
  );

  const headerAction = (
    <div className="flex items-center gap-4">
      {lastUpdate && (
        <span className="hidden sm:inline text-[10px] text-muted-foreground font-mono">
          Last update: {lastUpdate}
        </span>
      )}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`flex items-center gap-2 px-3 py-1 border border-border hover:border-accent hover:text-accent transition-all text-[10px] uppercase tracking-widest font-bold disabled:opacity-50 ${refreshing ? 'animate-pulse' : ''}`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`}>
          <path fillRule="evenodd" d="M15.312 11.424a5 5 0 11-2.03-5.377l1.257-2.03A7 7 0 1018 10a7.005 7.005 0 00-2.688-5.576L15.312 11.424z" clipRule="evenodd" />
        </svg>
        {refreshing ? 'Refreshing...' : 'Refresh Prices'}
      </button>
    </div>
  );

  return (
    <DashboardCard title="Portfolio Assets" className="col-span-1 md:col-span-2 lg:col-span-3" action={headerAction}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-20">
            <tr>
              <th className="py-3 px-4 font-medium">Asset</th>
              <th className="py-3 px-2 font-medium">Type</th>
              <th className="py-3 px-2 font-medium text-right">Price</th>
              <th className="py-3 px-2 font-medium text-right">Holdings</th>
              <th className="py-3 px-2 font-medium text-right">Value</th>
              <th className="py-3 px-2 font-medium text-right w-10"></th>
            </tr>
          </thead>
          <tbody>
            {sortedTypes.map((type) => {
              const assetsInGroup = groupedAssets[type].sort((a, b) =>
                (b.amount * b.price) - (a.amount * a.price)
              );
              const config = typeConfigs[type];

              return (
                <React.Fragment key={type}>
                  {/* Group Header Row */}
                  <tr className="bg-muted/5 border-y border-border/10">
                    <td colSpan={6} className="py-2 px-4">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                        <div className={`w-1 h-3 rounded-full ${
                          type === 'stock' ? 'bg-indigo-500' :
                          type === 'crypto' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        {config?.label || type}
                      </span>
                    </td>
                  </tr>

                  {assetsInGroup.map((asset) => {
                    const totalValueInOriginal = asset.amount * asset.price;
                    const isBankAsset = asset.type === 'bank';
                    const isHidden = asset.isHidden;

                    return (
                      <tr
                        key={asset.id}
                        className={`group border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors`}
                      >
                        <td className={`py-4 px-4 ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                          {editingId === asset.id && editingField === 'symbol' ? (
                            <input
                              type="text"
                              defaultValue={asset.symbol}
                              onBlur={(e) => handleSave(asset.id, e.target.value, 'symbol')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(asset.id, (e.target as HTMLInputElement).value, 'symbol');
                                if (e.key === 'Escape') { setEditingId(null); setEditingField(null); }
                              }}
                              autoFocus
                              className="w-full px-1 py-0.5 bg-background border border-accent outline-none font-medium text-sm"
                            />
                          ) : (
                            <div
                              className="font-medium text-foreground cursor-pointer hover:text-accent transition-colors"
                              onClick={() => !isHidden && (setEditingId(asset.id), setEditingField('symbol'))}
                            >
                              {asset.symbol}
                            </div>
                          )}

                          {editingId === asset.id && editingField === 'name' ? (
                            <input
                              type="text"
                              defaultValue={asset.name}
                              onBlur={(e) => handleSave(asset.id, e.target.value, 'name')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave(asset.id, (e.target as HTMLInputElement).value, 'name');
                                if (e.key === 'Escape') { setEditingId(null); setEditingField(null); }
                              }}
                              autoFocus
                              className="w-full px-1 py-0.5 bg-background border border-accent outline-none font-light text-xs mt-0.5"
                            />
                          ) : (
                            <div
                              className="text-xs text-muted-foreground font-light mt-0.5 cursor-pointer hover:text-accent transition-colors"
                              onClick={() => !isHidden && (setEditingId(asset.id), setEditingField('name'))}
                            >
                              {asset.name}
                            </div>
                          )}
                        </td>
                        <td className={`py-4 px-2 ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                          <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-sm text-muted-foreground">
                            {asset.type}
                          </span>
                        </td>
                        <td className={`py-4 px-2 text-right font-mono text-muted-foreground ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                          {editingId === asset.id && editingField === 'price' && isBankAsset ? (
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={asset.price}
                              onBlur={(e) => handleSave(asset.id, e.target.value, 'price')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSave(asset.id, (e.target as HTMLInputElement).value, 'price');
                                }
                                if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditingField(null);
                                }
                              }}
                              autoFocus
                              className="w-32 px-1 py-0.5 bg-background border border-accent text-right outline-none font-mono text-sm"
                            />
                          ) : (
                            <span
                              className={isBankAsset && !isHidden ? "cursor-pointer hover:text-accent hover:underline decoration-dashed underline-offset-4" : ""}
                              onClick={() => !isHidden && isBankAsset && (setEditingId(asset.id), setEditingField('price'))}
                            >
                              {formatPriceFromOriginal(asset.price, asset.originalCurrency)}
                            </span>
                          )}
                        </td>
                        <td className={`py-4 px-2 text-right font-mono text-foreground ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                          {editingId === asset.id && editingField === 'amount' && !isBankAsset ? (
                            <input
                              type="number"
                              step="0.00000001"
                              defaultValue={asset.amount}
                              onBlur={(e) => handleSave(asset.id, e.target.value, 'amount')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSave(asset.id, (e.target as HTMLInputElement).value, 'amount');
                                }
                                if (e.key === 'Escape') {
                                  setEditingId(null);
                                  setEditingField(null);
                                }
                              }}
                              autoFocus
                              className="w-32 px-1 py-0.5 bg-background border border-accent text-right outline-none font-mono text-sm"
                            />
                          ) : (
                            <span
                              className={!isBankAsset && !isHidden ? "cursor-pointer hover:text-accent hover:underline decoration-dashed underline-offset-4" : ""}
                              onClick={() => !isHidden && !isBankAsset && (setEditingId(asset.id), setEditingField('amount'))}
                              title={!isBankAsset && !isHidden ? "Click to edit" : ""}
                            >
                              {formatAmount(asset.amount)}
                            </span>
                          )}
                        </td>
                        <td className={`py-4 px-2 text-right font-mono font-medium text-foreground ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                          {formatValueFromOriginal(totalValueInOriginal, asset.originalCurrency)}
                        </td>
                        <td className="py-4 px-2 text-right relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === asset.id ? null : asset.id)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                            </svg>
                          </button>

                          {openMenuId === asset.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-2 top-10 w-32 bg-background border border-border shadow-xl z-50 py-1"
                            >
                              <button
                                onClick={() => {
                                  onToggleHide(asset.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted font-medium transition-colors border-b border-border/50"
                              >
                                {isHidden ? 'Show' : 'Hide'}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Remove ${asset.symbol}?`)) {
                                    onDelete(asset.id);
                                  }
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-destructive/10 text-destructive font-medium transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs uppercase tracking-widest">
                  No assets found. Add an entry to start tracking.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
