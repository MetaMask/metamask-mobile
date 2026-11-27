import { ApiEnv } from '../../../../core/apiEnv';
import {
  fetchMoneyAccountApi,
  getMoneyAccountApiBaseUrl,
} from './moneyAccountApi';

describe('moneyAccountApi', () => {
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
  ] as const)(
    'uses the configured %s Money Account API environment',
    (apiEnv, baseUrl) => {
      process.env.MM_API_ENV = apiEnv;

      expect(getMoneyAccountApiBaseUrl()).toBe(baseUrl);
    },
  );

  it('builds the request and decodes the response', async () => {
    process.env.MM_API_ENV = ApiEnv.Prod;
    const response = { data: 'value' };
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => response,
    } as Response);

    const result = await fetchMoneyAccountApi<{ data: string }>(
      '/v1/test',
      { chain_id: 143, vault_address: '0xabc' },
      'test',
    );

    expect(result).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://money.api.cx.metamask.io/v1/test?chain_id=143&vault_address=0xabc',
    );
  });

  it('throws an error with the HTTP status for non-2xx responses', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(
      fetchMoneyAccountApi('/v1/test', {}, 'test', { includeStatus: true }),
    ).rejects.toMatchObject({
      message: "Money Account API test request failed with status '503'",
      status: 503,
    });
  });

  it('omits the HTTP status by default for legacy callers', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    try {
      await fetchMoneyAccountApi('/v1/test', {}, 'test');
      fail('Expected the request to throw');
    } catch (error) {
      expect(error).toMatchObject({
        message: "Money Account API test request failed with status '503'",
      });
      expect(error).not.toHaveProperty('status');
    }
  });
});
