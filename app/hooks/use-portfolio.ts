import { useState, useEffect, useCallback } from 'react';

// Cache duration: 15 minutes
const CACHE_DURATION_MS = 15 * 60 * 1000;

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'bank';
  amount: number;
  price: number;
  coinId?: string;
  lastFetched?: number; // Timestamp of last price fetch
}

export interface HistoryEntry {
  date: string;
  value: number;
}

const resolveCoinId = async (symbol: string): Promise<string | undefined> => {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`);
        const data = await response.json();
        const coin = data.coins?.find((c: any) => c.symbol.toLowerCase() === symbol.toLowerCase());
        return coin?.id;
    } catch (e) {
        console.error("Failed to resolve coin ID", symbol, e);
        return undefined;
    }
}

const isCacheValid = (lastFetched?: number): boolean => {
    if (!lastFetched) return false;
    return Date.now() - lastFetched < CACHE_DURATION_MS;
}

export function usePortfolio() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAssets = localStorage.getItem('fold-assets-v2');
      const savedHistory = localStorage.getItem('fold-history-v2');
      if (savedAssets) setAssets(JSON.parse(savedAssets));
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save assets
  useEffect(() => {
    if (typeof window !== 'undefined' && assets.length > 0) {
      localStorage.setItem('fold-assets-v2', JSON.stringify(assets));
    }
  }, [assets]);

  // Save history
  useEffect(() => {
    if (typeof window !== 'undefined' && history.length > 0) {
      localStorage.setItem('fold-history-v2', JSON.stringify(history));
    }
  }, [history]);

  // Sync from localStorage changes (for cross-component sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fold-assets-v2' && e.newValue) {
        setAssets(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Fetch prices with caching
  useEffect(() => {
    const updatePrices = async () => {
      if (assets.length === 0) return;

      const today = new Date().toISOString().split('T')[0];
      const lastHistoryDate = history.length > 0 ? history[history.length - 1].date : null;

      // Check if all assets have valid cache
      const allCached = assets.every(a => isCacheValid(a.lastFetched));

      if (allCached && lastHistoryDate === today) {
        console.log('[usePortfolio] All prices cached, skipping fetch');
        return;
      }

      setLastUpdate(new Date().toLocaleString());

      const updatedAssets = await Promise.all(
        assets.map(async (asset) => {
          // Skip if cache is valid
          if (isCacheValid(asset.lastFetched)) {
            console.log(`[usePortfolio] Using cached price for ${asset.symbol}`);
            return asset;
          }

          let price = asset.price || 0;
          let coinId = asset.coinId;

          if (asset.type === 'crypto') {
            try {
              if (!coinId) {
                 coinId = await resolveCoinId(asset.symbol);
              }

              if (coinId) {
                  console.log(`[usePortfolio] Fetching price for ${asset.symbol} (${coinId})`);
                  const response = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
                  );
                  const data = await response.json();
                  price = data[coinId]?.usd || price;
              }
            } catch (error) {
              console.error(`Failed to fetch ${asset.symbol}:`, error);
            }
          } else if (asset.type === 'stock') {
            try {
              console.log(`[usePortfolio] Fetching price for ${asset.symbol}`);
              const response = await fetch(
                `https://query1.finance.yahoo.com/v8/finance/chart/${asset.symbol.toUpperCase()}`
              );
              const data = await response.json();
              price = data.chart?.result?.[0]?.meta?.regularMarketPrice || price;
            } catch (error) {
              console.error(`Failed to fetch ${asset.symbol}:`, error);
            }
          }

          return { ...asset, price, coinId, lastFetched: Date.now() };
        })
      );

      setAssets(updatedAssets);

      const totalValue = updatedAssets.reduce((sum, asset) =>
        sum + (asset.amount * asset.price), 0
      );

      if (lastHistoryDate !== today) {
         setHistory(prev => [...prev, {
            date: today,
            value: totalValue
         }]);
      }
    };

    updatePrices();
    const interval = setInterval(updatePrices, 60 * 1000); // Check every minute (but respects cache)
    return () => clearInterval(interval);
  }, [assets.length, history]);


  const addAsset = useCallback(async (assetForm: { symbol: string, name: string, type: string, amount: string }): Promise<{ success: boolean, message: string }> => {
    if (!assetForm.symbol || !assetForm.amount) {
      return { success: false, message: 'Symbol and amount are required' };
    }

    let price = 0;
    let coinId: string | undefined;

    // Fetch initial price
    if (assetForm.type === 'crypto') {
      try {
        coinId = await resolveCoinId(assetForm.symbol);

        if (coinId) {
            const response = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
            );
            const data = await response.json();
            price = data[coinId]?.usd || 0;
        } else {
            return { success: false, message: `Could not find crypto: ${assetForm.symbol}` };
        }
      } catch (error) {
        console.error('Failed to fetch price');
        return { success: false, message: 'Failed to fetch price from API' };
      }
    } else if (assetForm.type === 'stock') {
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${assetForm.symbol.toUpperCase()}`
        );
        const data = await response.json();
        price = data.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
        if (!price) {
            return { success: false, message: `Could not find stock: ${assetForm.symbol}` };
        }
      } catch (error) {
        console.error('Failed to fetch price');
        return { success: false, message: 'Failed to fetch stock price' };
      }
    } else if (assetForm.type === 'bank') {
        price = 1; // Cash is always $1 per unit
    }

    const newAsset: Asset = {
      id: Date.now(),
      symbol: assetForm.symbol.toUpperCase(),
      name: assetForm.name || assetForm.symbol.toUpperCase(),
      type: assetForm.type as any,
      amount: parseFloat(assetForm.amount),
      price: price,
      coinId: coinId,
      lastFetched: Date.now()
    };

    // Update state and also manually push to localStorage for cross-component sync
    setAssets(prev => {
        const updated = [...prev, newAsset];
        localStorage.setItem('fold-assets-v2', JSON.stringify(updated));
        // Dispatch storage event manually for same-tab sync
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'fold-assets-v2',
            newValue: JSON.stringify(updated)
        }));
        return updated;
    });

    return { success: true, message: `Added ${newAsset.symbol} at $${price.toLocaleString()}` };
  }, []);

  const updateAssetAmount = (assetId: number, newAmount: string) => {
    setAssets(prev => prev.map(asset =>
      asset.id === assetId
        ? { ...asset, amount: parseFloat(newAmount) }
        : asset
    ));
  };

  const deleteAsset = (assetId: number) => {
      setAssets(prev => prev.filter(a => a.id !== assetId));
  }

  const totalValue = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

  return {
    assets,
    history,
    totalValue,
    lastUpdate,
    addAsset,
    updateAssetAmount,
    deleteAsset
  };
}
