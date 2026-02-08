import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  let coinIds = searchParams.get('coinIds');

  if (!symbol && !coinIds) {
    return NextResponse.json({ error: 'Symbol or coinIds is required' }, { status: 400 });
  }

  try {
    // 1. Resolve coinId if only symbol provided and no coinIds
    if (!coinIds && symbol) {
      console.log(`[API/Crypto] Resolving ID for ${symbol}...`);
      const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`, {
        next: { revalidate: 86400 } // Cache search results for 24 hours
      });
      const searchData = await searchRes.json();
      const coin = searchData.coins?.find((c: any) => c.symbol.toLowerCase() === symbol.toLowerCase());
      if (coin?.id) {
        coinIds = coin.id;
      }
    }

    if (!coinIds) {
      return NextResponse.json({ error: 'Coin ID not found' }, { status: 404 });
    }

    // 2. Fetch prices (supports multiple IDs)
    console.log(`[API/Crypto] Fetching prices for ${coinIds}...`);
    const priceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
      { next: { revalidate: 60 } } // Cache price for 60 seconds
    );

    if (!priceRes.ok) {
      if (priceRes.status === 429) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
      }
      throw new Error(`CoinGecko error: ${priceRes.status}`);
    }

    const priceData = await priceRes.json();

    // Return a map of coinId -> { price, coinId }
    const results: Record<string, { price: number, coinId: string }> = {};
    const requestedIds = coinIds.split(',');

    requestedIds.forEach(id => {
      if (priceData[id]) {
        results[id] = {
          price: priceData[id].usd,
          coinId: id
        };
      }
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error(`[API/Crypto] Proxy error:`, error);
    return NextResponse.json({ error: 'Internal service error' }, { status: 500 });
  }
}
