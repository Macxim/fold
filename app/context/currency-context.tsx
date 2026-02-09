'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Currency = 'USD' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  exchangeRate: number; // EUR per 1 USD
  convert: (amountUSD: number) => number;
  convertToBase: (amount: number, originalCurrency?: Currency) => number;
  convertFromOriginal: (amount: number, originalCurrency?: Currency) => number;
  formatValue: (amountUSD: number, showDecimals?: boolean) => string;
  formatValueFromOriginal: (amount: number, originalCurrency?: Currency) => string;
  formatPrice: (priceUSD: number) => string;
  formatPriceFromOriginal: (price: number, originalCurrency?: Currency) => string;
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
  const [exchangeRate, setExchangeRate] = useState<number>(0.92); // Default EUR rate (EUR per 1 USD)
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration
  useEffect(() => {
    const saved = localStorage.getItem('fold-currency');
    if (saved === 'EUR' || saved === 'USD') {
      setCurrencyState(saved as Currency);
    }
    setIsHydrated(true);
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

  // Convert USD to display currency
  const convert = useCallback((amountUSD: number): number => {
    if (currency === 'USD') return amountUSD;
    return amountUSD * exchangeRate;
  }, [currency, exchangeRate]);

  // Convert from original currency to USD (base)
  const convertToBase = useCallback((amount: number, originalCurrency: Currency = 'USD'): number => {
    if (originalCurrency === 'USD') return amount;
    // EUR -> USD: divide by exchangeRate (EUR per USD)
    return amount / exchangeRate;
  }, [exchangeRate]);

  // Convert from original currency to display currency
  const convertFromOriginal = useCallback((amount: number, originalCurrency: Currency = 'USD'): number => {
    // If original and display currency are the same, no conversion needed
    if (originalCurrency === currency) return amount;

    // EUR -> USD: divide by exchangeRate (EUR per USD)
    if (originalCurrency === 'EUR' && currency === 'USD') {
      return amount / exchangeRate;
    }

    // USD -> EUR: multiply by exchangeRate
    if (originalCurrency === 'USD' && currency === 'EUR') {
      return amount * exchangeRate;
    }

    return amount;
  }, [currency, exchangeRate]);

  const formatValue = useCallback((amountUSD: number, showDecimals = true): string => {
    const value = convert(amountUSD);
    const sym = currency === 'USD' ? '$' : '€';

    if (showDecimals) {
      return sym + value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    return sym + Math.floor(value).toLocaleString('en-US');
  }, [convert, currency]);

  // Format value from original currency to display currency
  const formatValueFromOriginal = useCallback((amount: number, originalCurrency: Currency = 'USD'): string => {
    const value = convertFromOriginal(amount, originalCurrency);
    const sym = currency === 'USD' ? '$' : '€';

    return sym + value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, [convertFromOriginal, currency]);

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

  // Format price from original currency
  const formatPriceFromOriginal = useCallback((price: number, originalCurrency: Currency = 'USD'): string => {
    const convertedPrice = convertFromOriginal(price, originalCurrency);
    const sym = currency === 'USD' ? '$' : '€';

    if (convertedPrice === 0) return sym + '0.00';

    if (convertedPrice < 0.0001) {
      return sym + convertedPrice.toLocaleString('en-US', {
        minimumFractionDigits: 8,
        maximumFractionDigits: 8
      });
    }

    if (convertedPrice < 0.01) {
      return sym + convertedPrice.toLocaleString('en-US', {
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      });
    }

    if (convertedPrice < 1) {
      return sym + convertedPrice.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }

    return sym + convertedPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, [convertFromOriginal, currency]);

  const symbol = currency === 'USD' ? '$' : '€';

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      exchangeRate,
      convert,
      convertToBase,
      convertFromOriginal,
      formatValue,
      formatValueFromOriginal,
      formatPrice,
      formatPriceFromOriginal,
      symbol
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}
