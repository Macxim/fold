
const resolveCoinId = async (symbol) => {
  try {
    console.log(`Resolving ${symbol}...`);
    const response = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`);
    const data = await response.json();
    const coin = data.coins?.find((c) => c.symbol.toLowerCase() === symbol.toLowerCase());
    console.log(`Resolved ${symbol} to:`, coin?.id);
    return coin?.id;
  } catch (e) {
    console.error("Failed to resolve coin ID", symbol, e);
    return undefined;
  }
}

const fetchPrice = async (id) => {
  if (!id) return;
  try {
    console.log(`Fetching price for ${id}...`);
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    const data = await response.json();
    console.log(`Price for ${id}:`, data[id]?.usd);
  } catch (e) {
    console.error("Failed to fetch price", e);
  }
}

const run = async () => {
  const btcId = await resolveCoinId('btc');
  await fetchPrice(btcId);

  const ethId = await resolveCoinId('eth');
  await fetchPrice(ethId);
}

run();
