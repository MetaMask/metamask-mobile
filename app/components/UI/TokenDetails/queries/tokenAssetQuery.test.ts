import {
  fetchTokenAsset,
  resolveTokenAssetDetails,
  type TokenAssetRecord,
} from './tokenAssetQuery';

const ASSET_ID = 'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';

const asset = {
  assetId: ASSET_ID,
  symbol: 'DAI',
  name: 'Dai',
  decimals: 18,
  rwaData: null,
  marketData: {
    marketCap: 1,
    totalVolume: 2,
    price: '1',
    pricePercentChange1d: '0.1',
    pricePercentChange1h: '0.2',
    liquidity: 3,
    dilutedMarketCap: 4,
    circulatingSupply: 5,
  },
  launchpad: null,
  launchpadData: {
    protocol: null,
    deployer: null,
    launchedAt: null,
    description: null,
    bondingCurve: null,
    graduationPercent: null,
    graduationStage: null,
    devHeldPercent: null,
    insiderHeldPercent: null,
    sniperHeldPercent: null,
    holdersCount: null,
    top10HeldPercent: null,
  },
  holders: null,
} as TokenAssetRecord;

describe('fetchTokenAsset', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
  });

  it('returns the asset whose id matches the request', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [asset],
    });

    const result = await fetchTokenAsset(ASSET_ID);

    expect(result).toStrictEqual(asset);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/v2/assets?');
    expect(url).toContain('includeLaunchpadData=true');
    expect(url).toContain('includeTopHolders=true');
    expect(url).toContain('includeRwaData=true');
    expect(url).toContain('includeMarketData=true');
    expect(url).toContain(encodeURIComponent(ASSET_ID));
  });

  it('keeps the holder count and drops the holder list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          ...asset,
          holders: {
            count: 42,
            top10Percent: '100.000',
            top: [{ address: '0xabc', balance: '1' }],
          },
        },
      ],
    });

    const result = await fetchTokenAsset(ASSET_ID);

    expect(result).toStrictEqual({
      ...asset,
      holders: { count: 42 },
    });
  });

  it('returns null holders when the assets payload omits them', async () => {
    const { holders: _holders, ...assetWithoutHolders } = asset;
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [assetWithoutHolders],
    });

    const result = await fetchTokenAsset(ASSET_ID);

    expect(result?.holders).toBeNull();
  });

  it('returns null when the response does not include the asset', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await fetchTokenAsset(ASSET_ID);

    expect(result).toBeNull();
  });

  it('throws when the assets API responds with an error status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchTokenAsset(ASSET_ID)).rejects.toThrow(
      'Token assets API error: 500',
    );
  });
});

describe('resolveTokenAssetDetails', () => {
  it('returns the record when the request succeeds', () => {
    const result = resolveTokenAssetDetails(ASSET_ID, asset, false);

    expect(result).toStrictEqual(asset);
  });

  it('returns null when the record is undefined and no error', () => {
    const result = resolveTokenAssetDetails(ASSET_ID, undefined, false);

    expect(result).toBeNull();
  });

  it('returns null when the request fails', () => {
    const result = resolveTokenAssetDetails(ASSET_ID, asset, true);

    expect(result).toBeNull();
  });
});
