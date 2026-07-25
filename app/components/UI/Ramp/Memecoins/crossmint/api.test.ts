import { createCrossmintOrder, fetchCrossmintMemecoinTokens } from './api';
import { CROSSMINT_STAGING_XMEME_LOCATOR } from './constants';

jest.mock('react-native-device-info', () => ({
  getBundleId: jest.fn(() => 'io.metamask'),
}));

jest.mock('./config', () => ({
  getCrossmintBaseUrl: jest.fn(() => 'https://staging.crossmint.com'),
  getCrossmintClientApiKey: jest.fn(() => 'ck_staging_test'),
  getCrossmintEnvironment: jest.fn(() => 'staging'),
}));

describe('crossmint api', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('fetches memecoin tokens and merges staging XMEME', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            token: 'solana:SomeOtherToken111111111111111111111111111',
            available: true,
            features: { creditCardPayment: true },
          },
        ],
      }),
    });

    const tokens = await fetchCrossmintMemecoinTokens({ chains: 'solana' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/2024-09-26/tokens?'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-API-KEY': 'ck_staging_test',
          'x-app-identifier': 'io.metamask',
        }),
      }),
    );
    expect(tokens[0].tokenLocator).toBe(CROSSMINT_STAGING_XMEME_LOCATOR);
    expect(tokens).toHaveLength(2);
  });

  it('falls back to staging XMEME when tokens API is forbidden', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    });

    const tokens = await fetchCrossmintMemecoinTokens({ chains: 'solana' });

    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenLocator).toBe(CROSSMINT_STAGING_XMEME_LOCATOR);
  });

  it('creates an order', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'secret',
        order: { orderId: 'order-1' },
      }),
    });

    const result = await createCrossmintOrder({
      tokenLocator: CROSSMINT_STAGING_XMEME_LOCATOR,
      amountUsd: '5',
      walletAddress: 'Wallet111',
    });

    expect(result.order.orderId).toBe('order-1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://staging.crossmint.com/api/2022-06-09/orders',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"mode":"exact-in"'),
      }),
    );
  });
});
