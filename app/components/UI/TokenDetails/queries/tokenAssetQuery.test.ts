import { TOKEN_API_BASE_URL } from '../../Assets/watchlist/utils/getTokens';
import {
  fetchTokenAsset,
  resolveTokenAssetDetails,
  tokenAssetQueryOptions,
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

  // Only the Token Details V1 surface passes a `baseUrl`, and it sources that
  // from remote config. Everything else relies on this default, so a dev host
  // configured for the memecoin page cannot move another caller.
  it('calls the production host when no base url is given', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [asset],
    });

    await fetchTokenAsset(ASSET_ID);

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url.startsWith(`${TOKEN_API_BASE_URL}/v2/assets?`)).toBe(true);
  });

  it('keys the default query on the production host', () => {
    expect(tokenAssetQueryOptions(ASSET_ID).queryKey).toStrictEqual([
      'token-details',
      'v2-assets',
      ASSET_ID,
      TOKEN_API_BASE_URL,
    ]);
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
