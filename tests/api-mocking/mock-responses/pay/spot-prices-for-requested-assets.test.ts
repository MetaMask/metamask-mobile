import { spotPricesForRequestedAssets } from './spot-prices-for-requested-assets';

const POLYGON_NATIVE_ASSET_ID = 'eip155:137/slip44:966';
const PUSD_ASSET_ID =
  'eip155:137/erc20:0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb';
const PUSD_CHECKSUM_ASSET_ID =
  'eip155:137/erc20:0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB';

describe('spotPricesForRequestedAssets', () => {
  const known = {
    [POLYGON_NATIVE_ASSET_ID]: {
      id: POLYGON_NATIVE_ASSET_ID,
      price: 1,
      usd: 1,
      eth: 1,
      marketCap: 1,
      pricePercentChange1h: 0,
      pricePercentChange1d: 0,
      pricePercentChange7d: 0,
      pricePercentChange14d: 0,
      pricePercentChange30d: 0,
      pricePercentChange200d: 0,
      pricePercentChange1y: 0,
    },
    [PUSD_ASSET_ID]: {
      id: PUSD_ASSET_ID,
      price: 1,
      usd: 1,
      eth: 1,
      marketCap: 1,
      pricePercentChange1h: 0,
      pricePercentChange1d: 0,
      pricePercentChange7d: 0,
      pricePercentChange14d: 0,
      pricePercentChange30d: 0,
      pricePercentChange200d: 0,
      pricePercentChange1y: 0,
    },
  };

  it('returns the known map when the request names no asset ids', () => {
    const requestedAssetIds: string[] = [];

    const prices = spotPricesForRequestedAssets(known, requestedAssetIds);

    expect(prices[POLYGON_NATIVE_ASSET_ID]?.price).toBe(1);
  });

  it('keys the Polygon native price by slip44:966', () => {
    const requestedAssetIds = [POLYGON_NATIVE_ASSET_ID];

    const prices = spotPricesForRequestedAssets(known, requestedAssetIds);

    expect(prices[POLYGON_NATIVE_ASSET_ID]?.price).toBe(1);
    expect(prices['eip155:137/slip44:60']).toBeUndefined();
  });

  it('copies a known price onto the checksummed asset id from the request', () => {
    const requestedAssetIds = [PUSD_CHECKSUM_ASSET_ID];

    const prices = spotPricesForRequestedAssets(known, requestedAssetIds);

    expect(prices[PUSD_CHECKSUM_ASSET_ID]?.price).toBe(1);
    expect(prices[PUSD_CHECKSUM_ASSET_ID]?.id).toBe(PUSD_CHECKSUM_ASSET_ID);
  });

  it('returns a one-dollar price for a requested asset id that is not in the map', () => {
    const requestedAssetId = 'eip155:143/slip44:268435779';

    const prices = spotPricesForRequestedAssets(known, [requestedAssetId]);

    expect(prices[requestedAssetId]?.price).toBe(1);
  });
});
