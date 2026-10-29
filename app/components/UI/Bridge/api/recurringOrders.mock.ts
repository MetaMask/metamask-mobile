import {
  type RecurringOrder,
  RecurringOrderState,
} from './recurringOrders.types';

export const MOCK_RECURRING_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';
export const MOCK_RECURRING_ACCOUNT =
  `eip155:1:${MOCK_RECURRING_WALLET_ADDRESS}` as const;

const ETHEREUM_ETH = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
} satisfies RecurringOrder['src']['asset'];

const ETHEREUM_USDC = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
} satisfies RecurringOrder['src']['asset'];

const BNB_CHAIN_BNB = {
  assetId: 'eip155:56/slip44:714',
  symbol: 'BNB',
  name: 'BNB',
  decimals: 18,
  iconUrl: 'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x0.png',
} satisfies RecurringOrder['src']['asset'];

const BNB_CHAIN_USDT = {
  assetId: 'eip155:56/erc20:0x55d398326f99059fF775485246999027B3197955',
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x55d398326f99059ff775485246999027b3197955.png',
} satisfies RecurringOrder['src']['asset'];

const SOURCE_AMOUNT = 1_500_000_000_000_000n;
const REPEAT_COUNT = 5;

interface CreateMockRecurringOrderOptions {
  id: string;
  state: RecurringOrder['state'];
  filledSwapsCount: number;
  createdAt: string;
  endsAt: string;
  srcAsset?: RecurringOrder['src']['asset'];
  destAsset?: RecurringOrder['dest']['asset'];
  priceRange?: RecurringOrder['priceRange'];
}

function createMockRecurringOrder({
  id,
  state,
  filledSwapsCount,
  createdAt,
  endsAt,
  srcAsset = ETHEREUM_ETH,
  destAsset = ETHEREUM_USDC,
  priceRange,
}: CreateMockRecurringOrderOptions): RecurringOrder {
  const destinationAmount = 3n * 10n ** BigInt(destAsset.decimals);

  return {
    id,
    clientOrderId: `client-${id}`,
    account: MOCK_RECURRING_ACCOUNT,
    state,
    src: {
      amount: SOURCE_AMOUNT.toString(),
      asset: srcAsset,
    },
    dest: {
      asset: destAsset,
    },
    fillData: {
      src: {
        amount: (SOURCE_AMOUNT * BigInt(filledSwapsCount)).toString(),
      },
      dest: {
        amount: (destinationAmount * BigInt(filledSwapsCount)).toString(),
      },
      count: filledSwapsCount,
      ...(filledSwapsCount > 0 ? { averageExecutionPriceUsd: '2000.00' } : {}),
    },
    schedule: {
      every: 1,
      unit: 'day',
      repeatCount: REPEAT_COUNT,
    },
    priceRange,
    slippage: 0.5,
    timingData: {
      createdAt,
      startsAt: createdAt,
      endsAt,
      expiresAt: '2027-02-28T12:00:00.000Z',
    },
  };
}

export const MOCK_RECURRING_OPEN_ORDER = createMockRecurringOrder({
  id: 'mock-recurring-order-open',
  state: RecurringOrderState.Open,
  filledSwapsCount: 2,
  createdAt: '2026-09-01T12:00:00.000Z',
  endsAt: '2026-09-05T12:00:00.000Z',
  priceRange: {
    side: 'dest',
    currency: 'USD',
    min: '1800',
    max: '2200',
  },
});

export const MOCK_RECURRING_OPEN_ORDER_2 = createMockRecurringOrder({
  id: 'mock-recurring-order-open-secondary',
  state: RecurringOrderState.Open,
  filledSwapsCount: 0,
  createdAt: '2026-09-02T12:00:00.000Z',
  endsAt: '2026-09-06T12:00:00.000Z',
  srcAsset: BNB_CHAIN_BNB,
  destAsset: BNB_CHAIN_USDT,
});

export const MOCK_RECURRING_OPEN_ORDER_3 = createMockRecurringOrder({
  id: 'mock-recurring-order-open-tertiary',
  state: RecurringOrderState.Open,
  filledSwapsCount: 3,
  createdAt: '2026-09-03T12:00:00.000Z',
  endsAt: '2026-09-07T12:00:00.000Z',
});

export const MOCK_RECURRING_COMPLETED_ORDER = createMockRecurringOrder({
  id: 'mock-recurring-order-completed',
  state: RecurringOrderState.Completed,
  filledSwapsCount: 5,
  createdAt: '2026-08-27T12:00:00.000Z',
  endsAt: '2026-08-31T12:00:00.000Z',
  priceRange: {
    side: 'src',
    currency: 'USD',
    min: '1800',
    max: '2200',
  },
});

export const MOCK_RECURRING_CANCELLED_ORDER = createMockRecurringOrder({
  id: 'mock-recurring-order-cancelled',
  state: RecurringOrderState.Cancelled,
  filledSwapsCount: 2,
  createdAt: '2026-08-26T12:00:00.000Z',
  endsAt: '2026-08-30T12:00:00.000Z',
});

export const MOCK_RECURRING_EXPIRED_ORDER = createMockRecurringOrder({
  id: 'mock-recurring-order-expired',
  state: RecurringOrderState.Expired,
  filledSwapsCount: 1,
  createdAt: '2026-08-25T12:00:00.000Z',
  endsAt: '2026-08-29T12:00:00.000Z',
});

export const MOCK_RECURRING_ORDERS: RecurringOrder[] = [
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_OPEN_ORDER_3,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_CANCELLED_ORDER,
  MOCK_RECURRING_EXPIRED_ORDER,
];
