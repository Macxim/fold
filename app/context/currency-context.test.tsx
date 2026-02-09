import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CurrencyProvider, useCurrency } from './currency-context';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('CurrencyContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CurrencyProvider>{children}</CurrencyProvider>
  );

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('provides default currency as USD', () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });
    expect(result.current.currency).toBe('USD');
    expect(result.current.symbol).toBe('$');
  });

  it('converts USD to EUR correctly', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency('EUR');
    });

    // Default exchange rate is 0.92
    expect(result.current.convert(100)).toBe(92);
  });

  it('converts to base (USD) correctly', () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // EUR -> USD: 100 / 0.92 ≈ 108.70
    expect(result.current.convertToBase(92, 'EUR')).toBe(100);
    expect(result.current.convertToBase(100, 'USD')).toBe(100);
  });

  it('converts from original correctly', () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    // Current is USD, Original is EUR
    // EUR -> USD: 92 / 0.92 = 100
    expect(result.current.convertFromOriginal(92, 'EUR')).toBe(100);
  });

  it('formats values correctly for USD', () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    expect(result.current.formatValue(1234.56)).toBe('$1,234.56');
    expect(result.current.formatValue(1234.56, false)).toBe('$1,234');
  });

  it('changes currency and updates symbol', async () => {
    const { result } = renderHook(() => useCurrency(), { wrapper });

    act(() => {
      result.current.setCurrency('EUR');
    });

    expect(result.current.currency).toBe('EUR');
    expect(result.current.symbol).toBe('€');
    expect(result.current.formatValue(100)).toBe('€92.00');
  });
});
