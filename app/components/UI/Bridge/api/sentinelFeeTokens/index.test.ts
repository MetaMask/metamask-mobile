import { BridgeClientId } from '@metamask/bridge-controller';
import { fetchSentinelFeeTokens } from '.';

const MOCK_BASE_URL = 'https://orders.test';
const USDC_ASSET_ID =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

jest.mock('../limitOrders/getLimitOrdersBaseUrl', () => ({
  getLimitOrdersBaseUrl: () => MOCK_BASE_URL,
}));

function createResponse(
  body: unknown,
  { ok = true, status = 200 } = {},
): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

describe('fetchSentinelFeeTokens', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse({ 'eip155:1': [USDC_ASSET_ID] }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('requests Sentinel fee tokens from the dynamic orders base URL', async () => {
    await fetchSentinelFeeTokens();

    expect(fetchSpy).toHaveBeenCalledWith(
      `${MOCK_BASE_URL}/getSentinelFeeTokens`,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-Client-Id': BridgeClientId.MOBILE,
          'Client-Version': expect.any(String),
        }),
      }),
    );
    const [, requestInit] = fetchSpy.mock.calls[0];
    expect(requestInit?.headers).not.toHaveProperty('Authorization');
    expect(requestInit?.headers).not.toHaveProperty('Content-Type');
  });

  it('returns normalized Sentinel fee tokens', async () => {
    const result = await fetchSentinelFeeTokens();

    expect(result).toStrictEqual({
      'eip155:1': [{ assetId: USDC_ASSET_ID, symbol: 'DUM8' }],
    });
  });

  it('throws when the API returns a failure status', async () => {
    fetchSpy.mockResolvedValue(createResponse({}, { ok: false, status: 503 }));

    await expect(fetchSentinelFeeTokens()).rejects.toThrow(
      'Request failed with status 503',
    );
  });

  it('throws when the API returns a malformed payload', async () => {
    fetchSpy.mockResolvedValue(createResponse({ 'eip155:1': ['not-caip'] }));

    await expect(fetchSentinelFeeTokens()).rejects.toThrow(
      'invalid asset ID for eip155:1',
    );
  });
});
