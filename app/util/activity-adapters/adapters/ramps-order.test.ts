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
          decimals: 6,
          direction: 'in',
        },
      },
    });
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
