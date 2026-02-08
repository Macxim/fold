import { useCallback, useRef } from 'react';
import { Asset, Currency } from '@/types/portfolio';

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;


const isCacheValid = (lastFetched?: number): boolean => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION_MS;
}

export function usePricing() {
  const isFetchingRef = useRef(false);

  const fetchPrice = useCallback(async (symbol: string, type: 'crypto' | 'stock' | 'bank', existingCoinId?: string) => {
    let price = 0;
    let coinId = existingCoinId;
    let originalCurrency: Currency = 'USD';

    if (type === 'crypto') {
      try {
        const url = new URL('/api/crypto-price', window.location.origin);
        url.searchParams.set('symbol', symbol);
        if (coinId) url.searchParams.set('coinIds', coinId);

        const response = await fetch(url.toString());
        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[usePricing] Rate limit hit for ${symbol}, skipping update.`);
            return { price: 0, coinId, originalCurrency: 'USD' as Currency };
          }
          throw new Error(`Status ${response.status}`);
        }

        const data = await response.json();
        const result = coinId ? data[coinId] : Object.values(data)[0] as { price: number, coinId: string };
        price = result?.price || 0;
        coinId = result?.coinId;
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
      }
      originalCurrency = 'USD';
    } else if (type === 'stock') {
      try {
        const response = await fetch(`/api/stock-price?symbol=${symbol.toUpperCase()}`);
        if (!response.ok) throw new Error(`Status ${response.status}`);

        const data = await response.json();
        const result = data.chart?.result?.[0];
        price = result?.meta?.regularMarketPrice || 0;
        originalCurrency = (result?.meta?.currency === 'EUR' ? 'EUR' : 'USD');
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
      }
    } else if (type === 'bank') {
      price = 1;
      originalCurrency = 'USD';
    }

    return { price, coinId, originalCurrency };
  }, []);

  const updateAllPrices = useCallback(async (assets: Asset[]) => {
    if (assets.length === 0 || isFetchingRef.current) return assets;

    const allCached = assets.every(a => isCacheValid(a.lastFetched));
    if (allCached) return assets;

    isFetchingRef.current = true;

    // 1. Separate crypto assets for batching
    const cryptoAssets = assets.filter(a => a.type === 'crypto' && !isCacheValid(a.lastFetched));
    const nonCryptoAssets = assets.filter(a => a.type !== 'crypto' || isCacheValid(a.lastFetched));

    let cryptoResults: Record<string, { price: number, coinId: string }> = {};

    if (cryptoAssets.length > 0) {
      try {
        const coinIds = cryptoAssets.map(a => a.coinId).filter(Boolean).join(',');
        if (coinIds) {
          const url = new URL('/api/crypto-price', window.location.origin);
          url.searchParams.set('coinIds', coinIds);
          const response = await fetch(url.toString());
          if (response.ok) {
            cryptoResults = await response.json();
          }
        }
      } catch (error) {
        console.error('[usePricing] Batch fetch failed:', error);
      }
    }

    // 2. Update all assets
    const updatedAssets = await Promise.all(
      assets.map(async (asset) => {
        if (isCacheValid(asset.lastFetched) || asset.type === 'bank') {
          return asset;
        }

        if (asset.type === 'crypto') {
          const result = asset.coinId ? cryptoResults[asset.coinId] : null;
          if (result && result.price > 0) {
            return { ...asset, price: result.price, coinId: result.coinId, lastFetched: Date.now() };
          }
          // Fallback to individual fetch if not in batch or missing coinId
          const individual = await fetchPrice(asset.symbol, 'crypto', asset.coinId);
          if (individual.price > 0) {
            return { ...asset, price: individual.price, coinId: individual.coinId, lastFetched: Date.now() };
          }
          return asset;
        }

        const { price, coinId } = await fetchPrice(asset.symbol, asset.type, asset.coinId);

        if (price > 0) {
          return { ...asset, price, coinId, lastFetched: Date.now() };
        }
        return asset;
      })
    );

    isFetchingRef.current = false;
    return updatedAssets;
  }, [fetchPrice]);

  return { fetchPrice, updateAllPrices };
}
