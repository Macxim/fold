'use client';

import { useEffect, useMemo } from 'react';
import { useAssets } from './use-assets';
import { usePortfolioHistory } from './use-portfolio-history';
import { Asset } from '@/types/portfolio';

export function usePortfolio() {
  const {
    assets,
    lastUpdate,
    fetchAssets,
    refreshPrices,
    addAsset,
    updateAssetAmount,
    updateAssetPrice,
    toggleHideAsset,
    deleteAsset
  } = useAssets();

  const totalValue = useMemo(() =>
    assets
      .filter((a: Asset) => !a.isHidden)
      .reduce((sum: number, asset: Asset) => sum + (asset.amount * asset.price), 0)
  , [assets]);

  const {
    history,
    fetchRemoteHistory,
    migrateLocalToSupabase
  } = usePortfolioHistory(totalValue);

  // Initial data load
  useEffect(() => {
    fetchAssets();
    fetchRemoteHistory();
  }, [fetchAssets, fetchRemoteHistory]);

  // Price refresh logic
  useEffect(() => {
    if (assets.length > 0) {
      const timer = setTimeout(refreshPrices, 1000);
      return () => clearTimeout(timer);
    }
  }, [assets.length, refreshPrices]);

  return {
    assets,
    history,
    totalValue,
    lastUpdate,
    addAsset,
    updateAssetAmount,
    updateAssetPrice,
    toggleHideAsset,
    deleteAsset,
    migrateLocalToSupabase: () => migrateLocalToSupabase(totalValue),
    refreshPrices
  };
}
