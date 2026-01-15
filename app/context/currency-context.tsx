'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Currency = 'USD' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number; // EUR per 1 USD
  convert: (amountUSD: number) => number;
  formatValue: (amountUSD: number, showDecimals?: boolean) => string;
  formatPrice: (priceUSD: number) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const CACHE_KEY = 'fold-exchange-rate';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

interface CachedRate {
  rate: number;
  timestamp: number;
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(0.92); // Default EUR rate

  // Load saved currency preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fold-currency');
      if (saved === 'EUR' || saved === 'USD') {
        setCurrencyState(saved);
      }
    }
  }, []);

  // Fetch exchange rate with caching
  useEffect(() => {
    const fetchRate = async () => {
      if (typeof window === 'undefined') return;

      // Check cache
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const data: CachedRate = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_DURATION) {
            console.log('[Currency] Using cached exchange rate:', data.rate);
            setExchangeRate(data.rate);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
        }
      }

      // Fetch fresh rate
      try {
        console.log('[Currency] Fetching exchange rate...');
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        const rate = data.rates?.EUR || 0.92;

        setExchangeRate(rate);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          rate,
          timestamp: Date.now()
        }));
        console.log('[Currency] Exchange rate updated:', rate);
      } catch (error) {
        console.error('[Currency] Failed to fetch rate:', error);
        // Keep default rate
      }
    };

    fetchRate();
  }, []);

  const setCurrency = useCallback((newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fold-currency', newCurrency);
    }
  }, []);

  const convert = useCallback((amountUSD: number): number => {
    if (currency === 'USD') return amountUSD;
    return amountUSD * exchangeRate;
  }, [currency, exchangeRate]);

  const formatValue = useCallback((amountUSD: number, showDecimals = true): string => {
    const value = convert(amountUSD);
    const sym = currency === 'USD' ? '$' : '€';

    if (showDecimals) {
      return sym + value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    return sym + Math.floor(value).toLocaleString();
  }, [convert, currency]);

  const formatPrice = useCallback((priceUSD: number): string => {
    const price = convert(priceUSD);
    const sym = currency === 'USD' ? '$' : '€';

    if (price === 0) return sym + '0.00';

    // For very low prices (< 0.0001), show up to 8 decimals
    if (price < 0.0001) {
      return sym + price.toLocaleString(undefined, {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
      });
    }

    // For low prices (< 0.01), show up to 6 decimals
    if (price < 0.01) {
      return sym + price.toLocaleString(undefined, {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      });
    }

    // For prices < 1, show up to 4 decimals
    if (price < 1) {
      return sym + price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }

    // Normal prices show 2 decimals
    return sym + price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, [convert, currency]);

  const symbol = currency === 'USD' ? '$' : '€';

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      exchangeRate,
      convert,
      formatValue,
      formatPrice,
      symbol
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}
