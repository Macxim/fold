import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  const ticker = symbol.toUpperCase();

  try {
    console.log(`[API/Stock] Fetching ${ticker}...`);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      console.warn(`[API/Stock] Yahoo Finance error for ${ticker}: ${response.status}`);
      return NextResponse.json(
        { error: `Yahoo Finance error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]) {
      console.warn(`[API/Stock] No data found for ${ticker}`);
      return NextResponse.json({ error: 'No data found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(`[API/Stock] Proxy error for ${ticker}:`, error);
    return NextResponse.json({ error: 'Internal service error' }, { status: 500 });
  }
}
