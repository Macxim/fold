import { Asset, HistoryEntry } from '@/types/portfolio';

/**
 * Simple seeded pseudo-random number generator (mulberry32)
 * Using a seed ensures the chart looks the same on every page load
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate mock historical data using a random walk with drift
 * Produces realistic market-like data with natural ups, downs, and trends
 */
function generateHistoricalData(days: number, startValue: number, endValue: number): HistoryEntry[] {
  const history: HistoryEntry[] = [];
  const today = new Date();
  const rand = seededRandom(42);

  // Calculate the daily drift needed to reach our target end value
  const totalReturn = endValue / startValue;
  const dailyDrift = Math.pow(totalReturn, 1 / days) - 1;

  // Daily volatility (~0.8% daily, typical for a mixed portfolio)
  const dailyVolatility = 0.008;

  let currentValue = startValue;
  let momentum = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    history.push({
      date: dateString,
      value: Math.round(currentValue * 100) / 100
    });

    // Generate next day's return using Box-Muller transform for normal distribution
    const u1 = rand();
    const u2 = rand();
    const normalRandom = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Daily return = drift + volatility * random + momentum
    const dailyReturn = dailyDrift + dailyVolatility * normalRandom + momentum * 0.3;

    // Update momentum (mean-reverting) for multi-day trends
    momentum = momentum * 0.7 + normalRandom * dailyVolatility * 0.3;

    currentValue = currentValue * (1 + dailyReturn);
  }

  return history;
}

// Mock Assets with realistic values
export const MOCK_ASSETS: Asset[] = [
  // Crypto
  {
    id: 1,
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    amount: 0.487,
    price: 94847.32,
    coinId: 'bitcoin',
    lastFetched: Date.now(),
    originalCurrency: 'USD',
    isHidden: false
  },
  {
    id: 2,
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    amount: 5.234,
    price: 3187.45,
    coinId: 'ethereum',
    lastFetched: Date.now(),
    originalCurrency: 'USD',
    isHidden: false
  },
  // Stocks
  {
    id: 3,
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    amount: 27,
    price: 182.63,
    lastFetched: Date.now(),
    originalCurrency: 'USD',
    isHidden: false
  },
  {
    id: 4,
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    type: 'stock',
    amount: 12,
    price: 248.92,
    lastFetched: Date.now(),
    originalCurrency: 'USD',
    isHidden: false
  },
  // Bank
  {
    id: 5,
    symbol: 'SAV',
    name: 'Savings Account',
    type: 'bank',
    amount: 14873.56,
    price: 1,
    lastFetched: Date.now(),
    originalCurrency: 'USD',
    isHidden: false
  },
  {
    id: 6,
    symbol: 'EMG',
    name: 'Emergency Fund',
    type: 'bank',
    amount: 8250.00,
    price: 1,
    lastFetched: Date.now(),
    originalCurrency: 'USD',
    isHidden: false
  }
];

// Calculate total value from mock assets
const MOCK_TOTAL_VALUE = MOCK_ASSETS.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);

// Generate 365 days of historical data with ~20% growth
export const MOCK_HISTORY: HistoryEntry[] = generateHistoricalData(
  365,
  MOCK_TOTAL_VALUE / 1.2, // Start value (20% less than current)
  MOCK_TOTAL_VALUE // End value (current total)
);

/**
 * Check if demo mode is active
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === 'true';
}
