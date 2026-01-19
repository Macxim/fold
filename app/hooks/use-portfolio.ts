import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// Cache duration: 6 hours
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  type: 'crypto' | 'stock' | 'bank';
  amount: number;
  price: number;
  coinId?: string;
  lastFetched?: number;
  originalCurrency?: 'USD' | 'EUR'; // For manually entered values (bank assets)
  isHidden?: boolean;
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

  const totalValue = assets
    .filter(a => !a.isHidden)
    .reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

  // Use ref to always have access to current assets without stale closures
  const assetsRef = useRef<Asset[]>([]);
  assetsRef.current = assets;

  const isFetchingRef = useRef(false);

  // Load data on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAssets = localStorage.getItem('fold-assets-v2');
      const savedHistory = localStorage.getItem('fold-history-v2');
      if (savedAssets) setAssets(JSON.parse(savedAssets));
      if (savedHistory) setHistory(JSON.parse(savedHistory));

      // Load history from Supabase
      const fetchHistory = async () => {
        try {
          const { data, error } = await supabase
            .from('portfolio_history')
            .select('date, total_value')
            .order('date', { ascending: true });

          if (error) throw error;

          if (data) {
            const formattedHistory: HistoryEntry[] = data.map(item => ({
              date: item.date,
              value: Number(item.total_value)
            }));
            setHistory(formattedHistory);
            localStorage.setItem('fold-history-v2', JSON.stringify(formattedHistory));
          }
        } catch (e) {
          console.error('[usePortfolio] Error fetching history from Supabase:', e);
        }
      };

      fetchHistory();
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

  // Fetch prices - runs ONCE on mount and checks cache
  useEffect(() => {
    const updatePrices = async () => {
      const currentAssets = assetsRef.current;

      if (currentAssets.length === 0) return;
      if (isFetchingRef.current) return;

      // Check if ALL assets have valid cache - if so, skip entirely
      const allCached = currentAssets.every(a => isCacheValid(a.lastFetched));
      if (allCached) {
        console.log('[usePortfolio] All prices cached (6h), skipping fetch');
        return;
      }

      isFetchingRef.current = true;
      console.log('[usePortfolio] Starting price update...');

      const updatedAssets = await Promise.all(
        currentAssets.map(async (asset) => {
          // Skip if this specific asset has valid cache
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
              // Keep existing price on error
              return asset;
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
              return asset;
            }
          }

          return { ...asset, price, coinId, lastFetched: Date.now() };
        })
      );

      setAssets(updatedAssets);
      setLastUpdate(new Date().toLocaleString());

      isFetchingRef.current = false;
      console.log('[usePortfolio] Price update complete');
    };

    // Only run once on mount after assets are loaded
    const timer = setTimeout(() => {
      if (assetsRef.current.length > 0) {
        updatePrices();
      }
    }, 500); // Small delay to ensure localStorage has loaded

    return () => clearTimeout(timer);
  }, [assets.length]); // Only re-run if number of assets changes

  // Reactive Sync Effect - watches totalValue and updates local + Supabase history
  useEffect(() => {
    if (totalValue === 0) return;

    const today = new Date().toISOString().split('T')[0];

    // 1. Update local history state immediately for UI snappiness
    setHistory(prev => {
      const lastEntry = prev[prev.length - 1];
      if (lastEntry?.date === today && lastEntry.value === totalValue) return prev;

      const filtered = prev.filter(h => h.date !== today);
      const updated = [...filtered, { date: today, value: totalValue }];
      localStorage.setItem('fold-history-v2', JSON.stringify(updated));
      return updated;
    });

    // 2. Debounce and sync to Supabase
    const timer = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('portfolio_history')
          .upsert({ date: today, total_value: totalValue }, { onConflict: 'date' });

        if (error) throw error;
        console.log('[usePortfolio] History synced to Supabase (Reactive)');
      } catch (e) {
        console.error('[usePortfolio] Error syncing history to Supabase:', e);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [totalValue]);


  const addAsset = useCallback(async (assetForm: {
    symbol: string,
    name: string,
    type: string,
    amount: string,
    manualPrice?: string,
    priceCurrency?: 'USD' | 'EUR'
  }): Promise<{ success: boolean, message: string }> => {
    if (!assetForm.symbol || !assetForm.amount) {
      return { success: false, message: 'Symbol and amount are required' };
    }

    let price = 0;
    let coinId: string | undefined;
    let originalCurrency: 'USD' | 'EUR' | undefined;

    console.log(`[addAsset] Received:`, {
      symbol: assetForm.symbol,
      type: assetForm.type,
      amount: assetForm.amount,
      manualPrice: assetForm.manualPrice,
      priceCurrency: assetForm.priceCurrency
    });

    // Check if manual price is provided (for bank/investment assets)
    if (assetForm.manualPrice && parseFloat(assetForm.manualPrice) > 0) {
      // Store the raw price as entered - no conversion!
      // The display components will handle conversion based on originalCurrency
      price = parseFloat(assetForm.manualPrice);
      originalCurrency = assetForm.priceCurrency || 'EUR';
      console.log(`[addAsset] Stored ${price} in ${originalCurrency} (no conversion)`);
    } else if (assetForm.type === 'crypto') {
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
      // Crypto prices are always in USD
      originalCurrency = 'USD';
    } else if (assetForm.type === 'stock') {
      try {
        const symbol = assetForm.symbol.toUpperCase();
        const url = `/api/stock-price?symbol=${symbol}`;
        console.log(`[addAsset] Fetching stock from proxy: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
          console.error(`[addAsset] Stock fetch via proxy failed with status ${response.status}`);
          return { success: false, message: `Stock service error (${response.status})` };
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        price = result?.meta?.regularMarketPrice || 0;
        const fetchedCurrency = result?.meta?.currency;

        if (!price) {
            return { success: false, message: `Could not find stock: ${assetForm.symbol}` };
        }

        // Set originalCurrency based on Yahoo metadata (default to USD)
        if (fetchedCurrency === 'EUR') {
          originalCurrency = 'EUR';
        } else {
          originalCurrency = 'USD';
        }

        console.log(`[addAsset] Stock ${symbol} price=${price} currency=${fetchedCurrency} -> stored as ${originalCurrency}`);
      } catch (error) {
        console.error('Failed to fetch price');
        return { success: false, message: 'Failed to fetch stock price' };
      }
    } else if (assetForm.type === 'bank') {
        price = 1;
        originalCurrency = 'USD';
    }

    const newAsset: Asset = {
      id: Date.now(),
      symbol: assetForm.symbol.toUpperCase(),
      name: assetForm.name || assetForm.symbol.toUpperCase(),
      type: assetForm.type as any,
      amount: parseFloat(assetForm.amount),
      price: price,
      coinId: coinId,
      lastFetched: Date.now(),
      originalCurrency: originalCurrency
    };

    setAssets(prev => {
        const updated = [...prev, newAsset];
        localStorage.setItem('fold-assets-v2', JSON.stringify(updated));
        window.dispatchEvent(new StorageEvent('storage', {
            key: 'fold-assets-v2',
            newValue: JSON.stringify(updated)
        }));
        return updated;
    });

    const displaySymbol = originalCurrency === 'EUR' ? '€' : '$';
    return { success: true, message: `Added ${newAsset.symbol} at ${displaySymbol}${price.toLocaleString()}` };
  }, []);

  const updateAssetAmount = (assetId: number, newAmount: string) => {
    setAssets(prev => prev.map(asset =>
      asset.id === assetId
        ? { ...asset, amount: parseFloat(newAmount) }
        : asset
    ));
  };

  const updateAssetPrice = (assetId: number, newPrice: string) => {
    setAssets(prev => prev.map(asset =>
      asset.id === assetId
        ? { ...asset, price: parseFloat(newPrice), lastFetched: Date.now() }
        : asset
    ));
  };

  const toggleHideAsset = (assetId: number) => {
    setAssets(prev => prev.map(asset =>
      asset.id === assetId
        ? { ...asset, isHidden: !asset.isHidden }
        : asset
    ));
  };

  const deleteAsset = (assetId: number) => {
      setAssets(prev => prev.filter(a => a.id !== assetId));
  }

  const migrateLocalToSupabase = useCallback(async () => {
    const savedHistory = localStorage.getItem('fold-history-v2');
    const today = new Date().toISOString().split('T')[0];

    try {
      let historyToSync: { date: string, total_value: number }[] = [];

      if (savedHistory) {
        const localHistory: HistoryEntry[] = JSON.parse(savedHistory);
        historyToSync = localHistory.map(h => ({ date: h.date, total_value: h.value }));
      }

      // Always ensure today's current value is included if not present
      if (!historyToSync.find(h => h.date === today)) {
        historyToSync.push({ date: today, total_value: totalValue });
      }

      if (historyToSync.length === 0) {
        return { success: false, message: 'No data to migrate (no assets or history)' };
      }

      const { error } = await supabase
        .from('portfolio_history')
        .upsert(historyToSync, { onConflict: 'date' });

      if (error) throw error;
      return { success: true, message: `Successfully synced ${historyToSync.length} days of history to Supabase` };
    } catch (e: any) {
      console.error('[usePortfolio] Sync failed:', e);
      return { success: false, message: `Sync failed: ${e.message}` };
    }
  }, [totalValue]);

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
    migrateLocalToSupabase
  };
}
