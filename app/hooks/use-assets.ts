import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Asset, AssetType, AssetForm, OperationResult } from '@/types/portfolio';
import { usePricing } from './use-pricing';

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const { fetchPrice, updateAllPrices } = usePricing();

  const assetsRef = useRef<Asset[]>([]);
  assetsRef.current = assets;

  // Load assets on mount
  const fetchAssets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('portfolio_assets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: Asset[] = (data as any[]).map(item => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          type: item.type as AssetType,
          amount: Number(item.amount),
          price: Number(item.price),
          coinId: item.coin_id,
          lastFetched: item.last_fetched_at ? new Date(item.last_fetched_at).getTime() : undefined,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          originalCurrency: item.original_currency as any, // Cast to any here is fine if we don't have enum
          isHidden: item.is_hidden
        }));
        setAssets(mapped);
      }
    } catch (e) {
      console.error('[useAssets] Fetch failed:', e);
    }
  }, []);

  const refreshPrices = useCallback(async () => {
    const updated = await updateAllPrices(assetsRef.current);
    if (updated !== assetsRef.current) {
      setAssets(updated);
      setLastUpdate(new Date().toLocaleString('en-US'));
    }
  }, [updateAllPrices]);

  const addAsset = useCallback(async (form: AssetForm): Promise<OperationResult> => {
    const { price, coinId, originalCurrency } = await fetchPrice(
      form.symbol,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.type as any,
      undefined
    );

    try {
      const { data, error } = await supabase
        .from('portfolio_assets')
        .insert([{
          symbol: form.symbol.toUpperCase(),
          name: form.name || form.symbol.toUpperCase(),
          type: form.type,
          amount: parseFloat(form.amount || '1'),
          price: form.manualPrice ? parseFloat(form.manualPrice) : price,
          coin_id: coinId,
          original_currency: form.priceCurrency || originalCurrency,
          last_fetched_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      const newAsset: Asset = {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        type: data.type as AssetType,
        amount: Number(data.amount),
        price: Number(data.price),
        coinId: data.coin_id,
        lastFetched: new Date(data.last_fetched_at).getTime(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        originalCurrency: data.original_currency as any,
        isHidden: data.is_hidden
      };

      setAssets(prev => [...prev, newAsset]);
      return { success: true, message: `Added ${newAsset.symbol}` };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, message };
    }
  }, [fetchPrice]);

  const updateAssetAmount = async (id: number, amountStr: string) => {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return;
    try {
      await supabase.from('portfolio_assets').update({ amount }).eq('id', id);
      setAssets(prev => prev.map(a => a.id === id ? { ...a, amount } : a));
    } catch (e) { console.error(e); }
  };

  const updateAssetPrice = async (id: number, priceStr: string) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return;
    try {
      await supabase.from('portfolio_assets').update({ price, last_fetched_at: new Date().toISOString() }).eq('id', id);
      setAssets(prev => prev.map(a => a.id === id ? { ...a, price, lastFetched: Date.now() } : a));
    } catch (e) { console.error(e); }
  };

  const updateAssetSymbol = async (id: number, symbol: string) => {
    if (!symbol) return;
    try {
      await supabase.from('portfolio_assets').update({ symbol: symbol.toUpperCase() }).eq('id', id);
      setAssets(prev => prev.map(a => a.id === id ? { ...a, symbol: symbol.toUpperCase() } : a));
    } catch (e) { console.error(e); }
  };

  const updateAssetName = async (id: number, name: string) => {
    try {
      await supabase.from('portfolio_assets').update({ name }).eq('id', id);
      setAssets(prev => prev.map(a => a.id === id ? { ...a, name } : a));
    } catch (e) { console.error(e); }
  };

  const toggleHideAsset = async (id: number) => {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;
    const isHidden = !asset.isHidden;
    try {
      await supabase.from('portfolio_assets').update({ is_hidden: isHidden }).eq('id', id);
      setAssets(prev => prev.map(a => a.id === id ? { ...a, isHidden } : a));
    } catch (e) { console.error(e); }
  };

  const deleteAsset = async (id: number) => {
    try {
      await supabase.from('portfolio_assets').delete().eq('id', id);
      setAssets(prev => prev.filter(a => a.id !== id));
    } catch (e) { console.error(e); }
  };

  return {
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
  };
}
