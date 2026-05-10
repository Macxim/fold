#!/usr/bin/env node
// Standalone daily-history recorder. Mirrors the logic in
// app/hooks/use-pricing.ts + use-portfolio-history.ts so a row gets
// written to portfolio_history without needing the browser open.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const log = (...args) => console.log(`[${new Date().toISOString()}]`, ...args);

async function fetchExchangeRate() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    return data.rates?.EUR || 0.92;
  } catch (e) {
    log('exchange rate fetch failed, defaulting to 0.92:', e.message);
    return 0.92;
  }
}

async function fetchCryptoPrices(coinIds) {
  if (coinIds.length === 0) return {};
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) {
    log(`coingecko returned ${res.status}`);
    return {};
  }
  return res.json();
}

async function fetchStockQuote(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });
  if (!res.ok) {
    log(`yahoo returned ${res.status} for ${symbol}`);
    return null;
  }
  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  if (!meta) return null;
  return {
    price: meta.regularMarketPrice || 0,
    currency: meta.currency === 'EUR' ? 'EUR' : 'USD',
  };
}

async function main() {
  log('starting record-history');

  const { data: assets, error } = await supabase.from('portfolio_assets').select('*');
  if (error) throw error;
  log(`loaded ${assets.length} assets`);

  const cryptoAssets = assets.filter(a => a.type === 'crypto' && a.coin_id);
  const cryptoPrices = await fetchCryptoPrices(cryptoAssets.map(a => a.coin_id));

  const priced = [];
  for (const a of assets) {
    let price = Number(a.price);
    let currency = a.original_currency || 'USD';

    if (a.type === 'crypto' && a.coin_id && cryptoPrices[a.coin_id]?.usd) {
      price = cryptoPrices[a.coin_id].usd;
      currency = 'USD';
    } else if (a.type === 'stock') {
      const q = await fetchStockQuote(a.symbol);
      if (q && q.price > 0) {
        price = q.price;
        currency = q.currency;
      }
    } else if (a.type === 'bank') {
      price = 1;
      currency = 'USD';
    }

    priced.push({ ...a, price, original_currency: currency });

    const priceChanged = price !== Number(a.price) || currency !== a.original_currency;
    if (a.type !== 'bank' && priceChanged) {
      const { error: updErr } = await supabase
        .from('portfolio_assets')
        .update({
          price,
          original_currency: currency,
          last_fetched_at: new Date().toISOString(),
        })
        .eq('id', a.id);
      if (updErr) log(`failed to update asset ${a.symbol}:`, updErr.message);
    }
  }

  const eurPerUsd = await fetchExchangeRate();
  const totalUSD = priced
    .filter(a => !a.is_hidden)
    .reduce((sum, a) => {
      const value = Number(a.amount) * Number(a.price);
      const usdValue = a.original_currency === 'EUR' ? value / eurPerUsd : value;
      return sum + usdValue;
    }, 0);

  log(`total USD: ${totalUSD.toFixed(2)}`);

  const today = new Date().toISOString().split('T')[0];
  const { error: upsertErr } = await supabase
    .from('portfolio_history')
    .upsert({ date: today, total_value: totalUSD }, { onConflict: 'date' });
  if (upsertErr) throw upsertErr;
  log(`upserted history row for ${today}`);
}

main().catch(e => {
  console.error('record-history failed:', e);
  process.exit(1);
});
