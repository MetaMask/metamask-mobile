import { ApiEnv } from '../../../../core/apiEnv';
import { fetchMoneyVaultComposition } from './moneyVaultComposition';

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_CHAIN_ID = 143;
const MOCK_RESPONSE = {
  chain_id: MOCK_CHAIN_ID,
  vault_address: MOCK_ADDRESS.toLowerCase(),
  vault_key: 'standard',
  nav_usd: '12.34',
};

const createResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('fetchMoneyVaultComposition', () => {
  const originalApiEnv = process.env.MM_API_ENV;

  afterEach(() => {
    if (originalApiEnv === undefined) {
      delete process.env.MM_API_ENV;
    } else {
      process.env.MM_API_ENV = originalApiEnv;
    }
    jest.restoreAllMocks();
  });

  it.each([
    [ApiEnv.Dev, 'https://money.dev-api.cx.metamask.io'],
    [ApiEnv.Uat, 'https://money.uat-api.cx.metamask.io'],
    [ApiEnv.Prod, 'https://money.api.cx.metamask.io'],
  ] as const)('uses the %s Money API host', async (apiEnv, baseUrl) => {
    process.env.MM_API_ENV = apiEnv;
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse(MOCK_RESPONSE));

    await fetchMoneyVaultComposition(MOCK_ADDRESS, MOCK_CHAIN_ID);

    expect(mockFetch).toHaveBeenCalledWith(
      `${baseUrl}/v1/vaults/${MOCK_ADDRESS.toLowerCase()}/composition?chain_id=${MOCK_CHAIN_ID}`,
    );
  });

  it('returns the decoded composition response', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse(MOCK_RESPONSE));

    const result = await fetchMoneyVaultComposition(
      MOCK_ADDRESS,
      MOCK_CHAIN_ID,
    );

    expect(result).toEqual(MOCK_RESPONSE);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining(MOCK_ADDRESS.toLowerCase()),
    );
  });

  it('throws an error with the HTTP status for non-2xx responses', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(createResponse({ message: 'unavailable' }, 503));

    await expect(
      fetchMoneyVaultComposition(MOCK_ADDRESS, MOCK_CHAIN_ID),
    ).rejects.toMatchObject({
      message:
        "Money Account API vault composition request failed with status '503'",
      status: 503,
    });
  });
});
