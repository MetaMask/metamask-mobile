import {
  fetchTokenAsset,
  PEPE_ASSET_FIXTURE,
  resolveTokenAssetDetails,
  type TokenAssetRecord,
} from './tokenAssetQuery';

const OTHER_ASSET_ID =
  'eip155:1/erc20:0x6b175474e89094c44da98b954eedeac495271d0f';

const otherAsset = {
  assetId: OTHER_ASSET_ID,
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
  },
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
      json: async () => [otherAsset],
    });

    const result = await fetchTokenAsset(OTHER_ASSET_ID);

    expect(result).toStrictEqual(otherAsset);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/v2/assets?');
    expect(url).toContain('includeLaunchpadData=true');
    expect(url).toContain('includeRwaData=true');
    expect(url).toContain('includeMarketData=true');
    expect(url).toContain(encodeURIComponent(OTHER_ASSET_ID));
  });

  it('returns null when the response does not include the asset', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const result = await fetchTokenAsset(OTHER_ASSET_ID);

    expect(result).toBeNull();
  });

  it('throws when the assets API responds with an error status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(fetchTokenAsset(OTHER_ASSET_ID)).rejects.toThrow(
      'Token assets API error: 500',
    );
  });
});

describe('resolveTokenAssetDetails', () => {
  it('returns the fixture when the PEPE request fails', () => {
    const result = resolveTokenAssetDetails(
      PEPE_ASSET_FIXTURE.assetId,
      undefined,
      true,
    );

    expect(result).toStrictEqual(PEPE_ASSET_FIXTURE);
  });

  it('keeps fixture fields when the PEPE payload has null content', () => {
    const result = resolveTokenAssetDetails(
      PEPE_ASSET_FIXTURE.assetId,
      {
        ...otherAsset,
        assetId: PEPE_ASSET_FIXTURE.assetId,
        symbol: 'PEPE',
        launchpadData: {
          ...otherAsset.launchpadData,
          description: null,
          protocol: 'PonsV2',
        },
        marketData: {
          ...otherAsset.marketData,
          price: null,
          liquidity: 9,
        },
      } as TokenAssetRecord,
      false,
    );

    expect(result?.launchpadData?.description).toBe(
      PEPE_ASSET_FIXTURE.launchpadData?.description,
    );
    expect(result?.launchpadData?.protocol).toBe('PonsV2');
    expect(result?.marketData?.price).toBe(
      PEPE_ASSET_FIXTURE.marketData?.price,
    );
    expect(result?.marketData?.liquidity).toBe(9);
  });

  it('returns the raw record for a non-PEPE asset', () => {
    const result = resolveTokenAssetDetails(OTHER_ASSET_ID, otherAsset, false);

    expect(result).toStrictEqual(otherAsset);
  });

  it('returns null for a non-PEPE asset when the request fails', () => {
    const result = resolveTokenAssetDetails(OTHER_ASSET_ID, undefined, true);

    expect(result).toBeNull();
  });
});
