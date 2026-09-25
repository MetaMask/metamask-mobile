import type { BridgeAssetV2 } from '@metamask/bridge-controller';
import { type LimitOrder, LimitOrderStatus } from './types';

export const MOCK_LIMIT_ORDERS_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';

const ETHEREUM_ETH = {
  assetId: 'eip155:1/slip44:60',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  // Native assets are served under their CAIP asset id; the ERC-20 style
  // `.../tokenIcons/1/<address>.png` path 404s for them, which leaves every
  // avatar showing the symbol's initial instead of the token.
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
} satisfies BridgeAssetV2;

const ETHEREUM_USDC = {
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
} satisfies BridgeAssetV2;

const SOURCE_AMOUNT = 100_000_000_000_000_000n; // 0.1 ETH
const LIMIT_PRICE = '2200'; // 1 ETH = 2200 USDC

interface CreateMockLimitOrderOptions {
  orderId: string;
  status: LimitOrderStatus;
  createdAt: string;
  expiresAt: string;
  srcAsset?: BridgeAssetV2;
  destAsset?: BridgeAssetV2;
  filledAt?: string;
  cancelledAt?: string;
  failedAt?: string;
  failureReason?: string;
  txHash?: string;
}

function createMockLimitOrder({
  orderId,
  status,
  createdAt,
  expiresAt,
  srcAsset = ETHEREUM_ETH,
  destAsset = ETHEREUM_USDC,
  filledAt,
  cancelledAt,
  failedAt,
  failureReason,
  txHash,
}: CreateMockLimitOrderOptions): LimitOrder {
  // SOURCE_AMOUNT (0.1 ETH) at LIMIT_PRICE (2200 USDC/ETH) = 220 USDC.
  const destAmount = 220n * 10n ** BigInt(destAsset.decimals);

  return {
    orderId,
    clientOrderId: `client-${orderId}`,
    status,
    src: {
      amount: SOURCE_AMOUNT.toString(),
      asset: srcAsset,
      walletAddress: MOCK_LIMIT_ORDERS_WALLET_ADDRESS,
    },
    dest: {
      ...(status === LimitOrderStatus.Filled
        ? { amount: destAmount.toString() }
        : {}),
      asset: destAsset,
      walletAddress: MOCK_LIMIT_ORDERS_WALLET_ADDRESS,
    },
    limitPrice: LIMIT_PRICE,
    costTolerance: 2,
    createdAt,
    expiresAt,
    ...(filledAt ? { filledAt } : {}),
    ...(cancelledAt ? { cancelledAt } : {}),
    ...(failedAt ? { failedAt } : {}),
    ...(failureReason ? { failureReason } : {}),
    ...(txHash ? { txHash } : {}),
  };
}

// Still open, a few days from expiring.
export const MOCK_LIMIT_OPEN_ORDER = createMockLimitOrder({
  orderId: 'mock-limit-order-open',
  status: LimitOrderStatus.Open,
  createdAt: '2026-09-20T12:00:00.000Z',
  expiresAt: '2026-09-27T12:00:00.000Z',
});

export const MOCK_LIMIT_FILLED_ORDER = createMockLimitOrder({
  orderId: 'mock-limit-order-filled',
  status: LimitOrderStatus.Filled,
  createdAt: '2026-09-04T12:00:00.000Z',
  expiresAt: '2026-09-11T12:00:00.000Z',
  filledAt: '2026-09-04T13:00:00.000Z',
  txHash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
});

// Expired 3 days after being created.
export const MOCK_LIMIT_EXPIRED_ORDER = createMockLimitOrder({
  orderId: 'mock-limit-order-expired',
  status: LimitOrderStatus.Expired,
  createdAt: '2026-09-03T12:00:00.000Z',
  expiresAt: '2026-09-06T12:00:00.000Z',
});

export const MOCK_LIMIT_CANCELLED_ORDER = createMockLimitOrder({
  orderId: 'mock-limit-order-cancelled',
  status: LimitOrderStatus.Cancelled,
  createdAt: '2026-09-02T12:00:00.000Z',
  expiresAt: '2026-09-09T12:00:00.000Z',
  cancelledAt: '2026-09-02T13:00:00.000Z',
});

export const MOCK_LIMIT_FAILED_ORDER = createMockLimitOrder({
  orderId: 'mock-limit-order-failed',
  status: LimitOrderStatus.Failed,
  createdAt: '2026-09-01T12:00:00.000Z',
  expiresAt: '2026-09-08T12:00:00.000Z',
  failedAt: '2026-09-01T13:00:00.000Z',
  failureReason: 'execution_failed',
});

export const MOCK_LIMIT_ORDERS: LimitOrder[] = [
  MOCK_LIMIT_OPEN_ORDER,
  MOCK_LIMIT_FILLED_ORDER,
  MOCK_LIMIT_EXPIRED_ORDER,
  MOCK_LIMIT_CANCELLED_ORDER,
  MOCK_LIMIT_FAILED_ORDER,
];
