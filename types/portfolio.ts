export type AssetType = 'crypto' | 'stock' | 'bank';
export type Currency = 'USD' | 'EUR';

export interface Asset {
  id: number;
  symbol: string;
  name: string;
  type: AssetType;
  amount: number;
  price: number;
  coinId?: string;
  lastFetched?: number;
  originalCurrency?: Currency;
  isHidden?: boolean;
}

export interface HistoryEntry {
  date: string;
  value: number;
}

export interface AssetForm {
  symbol: string;
  name: string;
  type: string;
  amount: string;
  manualPrice?: string;
  priceCurrency?: Currency;
}

export interface OperationResult {
  success: boolean;
  message: string;
}
