import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
import type { LimitOrderAsset } from '../create/schema';
import { type LimitOrder, LimitOrderState } from './types';

const MOCK_LIMIT_ORDERS_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';

const ETHEREUM_ETH = {
  chainId: 1,
  assetId: 'eip155:1/slip44:60',
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  // Native assets are served under their CAIP asset id; the ERC-20 style
  // `.../tokenIcons/1/<address>.png` path 404s for them, which leaves every
  // avatar showing the symbol's initial instead of the token.
  iconUrl:
    'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
} satisfies LimitOrderAsset;

const ETHEREUM_USDC = {
  chainId: 1,
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  iconUrl:
    'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
} satisfies LimitOrderAsset;

const SOURCE_AMOUNT = 100_000_000_000_000_000n; // 0.1 ETH
const LIMIT_PRICE = '2200'; // 1 ETH = 2200 USDC

interface CreateMockLimitOrderOptions {
  id: string;
  state: LimitOrderState;
  createdAt: string;
  expiresAt: string;
  closedAt?: string;
  failureReason?: string;
}

function createMockLimitOrder({
  id,
  state,
  createdAt,
  expiresAt,
  closedAt,
  failureReason,
}: CreateMockLimitOrderOptions): LimitOrder {
  // SOURCE_AMOUNT (0.1 ETH) at LIMIT_PRICE (2200 USDC/ETH) = 220 USDC.
  const destAmount = (220n * 10n ** BigInt(ETHEREUM_USDC.decimals)).toString();

  return {
    id,
    clientOrderId: `client-${id}`,
    profileId: 'f2a1c0de-0000-4000-8000-000000000001',
    account: toCaipAccountId(
      KnownCaipNamespace.Eip155,
      '1',
      MOCK_LIMIT_ORDERS_WALLET_ADDRESS,
    ),
    src: { asset: ETHEREUM_ETH, amount: SOURCE_AMOUNT.toString() },
    // A booked order commits to its floor, so `amount` and `minAmount` match.
    dest: { asset: ETHEREUM_USDC, amount: destAmount, minAmount: destAmount },
    trigger: { kind: 'ratio', threshold: 'above', price: LIMIT_PRICE },
    state,
    timingData: { createdAt, expiresAt, ...(closedAt ? { closedAt } : {}) },
    isCancellable: state === LimitOrderState.Open,
    ...(failureReason ? { failureReason } : {}),
  };
}

// Still open, a few days from expiring.
export const MOCK_LIMIT_OPEN_ORDER = createMockLimitOrder({
  id: 'mock-limit-order-open',
  state: LimitOrderState.Open,
  createdAt: '2026-09-20T12:00:00.000Z',
  expiresAt: '2026-09-27T12:00:00.000Z',
});

export const MOCK_LIMIT_FILLED_ORDER = createMockLimitOrder({
  id: 'mock-limit-order-filled',
  state: LimitOrderState.Filled,
  createdAt: '2026-09-04T12:00:00.000Z',
  expiresAt: '2026-09-11T12:00:00.000Z',
  closedAt: '2026-09-04T13:00:00.000Z',
});

// Expired 3 days after being created.
export const MOCK_LIMIT_EXPIRED_ORDER = createMockLimitOrder({
  id: 'mock-limit-order-expired',
  state: LimitOrderState.Expired,
  createdAt: '2026-09-03T12:00:00.000Z',
  expiresAt: '2026-09-06T12:00:00.000Z',
  closedAt: '2026-09-06T12:00:00.000Z',
});

export const MOCK_LIMIT_CANCELLED_ORDER = createMockLimitOrder({
  id: 'mock-limit-order-cancelled',
  state: LimitOrderState.Cancelled,
  createdAt: '2026-09-02T12:00:00.000Z',
  expiresAt: '2026-09-09T12:00:00.000Z',
  closedAt: '2026-09-02T13:00:00.000Z',
});

export const MOCK_LIMIT_FAILED_ORDER = createMockLimitOrder({
  id: 'mock-limit-order-failed',
  state: LimitOrderState.Failed,
  createdAt: '2026-09-01T12:00:00.000Z',
  expiresAt: '2026-09-08T12:00:00.000Z',
  closedAt: '2026-09-01T13:00:00.000Z',
  failureReason: 'QUOTE_UNAVAILABLE',
});
