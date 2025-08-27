import { PolymarketProvider } from './PolymarketProvider';
import type { Order, OrderParams, Position } from '../types';
import { getPolymarketEndpoints } from '../utils/polymarket';

describe('PolymarketProvider', () => {
  const createProvider = (overrides?: { isTestnet?: boolean }) =>
    new PolymarketProvider({
      isTestnet: overrides?.isTestnet,
    });

  const sampleOrderParams: OrderParams = {
    providerId: 'polymarket',
    marketId: 'm1',
    outcodeId: 'o1',
    side: 'buy',
    size: 1,
  };

  const makeApiPosition = (overrides?: Partial<Position>): Position => ({
    providerId: 'external',
    conditionId: 'cond-1',
    icon: 'https://example.com/icon.png',
    title: 'Some Market',
    slug: 'some-market',
    size: 2,
    outcome: 'Yes',
    outcomeIndex: 0,
    cashPnl: 1.23,
    curPrice: 0.45,
    currentValue: 0.9,
    percentPnl: 10,
    initialValue: 0.82,
    avgPrice: 0.41,
    redeemable: false,
    negativeRisk: false,
    endDate: '2025-01-01T00:00:00Z',
    ...overrides,
  });

  it('exposes the correct providerId', () => {
    const provider = createProvider();
    expect(provider.providerId).toBe('polymarket');
  });

  it('connect resolves', async () => {
    const provider = createProvider();
    await expect(provider.connect()).resolves.toBeUndefined();
  });

  it('disconnect resolves', async () => {
    const provider = createProvider();
    await expect(provider.disconnect()).resolves.toBeUndefined();
  });

  it('getMarkets returns an array with some length', async () => {
    const provider = createProvider();
    const markets = await provider.getMarkets();
    expect(Array.isArray(markets)).toBe(true);
    expect(markets.length).toBeGreaterThan(0);
  });

  it('getPositions returns an empty array when API returns none', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        json: jest.fn().mockResolvedValue([]),
      });

    await expect(
      provider.getPositions({
        address: '0x0000000000000000000000000000000000000000',
      }),
    ).resolves.toEqual([]);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions maps providerId to polymarket on each returned position', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockResolvedValue({
        json: jest
          .fn()
          .mockResolvedValue([
            makeApiPosition({ conditionId: 'c-1', providerId: 'other' }),
            makeApiPosition({ conditionId: 'c-2' }),
          ]),
      });

    const result = await provider.getPositions({
      address: '0x0000000000000000000000000000000000000000',
    });

    expect(result).toHaveLength(2);
    expect(result[0].providerId).toBe('polymarket');
    expect(result[1].providerId).toBe('polymarket');
    expect(result[0].conditionId).toBe('c-1');
    expect(result[1].conditionId).toBe('c-2');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions uses default pagination and correct query params', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x1111111111111111111111111111111111111111';
    await provider.getPositions({ address: userAddress });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    const { DATA_API_ENDPOINT } = getPolymarketEndpoints();
    expect(calledWithUrl.startsWith(`${DATA_API_ENDPOINT}/positions?`)).toBe(
      true,
    );
    expect(calledWithUrl).toContain('limit=10');
    expect(calledWithUrl).toContain('offset=0');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions applies custom limit and offset in the request', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    const mockFetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });
    (globalThis as unknown as { fetch: jest.Mock }).fetch = mockFetch;

    const userAddress = '0x2222222222222222222222222222222222222222';
    await provider.getPositions({ address: userAddress, limit: 5, offset: 15 });

    const calledWithUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledWithUrl).toContain('limit=5');
    expect(calledWithUrl).toContain('offset=15');
    expect(calledWithUrl).toContain(`user=${userAddress}`);

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('getPositions rejects when the network request fails', async () => {
    const provider = createProvider();
    const originalFetch = globalThis.fetch as typeof fetch | undefined;
    (globalThis as unknown as { fetch: jest.Mock }).fetch = jest
      .fn()
      .mockRejectedValue(new Error('network failure'));

    await expect(
      provider.getPositions({
        address: '0x3333333333333333333333333333333333333333',
      }),
    ).rejects.toThrow('network failure');

    (globalThis as unknown as { fetch: typeof fetch | undefined }).fetch =
      originalFetch;
  });

  it('prepareOrder returns an error result and echoes params', async () => {
    const provider = createProvider();
    const order = await provider.prepareOrder(sampleOrderParams);

    expect(order.id).toBe('');
    expect(order.params).toEqual(sampleOrderParams);
    expect(order.transactions).toEqual([]);
    expect(order.isOffchainTrade).toBe(false);
    expect(order.result.status).toBe('error');
    // Current implementation uses a misspelled key; assert defensively
    expect((order.result as unknown as { message?: string }).message).toBe(
      'Not implemented',
    );
  });

  it('submitOrderTrade returns an error result by default', async () => {
    const provider = createProvider();
    const mockOrder: Order = {
      id: 'order-1',
      params: sampleOrderParams,
      result: { status: 'idle' },
      transactions: [],
      isOffchainTrade: false,
    };

    const result = await provider.submitOrderTrade(mockOrder);

    expect(result.status).toBe('error');
    // Current implementation uses a misspelled key; assert defensively
    expect((result as unknown as { message?: string }).message).toBe(
      'Not implemented',
    );
  });
});
