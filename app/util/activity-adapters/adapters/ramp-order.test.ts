import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../constants/on-ramp';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { DepositOrderType } from '../../../components/UI/Ramp/types/legacyDeposit';
import type { FiatOrder } from '../../../reducers/fiatOrders/types';
import { mapRampOrder } from './ramp-order';

const baseOrder: FiatOrder = {
  id: 'order-1',
  provider: FIAT_ORDER_PROVIDERS.RAMPS_V2,
  createdAt: 1_700_000_000_000,
  amount: '6.27',
  fee: '1.26',
  cryptoAmount: '5.01',
  currency: 'USD',
  cryptocurrency: 'mUSD',
  state: FIAT_ORDER_STATES.COMPLETED,
  account: '0x1234567890abcdef1234567890abcdef12345678',
  network: '1',
  txHash: '0xbuyhash',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  data: {},
} as FiatOrder;

describe('mapRampOrder', () => {
  it('maps a buy order to buy with an incoming token', () => {
    expect(mapRampOrder({ order: baseOrder })).toEqual({
      type: 'buy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1_700_000_000_000,
      hash: '0xbuyhash',
      raw: { type: 'rampOrder', data: baseOrder },
      data: {
        from: baseOrder.account,
        token: {
          amount: '5.01',
          symbol: 'mUSD',
          direction: 'in',
        },
      },
    });
  });

  it('maps a sell order to sell using sellTxHash and outgoing token', () => {
    const order = {
      ...baseOrder,
      id: 'sell-order',
      orderType: OrderOrderTypeEnum.Sell,
      cryptoAmount: '0.085',
      cryptocurrency: 'ETH',
      txHash: undefined,
      sellTxHash: '0xsellhash',
    };

    expect(mapRampOrder({ order })).toMatchObject({
      type: 'sell',
      hash: '0xsellhash',
      data: {
        token: {
          amount: '0.085',
          symbol: 'ETH',
          direction: 'out',
        },
      },
    });
  });

  it('maps deposit orders to buy', () => {
    const order = {
      ...baseOrder,
      orderType: DepositOrderType.Deposit,
    };

    expect(mapRampOrder({ order })).toMatchObject({
      type: 'buy',
      data: { token: { direction: 'in' } },
    });
  });

  it.each([
    [FIAT_ORDER_STATES.PENDING, 'pending'],
    [FIAT_ORDER_STATES.CREATED, 'pending'],
    [FIAT_ORDER_STATES.FAILED, 'failed'],
    [FIAT_ORDER_STATES.CANCELLED, 'cancelled'],
  ] as const)('maps %s status to %s', (state, status) => {
    expect(mapRampOrder({ order: { ...baseOrder, state } })?.status).toBe(
      status,
    );
  });

  it('falls back to order id when no transaction hash is available', () => {
    const order = { ...baseOrder, txHash: undefined };

    expect(mapRampOrder({ order })?.hash).toBe('order-1');
  });

  it('falls back to order id when txHash is a placeholder dummy value', () => {
    const order = { ...baseOrder, txHash: 'DUMMY_TX_ID' };

    expect(mapRampOrder({ order })?.hash).toBe('order-1');
  });

  it('returns null for excluded orders', () => {
    expect(
      mapRampOrder({
        order: { ...baseOrder, excludeFromPurchases: true },
      }),
    ).toBeNull();
  });

  it('returns null for unknown networks', () => {
    expect(
      mapRampOrder({ order: { ...baseOrder, network: 'not-a-chain' } }),
    ).toBeNull();
  });

  it('maps orders with a non-EVM CAIP-2 network', () => {
    const solanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

    expect(
      mapRampOrder({
        order: { ...baseOrder, network: solanaChainId, cryptocurrency: 'SOL' },
      }),
    ).toMatchObject({
      type: 'buy',
      chainId: solanaChainId,
    });
  });

  it('maps orders with an eip155 CAIP-2 network', () => {
    expect(
      mapRampOrder({ order: { ...baseOrder, network: 'eip155:137' } }),
    ).toMatchObject({
      type: 'buy',
      chainId: 'eip155:137',
    });
  });
});
