import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';
import { mapRampsOrder } from './ramps-order';
import { rampsOrderToFiatOrder } from '../../../components/UI/Ramp/orderProcessor/unifiedOrderProcessor';
import { mapRampOrder } from './ramp-order';

const baseOrder: RampsOrder = {
  isOnlyLink: false,
  success: true,
  cryptoAmount: '5.01',
  fiatAmount: 6.27,
  providerOrderId: 'provider-order-1',
  providerOrderLink: 'https://example.com/order/1',
  createdAt: 1_700_000_000_000,
  totalFeesFiat: 1.26,
  txHash: '0xbuyhash',
  walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
  status: RampsOrderStatus.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  id: '/providers/transak/orders/provider-order-1',
  cryptoCurrency: {
    symbol: 'mUSD',
    decimals: 6,
    assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
    chainId: 'eip155:1',
  },
  fiatCurrency: { symbol: 'USD', decimals: 2 },
};

describe('mapRampsOrder', () => {
  it('maps a buy order to buy with an incoming token', () => {
    expect(mapRampsOrder({ order: baseOrder })).toEqual({
      type: 'buy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xbuyhash',
      raw: { type: 'rampOrder', data: baseOrder },
      data: {
        from: baseOrder.walletAddress,
        token: {
          amount: '5.01',
          symbol: 'mUSD',
          assetId: baseOrder.cryptoCurrency?.assetId,
          direction: 'in',
        },
      },
    });
  });

  it('keeps human-readable cryptoAmount without token decimals', () => {
    const order = {
      ...baseOrder,
      cryptoAmount: '30',
      cryptoCurrency: {
        symbol: 'mUSD',
        decimals: 6,
        assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
        chainId: 'eip155:1',
      },
    };

    expect(mapRampsOrder({ order })).toMatchObject({
      data: {
        token: {
          amount: '30',
          symbol: 'mUSD',
          assetId: 'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
          direction: 'in',
        },
      },
    });
    expect(mapRampsOrder({ order })?.data).toEqual(
      expect.objectContaining({
        token: expect.not.objectContaining({ decimals: expect.anything() }),
      }),
    );
  });

  it('maps DEPOSIT orderType to buy', () => {
    expect(
      mapRampsOrder({ order: { ...baseOrder, orderType: 'DEPOSIT' } }),
    ).toMatchObject({
      type: 'buy',
      data: { token: { direction: 'in' } },
    });
  });

  it('maps a sell order to sell with an outgoing token', () => {
    expect(
      mapRampsOrder({
        order: {
          ...baseOrder,
          orderType: 'SELL',
          cryptoAmount: '0.085',
          cryptoCurrency: { symbol: 'ETH', decimals: 18 },
        },
      }),
    ).toMatchObject({
      type: 'sell',
      hash: '0xbuyhash',
      data: {
        token: {
          amount: '0.085',
          symbol: 'ETH',
          direction: 'out',
        },
      },
    });
  });

  it.each([
    [RampsOrderStatus.Pending, 'pending'],
    [RampsOrderStatus.Created, 'pending'],
    [RampsOrderStatus.Failed, 'failed'],
    [RampsOrderStatus.Cancelled, 'cancelled'],
  ] as const)('maps %s status to %s', (status, expected) => {
    expect(mapRampsOrder({ order: { ...baseOrder, status } })?.status).toBe(
      expected,
    );
  });

  it('falls back to canonical order id when no transaction hash is available', () => {
    const order = {
      ...baseOrder,
      txHash: '',
      id: '/providers/moonpay/orders/844a3b07',
      providerOrderId: 'different-provider-id',
    };

    expect(mapRampsOrder({ order })?.hash).toBe(
      '/providers/moonpay/orders/844a3b07',
    );
  });

  it('normalizes ISO createdAt strings to epoch ms', () => {
    const order = {
      ...baseOrder,
      createdAt: '2026-06-23T20:12:39.739Z' as unknown as number,
    };

    expect(mapRampsOrder({ order })?.timestamp).toBe(
      new Date('2026-06-23T20:12:39.739Z').getTime(),
    );
  });

  it('maps decimal network string to eip155 CAIP-2', () => {
    const order = {
      ...baseOrder,
      network: '1' as unknown as RampsOrder['network'],
      cryptoCurrency: undefined,
    };

    expect(mapRampsOrder({ order })?.chainId).toBe('eip155:1');
  });

  it('falls through an unparseable network name to cryptoCurrency.chainId', () => {
    // Coinbase (and other generic providers) return network as a free-form
    // name string while still attaching a CAIP cryptoCurrency.chainId.
    // Regression: TRAM-3822 / state log v8.5.0 (6225) order …b03d98.
    const order: RampsOrder = {
      ...baseOrder,
      id: 'coinbase-m/orders/c-d599b5708a6011f197a0374abeb03d98',
      providerOrderId: 'c-d599b5708a6011f197a0374abeb03d98',
      network: 'ethereum' as unknown as RampsOrder['network'],
      txHash: '0x',
      cryptoAmount: 0.00112678,
      fiatAmount: 2,
      cryptoCurrency: {
        assetId: 'eip155:1/slip44:60',
        chainId: 'eip155:1',
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      fiatCurrency: {
        id: 'eur',
        symbol: 'EUR',
        name: 'Euro',
        decimals: 2,
      },
    };

    expect(mapRampsOrder({ order })).toMatchObject({
      type: 'buy',
      chainId: 'eip155:1',
      status: 'success',
      hash: 'coinbase-m/orders/c-d599b5708a6011f197a0374abeb03d98',
      data: {
        token: {
          amount: '0.00112678',
          symbol: 'ETH',
          assetId: 'eip155:1/slip44:60',
          direction: 'in',
        },
      },
    });
  });

  it('falls through an unparseable network name to cryptoCurrency.assetId', () => {
    const order = {
      ...baseOrder,
      network: 'ethereum' as unknown as RampsOrder['network'],
      cryptoCurrency: {
        symbol: 'ETH',
        assetId: 'eip155:1/slip44:60',
      },
    };

    expect(mapRampsOrder({ order })?.chainId).toBe('eip155:1');
  });

  it('returns null when network is an unparseable name and crypto currency has no chain', () => {
    expect(
      mapRampsOrder({
        order: {
          ...baseOrder,
          network: 'ethereum' as unknown as RampsOrder['network'],
          cryptoCurrency: undefined,
        },
      }),
    ).toBeNull();
  });

  it('treats placeholder txHash values as missing and falls back to order id', () => {
    expect(mapRampsOrder({ order: { ...baseOrder, txHash: '0x' } })?.hash).toBe(
      baseOrder.id,
    );
    expect(
      mapRampsOrder({ order: { ...baseOrder, txHash: '0x0000' } })?.hash,
    ).toBe(baseOrder.id);
  });

  it('keeps distinct placeholder-hash orders from collapsing under the same key', () => {
    const first = mapRampsOrder({
      order: {
        ...baseOrder,
        id: 'coinbase-m/orders/order-a',
        txHash: '0x',
        network: 'ethereum' as unknown as RampsOrder['network'],
      },
    });
    const second = mapRampsOrder({
      order: {
        ...baseOrder,
        id: 'coinbase-m/orders/order-b',
        txHash: '0x',
        network: 'ethereum' as unknown as RampsOrder['network'],
      },
    });

    expect(first?.hash).toBe('coinbase-m/orders/order-a');
    expect(second?.hash).toBe('coinbase-m/orders/order-b');
    expect(first?.hash).not.toBe(second?.hash);
  });

  it('maps non-EVM CAIP-2 network metadata', () => {
    const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    expect(
      mapRampsOrder({
        order: {
          ...baseOrder,
          network: { name: 'Solana', chainId: solanaChainId },
          cryptoCurrency: { symbol: 'SOL', chainId: solanaChainId },
        },
      }),
    ).toMatchObject({
      type: 'buy',
      chainId: solanaChainId,
    });
  });

  it('returns null for excluded orders', () => {
    expect(
      mapRampsOrder({
        order: { ...baseOrder, excludeFromPurchases: true },
      }),
    ).toBeNull();
  });

  it('returns null for unknown order types', () => {
    expect(
      mapRampsOrder({ order: { ...baseOrder, orderType: 'UNKNOWN' } }),
    ).toBeNull();
  });

  it('matches top-level ActivityListItem fields with the converted FiatOrder path', () => {
    const converted = mapRampOrder({
      order: rampsOrderToFiatOrder(baseOrder),
    });
    const native = mapRampsOrder({ order: baseOrder });

    expect(native).toMatchObject({
      type: converted?.type,
      chainId: converted?.chainId,
      status: converted?.status,
      hash: converted?.hash,
      data: {
        token: {
          amount:
            converted?.data && 'token' in converted.data
              ? converted.data.token?.amount
              : undefined,
          symbol:
            converted?.data && 'token' in converted.data
              ? converted.data.token?.symbol
              : undefined,
          direction:
            converted?.data && 'token' in converted.data
              ? converted.data.token?.direction
              : undefined,
        },
      },
    });
    expect(native?.raw?.type).toBe('rampOrder');
    expect(native?.raw?.data).toBe(baseOrder);
  });
});
