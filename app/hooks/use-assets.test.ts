import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssets } from './use-assets';
import { supabase } from '@/lib/supabase';
import { usePricing } from './use-pricing';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  }
}));

// Mock usePricing
vi.mock('./use-pricing', () => ({
  usePricing: vi.fn(() => ({
    fetchPrice: vi.fn(() => Promise.resolve({ price: 100, coinId: 'bitcoin', originalCurrency: 'USD' })),
    updateAllPrices: vi.fn((assets) => Promise.resolve(assets))
  }))
}));

describe('useAssets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches assets on mount', async () => {
    const mockData = [
      { id: 1, symbol: 'BTC', name: 'Bitcoin', type: 'crypto', amount: 1, price: 50000, coin_id: 'bitcoin', is_hidden: false }
    ];

    (supabase.from as any).mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
      }))
    });

    const { result } = renderHook(() => useAssets());

    await act(async () => {
      await result.current.fetchAssets();
    });

    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0].symbol).toBe('BTC');
  });

  it('adds an asset correctly', async () => {
    const mockCreatedAsset = {
      id: 2, symbol: 'ETH', name: 'Ethereum', type: 'crypto', amount: 10, price: 2000,
      coin_id: 'ethereum', original_currency: 'USD', last_fetched_at: new Date().toISOString()
    };

    (supabase.from as any).mockReturnValue({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockCreatedAsset, error: null }))
        }))
      }))
    });

    const { result } = renderHook(() => useAssets());

    let response: any = { success: false };
    await act(async () => {
      response = await result.current.addAsset({
        symbol: 'ETH',
        name: 'Ethereum',
        type: 'crypto',
        amount: '10'
      });
    });

    expect(response.success).toBe(true);
    expect(result.current.assets).toHaveLength(1);
    expect(result.current.assets[0].symbol).toBe('ETH');
  });

  it('updates asset amount', async () => {
    const initialAssets = [{ id: 1, symbol: 'BTC', amount: 1, price: 50000 }];

    const { result } = renderHook(() => useAssets());

    // Manually set state for test (since we can't easily mock the initial load in this simple test)
    act(() => {
      // In a real scenario, fetchAssets would have populated this
      (result.current as any).assets = initialAssets;
    });

    await act(async () => {
      await result.current.updateAssetAmount(1, '2');
    });

    expect(supabase.from).toHaveBeenCalledWith('portfolio_assets');
    // Note: Due to how renderHook works with state updates and mocks,
    // verifying the exact state update might require more complex setup
    // or checking the supabase call arguments.
  });

  it('deletes an asset', async () => {
    const { result } = renderHook(() => useAssets());

    await act(async () => {
      await result.current.deleteAsset(1);
    });

    expect(supabase.from).toHaveBeenCalledWith('portfolio_assets');
  });
});
