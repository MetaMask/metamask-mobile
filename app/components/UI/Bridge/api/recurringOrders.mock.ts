import {
  type PrepareRecurringDelegationQuery,
  type PrepareRecurringDelegationResponse,
  type RecurringOrder,
  RecurringOrderState,
} from './recurringOrders.types';
import {
  isCaipAccountId,
  KnownCaipNamespace,
  parseCaipAccountId,
  parseCaipAssetType,
  toCaipAccountId,
} from '@metamask/utils';

export const MOCK_RECURRING_WALLET_ADDRESS =
  '0x1234567890123456789012345678901234567890';
export const MOCK_RECURRING_ACCOUNT = toCaipAccountId(
  KnownCaipNamespace.Eip155,
  '1',
  MOCK_RECURRING_WALLET_ADDRESS,
);
export const MOCK_RECURRING_PROFILE_ID = 'f2a1c0de-0000-4000-8000-000000000001';

export function createMockPrepareRecurringDelegationResponse(
  query: PrepareRecurringDelegationQuery,
): PrepareRecurringDelegationResponse {
  if (!isCaipAccountId(query.accountAddress)) {
    throw new Error('Mock recurring account must be a CAIP account ID');
  }

  const { chainId, chain } = parseCaipAssetType(query.srcAssetId);
  const { address } = parseCaipAccountId(query.accountAddress);
  const delegationManager = '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3';
  const delegate = '0x0000000000000000000000000000000000000a11';

  return {
    chainId,
    delegationManager,
    swapRouter: '0x962287c9d5B8a682389E61edAE90ec882325d08b',
    approvalRequired: false,
    order: {
      ...query,
      expiresAt: 1800000000,
    },
    delegations: [
      {
        purpose: 'swap',
        delegation: {
          delegate,
          delegator: address,
          authority:
            '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          caveats: [],
          salt: '0x6572bcee6cc79e0b70128c9dd1f65f0075ebcac9b8aa38e8b6af0fa4757f2050',
          signature: '0x',
        },
        typedData: {
          domain: {
            name: 'DelegationManager',
            version: '1',
            chainId: Number(chain.reference),
            verifyingContract: delegationManager,
          },
          primaryType: 'Delegation',
          types: {
            Delegation: [{ name: 'delegate', type: 'address' }],
          },
          message: { delegate },
        },
      },
    ],
  };
}

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
  hasAttemptIssue?: boolean;
  accountAddress?: RecurringOrder['accountAddress'];
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
  hasAttemptIssue = false,
  accountAddress = MOCK_RECURRING_ACCOUNT,
}: CreateMockRecurringOrderOptions): RecurringOrder {
  const destinationAmount = 3n * 10n ** BigInt(destAsset.decimals);

  return {
    id,
    clientOrderId: `client-${id}`,
    profileId: MOCK_RECURRING_PROFILE_ID,
    accountAddress,
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
    hasAttemptIssue,
    timingData: {
      createdAt,
      endsAt,
      expiresAt: '2027-02-28T12:00:00.000Z',
      ...(filledSwapsCount > 0 ? { startedAt: createdAt } : {}),
      ...(state === RecurringOrderState.Open ? {} : { closedAt: endsAt }),
    },
    isCancellable: state === RecurringOrderState.Open,
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
    currency: 'usd',
    min: '1800',
    max: '2200',
  },
  hasAttemptIssue: true,
});

export const MOCK_RECURRING_PREPARE_QUERY: PrepareRecurringDelegationQuery = {
  clientOrderId: '26b0d825-79da-45a9-ab7d-1397a091b80e',
  accountAddress: MOCK_RECURRING_ACCOUNT,
  srcAssetId: MOCK_RECURRING_OPEN_ORDER.src.asset.assetId,
  srcAmount: MOCK_RECURRING_OPEN_ORDER.src.amount,
  destAssetId: MOCK_RECURRING_OPEN_ORDER.dest.asset.assetId,
  slippage: 0.5,
  every: 2,
  unit: 'day',
  repeatCount: 4,
};

export const MOCK_RECURRING_OPEN_ORDER_2 = createMockRecurringOrder({
  id: 'mock-recurring-order-open-secondary',
  state: RecurringOrderState.Open,
  filledSwapsCount: 0,
  createdAt: '2026-09-02T12:00:00.000Z',
  endsAt: '2026-09-06T12:00:00.000Z',
  srcAsset: BNB_CHAIN_BNB,
  destAsset: BNB_CHAIN_USDT,
  accountAddress: toCaipAccountId(
    KnownCaipNamespace.Eip155,
    '56',
    MOCK_RECURRING_WALLET_ADDRESS,
  ),
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
    currency: 'usd',
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
