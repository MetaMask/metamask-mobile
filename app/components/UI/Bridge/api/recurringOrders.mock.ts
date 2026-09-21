import type { BridgeAssetV2 } from '@metamask/bridge-controller';
import {
  type RecurringOrder,
  RecurringOrderStatus,
} from './recurringOrders.types';

export const MOCK_RECURRING_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';

const ETHEREUM_ETH = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  iconUrl: 'https://static.cx.metamask.io/api/v1/tokenIcons/1/0x0.png',
} satisfies BridgeAssetV2;

const ETHEREUM_USDC = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
} satisfies BridgeAssetV2;

const BNB_CHAIN_BNB = {
  assetId: 'eip155:56/slip44:714',
  symbol: 'BNB',
  name: 'BNB',
  decimals: 18,
  iconUrl: 'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x0.png',
} satisfies BridgeAssetV2;

const BNB_CHAIN_USDT = {
  assetId: 'eip155:56/erc20:0x55d398326f99059fF775485246999027B3197955',
  symbol: 'USDT',
  name: 'Tether USD',
  decimals: 18,
  iconUrl:
    'https://static.cx.metamask.io/api/v1/tokenIcons/56/0x55d398326f99059ff775485246999027b3197955.png',
} satisfies BridgeAssetV2;

const SOURCE_AMOUNT = 1_500_000_000_000_000n;
const REPEAT_COUNT = 5;

interface CreateMockRecurringOrderOptions {
  orderId: string;
  status: RecurringOrderStatus;
  filledSwapsCount: number;
  createdAt: string;
  endsAt: string;
  srcAsset?: BridgeAssetV2;
  destAsset?: BridgeAssetV2;
  priceRange?: RecurringOrder['priceRange'];
}

function createMockRecurringOrder({
  orderId,
  status,
  filledSwapsCount,
  createdAt,
  endsAt,
  srcAsset = ETHEREUM_ETH,
  destAsset = ETHEREUM_USDC,
  priceRange,
}: CreateMockRecurringOrderOptions): RecurringOrder {
  const destinationAmount = 3n * 10n ** BigInt(destAsset.decimals);

  return {
    orderId,
    status,
    src: {
      amount: SOURCE_AMOUNT.toString(),
      asset: srcAsset,
      walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
    },
    dest: {
      asset: destAsset,
      walletAddress: MOCK_RECURRING_WALLET_ADDRESS,
    },
    srcFilled: {
      amount: (SOURCE_AMOUNT * BigInt(filledSwapsCount)).toString(),
    },
    destFilled: {
      amount: (destinationAmount * BigInt(filledSwapsCount)).toString(),
    },
    srcTotal: {
      amount: (SOURCE_AMOUNT * BigInt(REPEAT_COUNT)).toString(),
    },
    filledSwapsCount,
    schedule: {
      every: 1,
      unit: 'day',
      repeatCount: REPEAT_COUNT,
    },
    priceRange,
    slippage: 0.5,
    gasIncluded: false,
    gasIncluded7702: true,
    createdAt,
    startsAt: createdAt,
    endsAt,
    expiresAt: '2027-02-28T12:00:00.000Z',
    ...(filledSwapsCount > 0 ? { averageExecutionPriceUsd: '2000.00' } : {}),
  };
}

export const MOCK_RECURRING_OPEN_ORDER = createMockRecurringOrder({
  orderId: 'mock-recurring-order-open',
  status: RecurringOrderStatus.Open,
  filledSwapsCount: 2,
  createdAt: '2026-09-01T12:00:00.000Z',
  endsAt: '2026-09-05T12:00:00.000Z',
  priceRange: {
    tokenSide: 'dest',
    currency: 'USD',
    min: '1800',
    max: '2200',
  },
});

export const MOCK_RECURRING_OPEN_ORDER_2 = createMockRecurringOrder({
  orderId: 'mock-recurring-order-open-secondary',
  status: RecurringOrderStatus.Open,
  filledSwapsCount: 0,
  createdAt: '2026-09-02T12:00:00.000Z',
  endsAt: '2026-09-06T12:00:00.000Z',
  srcAsset: BNB_CHAIN_BNB,
  destAsset: BNB_CHAIN_USDT,
});

export const MOCK_RECURRING_OPEN_ORDER_3 = createMockRecurringOrder({
  orderId: 'mock-recurring-order-open-tertiary',
  status: RecurringOrderStatus.Open,
  filledSwapsCount: 3,
  createdAt: '2026-09-03T12:00:00.000Z',
  endsAt: '2026-09-07T12:00:00.000Z',
});

export const MOCK_RECURRING_COMPLETED_ORDER = createMockRecurringOrder({
  orderId: 'mock-recurring-order-completed',
  status: RecurringOrderStatus.Completed,
  filledSwapsCount: 5,
  createdAt: '2026-08-27T12:00:00.000Z',
  endsAt: '2026-08-31T12:00:00.000Z',
});

export const MOCK_RECURRING_CANCELLED_ORDER = createMockRecurringOrder({
  orderId: 'mock-recurring-order-cancelled',
  status: RecurringOrderStatus.Cancelled,
  filledSwapsCount: 2,
  createdAt: '2026-08-26T12:00:00.000Z',
  endsAt: '2026-08-30T12:00:00.000Z',
});

export const MOCK_RECURRING_ORDERS: RecurringOrder[] = [
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_OPEN_ORDER_2,
  MOCK_RECURRING_OPEN_ORDER_3,
  MOCK_RECURRING_COMPLETED_ORDER,
  MOCK_RECURRING_CANCELLED_ORDER,
];
