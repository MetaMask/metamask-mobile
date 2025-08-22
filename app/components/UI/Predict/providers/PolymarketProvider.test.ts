import { PolymarketProvider } from './PolymarketProvider';
import type { Order, OrderParams } from '../types';

describe('PolymarketProvider', () => {
  const createProvider = (overrides?: { isTestnet?: boolean }) =>
    new PolymarketProvider({
      // Not used yet by implementation, but provide a stable mock
      signTypedMessage: jest.fn().mockResolvedValue('0xsignature'),
      isTestnet: overrides?.isTestnet,
    });

  const sampleOrderParams: OrderParams = {
    providerId: 'polymarket',
    marketId: 'm1',
    outcodeId: 'o1',
    side: 'buy',
    size: 1,
  };

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

  it('getMarkets returns an empty array by default', async () => {
    const provider = createProvider();
    await expect(provider.getMarkets()).resolves.toEqual([]);
  });

  it('getPositions returns an empty array by default', async () => {
    const provider = createProvider();
    await expect(provider.getPositions()).resolves.toEqual([]);
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
