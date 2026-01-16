'use client';

import { useState, useRef, useEffect } from "react";
import { DashboardCard } from "./dashboard-card";
import { Asset } from "../hooks/use-portfolio";
import { useCurrency } from "../context/currency-context";

interface AssetListProps {
  assets: Asset[];
  onUpdateAmount: (id: number, amount: string) => void;
  onUpdatePrice: (id: number, price: string) => void;
  onToggleHide: (id: number) => void;
  onDelete: (id: number) => void;
}

/**
 * Formats holdings amount with full precision (up to 8 decimals).
 * Always preserves all significant digits for crypto accuracy.
 */
function formatAmount(amount: number): string {
  if (amount === 0) return '0';

  // Always show up to 8 decimals, trimming trailing zeros
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8
  });
}

export function AssetList({ assets, onUpdateAmount, onUpdatePrice, onToggleHide, onDelete }: AssetListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
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

  const handleSave = (assetId: number, value: string, isPrice: boolean) => {
    if (value && !isNaN(parseFloat(value))) {
      if (isPrice) {
        onUpdatePrice(assetId, value);
      } else {
        onUpdateAmount(assetId, value);
      }
    }
    setEditingId(null);
  };

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
              <th className="py-3 px-2 font-medium text-right w-10"></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((asset) => {
              const totalValueInOriginal = asset.amount * asset.price;
              const isBankAsset = asset.type === 'bank';
              const isHidden = asset.isHidden;

              return (
                <tr
                  key={asset.id}
                  className={`group border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors`}
                >
                  <td className={`py-4 px-2 ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                    <div className="font-medium text-foreground">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground font-light mt-0.5">
                      {asset.name}
                    </div>
                  </td>
                  <td className={`py-4 px-2 ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 border border-border rounded-sm text-muted-foreground">
                      {asset.type}
                    </span>
                  </td>
                  <td className={`py-4 px-2 text-right font-mono text-muted-foreground ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                    {editingId === asset.id && isBankAsset ? (
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={asset.price}
                        onBlur={(e) => handleSave(asset.id, e.target.value, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSave(asset.id, (e.target as HTMLInputElement).value, true);
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="w-32 px-1 py-0.5 bg-background border border-accent text-right outline-none font-mono text-sm"
                      />
                    ) : (
                      <span
                        className={isBankAsset && !isHidden ? "cursor-pointer hover:text-accent hover:underline decoration-dashed underline-offset-4" : ""}
                        onClick={() => !isHidden && isBankAsset && setEditingId(asset.id)}
                      >
                        {formatPriceFromOriginal(asset.price, asset.originalCurrency)}
                      </span>
                    )}
                  </td>
                  <td className={`py-4 px-2 text-right font-mono text-foreground ${isHidden ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                    {editingId === asset.id && !isBankAsset ? (
                      <input
                        type="number"
                        step="0.00000001"
                        defaultValue={asset.amount}
                        onBlur={(e) => handleSave(asset.id, e.target.value, false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSave(asset.id, (e.target as HTMLInputElement).value, false);
                          }
                          if (e.key === 'Escape') {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="w-32 px-1 py-0.5 bg-background border border-accent text-right outline-none font-mono text-sm"
                      />
                    ) : (
                      <span
                        className={!isBankAsset && !isHidden ? "cursor-pointer hover:text-accent hover:underline decoration-dashed underline-offset-4" : ""}
                        onClick={() => !isHidden && !isBankAsset && setEditingId(asset.id)}
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
