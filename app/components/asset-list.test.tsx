import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetList } from './asset-list';
import { Asset } from '@/types/portfolio';
import React from 'react';

// Mock useCurrency hook
vi.mock('../context/currency-context', () => ({
  useCurrency: () => ({
    formatValue: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    formatPriceFromOriginal: (price: number) => `$${price.toFixed(2)}`,
    formatValueFromOriginal: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
    convertToBase: (amount: number) => amount,
  })
}));

describe('AssetList', () => {
  const mockAssets: Asset[] = [
    { id: 1, symbol: 'BTC', name: 'Bitcoin', type: 'crypto', amount: 1, price: 50000, originalCurrency: 'USD' },
    { id: 2, symbol: 'ETH', name: 'Ethereum', type: 'crypto', amount: 10, price: 2000, originalCurrency: 'USD' },
    { id: 3, symbol: 'AAPL', name: 'Apple', type: 'stock', amount: 5, price: 150, originalCurrency: 'USD' },
    { id: 4, symbol: 'CHASE', name: 'Checking', type: 'bank', amount: 1, price: 5000, originalCurrency: 'USD' },
  ];

  const mockProps = {
    assets: mockAssets,
    onUpdateAmount: vi.fn(),
    onUpdatePrice: vi.fn(),
    onUpdateSymbol: vi.fn(),
    onUpdateName: vi.fn(),
    onToggleHide: vi.fn(),
    onDelete: vi.fn(),
    onRefreshPrices: vi.fn(),
    lastUpdate: 'Just now'
  };

  it('renders assets grouped by type', () => {
    render(<AssetList {...mockProps} />);

    expect(screen.getByText('Crypto')).toBeDefined();
    expect(screen.getByText('Stocks')).toBeDefined();
    expect(screen.getByText('Cash & Bank')).toBeDefined();

    expect(screen.getByText('BTC')).toBeDefined();
    expect(screen.getByText('ETH')).toBeDefined();
    expect(screen.getByText('AAPL')).toBeDefined();
    expect(screen.getByText('CHASE')).toBeDefined();
  });

  it('displays correct totals for each category', () => {
    render(<AssetList {...mockProps} />);

    // Crypto Total: 1*50000 + 10*2000 = 70000
    // Stocks Total: 5*150 = 750
    // Bank Total: 1*5000 = 5000

    expect(screen.getByText('Total: $70,000.00')).toBeDefined();
    expect(screen.getByText('Total: $750.00')).toBeDefined();
    expect(screen.getByText('Total: $5,000.00')).toBeDefined();
  });

  it('renders empty message when no assets are provided', () => {
    render(<AssetList {...mockProps} assets={[]} />);
    expect(screen.getByText(/No assets found/i)).toBeDefined();
  });
});
