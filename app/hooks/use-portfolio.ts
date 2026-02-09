'use client';

import { useEffect, useMemo } from 'react';
import { useAssets } from './use-assets';
import { usePortfolioHistory } from './use-portfolio-history';
import { Asset } from '@/types/portfolio';
import { useCurrency } from '../context/currency-context';

export function usePortfolio() {
  const { convertToBase } = useCurrency();
  const {
    assets,
    lastUpdate,
    fetchAssets,
    refreshPrices,
    addAsset,
    updateAssetAmount,
    updateAssetPrice,
    updateAssetSymbol,
    updateAssetName,
    toggleHideAsset,
    deleteAsset
  } = useAssets();

  const totalValue = useMemo(() =>
    assets
      .filter((a: Asset) => !a.isHidden)
      .reduce((sum: number, asset: Asset) => sum + convertToBase(asset.amount * asset.price, asset.originalCurrency), 0)
  , [assets, convertToBase]);

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
    updateAssetSymbol,
    updateAssetName,
    toggleHideAsset,
    deleteAsset,
    migrateLocalToSupabase: () => migrateLocalToSupabase(totalValue),
    refreshPrices
  };
}
