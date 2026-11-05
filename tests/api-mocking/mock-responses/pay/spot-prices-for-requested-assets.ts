export interface SpotPriceMock {
  id: string;
  price: number;
  usd: number;
  eth: number;
  marketCap: number;
  pricePercentChange1h: number;
  pricePercentChange1d: number;
  pricePercentChange7d: number;
  pricePercentChange14d: number;
  pricePercentChange30d: number;
  pricePercentChange200d: number;
  pricePercentChange1y: number;
}

export function createSpotPrice(
  id: string,
  price: number,
  eth = price,
): SpotPriceMock {
  return {
    id,
    price,
    usd: price,
    eth,
    marketCap: 1,
    pricePercentChange1h: 0,
    pricePercentChange1d: 0,
    pricePercentChange7d: 0,
    pricePercentChange14d: 0,
    pricePercentChange30d: 0,
    pricePercentChange200d: 0,
    pricePercentChange1y: 0,
  };
}

/**
 * Price API responses are keyed by the requested CAIP-19 id. Pay quotes look
 * those keys up after checksumming ERC-20 addresses, so a static lowercase map
 * misses both `eip155:137/slip44:966` and a checksummed pUSD id. A miss becomes
 * "Could not fetch fiat rate for native token" or "Source token fiat rate not
 * found", which the confirmation shows as the generic no-quote alert.
 */
export function spotPricesForRequestedAssets(
  known: Record<string, SpotPriceMock>,
  requestedAssetIds: string[],
): Record<string, SpotPriceMock> {
  if (requestedAssetIds.length === 0) {
    return known;
  }

  const knownByLowercaseId = new Map(
    Object.entries(known).map(([assetId, price]) => [
      assetId.toLowerCase(),
      price,
    ]),
  );

  return Object.fromEntries(
    requestedAssetIds.map((assetId) => {
      const knownPrice = knownByLowercaseId.get(assetId.toLowerCase());

      return [
        assetId,
        knownPrice
          ? { ...knownPrice, id: assetId }
          : createSpotPrice(assetId, 1),
      ];
    }),
  );
}

export function requestedAssetIdsFromPriceUrl(requestUrl: string): string[] {
  try {
    return new URL(requestUrl).searchParams
      .getAll('assetIds')
      .flatMap((value) => value.split(','))
      .map((assetId) => assetId.trim())
      .filter((assetId) => assetId.length > 0);
  } catch {
    return [];
  }
}
