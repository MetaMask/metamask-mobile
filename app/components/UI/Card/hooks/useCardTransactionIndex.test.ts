import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { useSelector } from 'react-redux';
import {
  CARD_TX_INDEX_MAX_ITEMS,
  CARD_TX_INDEX_MAX_PAGES,
  classifyCardTransactionsForIndex,
  isSettledCardTransaction,
  settlementHashesForCardTransaction,
  useCardTransactionIndex,
} from './useCardTransactionIndex';
import { isMoneyAccountCardTransaction } from '../utils/moneyAccountCardTransaction';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
  type CardTransactionPage,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { MONEY_ACCOUNT_LAUNCH_MS } from '../../../../core/Engine/controllers/card-controller/types';
import {
  MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../util/vedaToken';
import Engine from '../../../../core/Engine';
import {
  selectCardActiveProviderId,
  selectCardProviderUserId,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { cardQueries } from '../queries';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const mockListTransactions = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      listTransactions: jest.fn(),
    },
  },
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
let mockIsAuthenticated = true;
let mockProviderId: string | null = 'baanx';
let mockProviderUserId: string | null = 'user-1';
let activeQueryClient: QueryClient | null = null;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  activeQueryClient = queryClient;
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const createTx = (
  overrides: Partial<CardTransaction> = {},
): CardTransaction => ({
  id: 'tx-1',
  providerId: 'baanx',
  timestamp: Date.UTC(2026, 5, 20),
  status: CardTransactionStatus.Completed,
  type: CardTransactionType.Purchase,
  isDebit: true,
  billingAmount: { value: '10.00', currency: 'USD' },
  fundingSources: [],
  ...overrides,
});

const moneyAccountFunding = {
  currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
  chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  txHash: '0xABC',
};

const buildPage = (
  items: CardTransaction[],
  nextCursor?: string,
): CardTransactionPage => ({
  items,
  nextCursor,
});

describe('useCardTransactionIndex constants', () => {
  it('exposes finite safety valves', () => {
    expect(CARD_TX_INDEX_MAX_PAGES).toBe(5);
    expect(CARD_TX_INDEX_MAX_ITEMS).toBe(300);
  });

  it('uses Money Account launch date as the hard floor', () => {
    expect(MONEY_ACCOUNT_LAUNCH_MS).toBe(Date.UTC(2026, 4, 1));
  });
});

describe('isSettledCardTransaction', () => {
  it('returns true when any funding source has a txHash', () => {
    const tx = createTx({
      fundingSources: [{ txHash: '0xABC' }],
    });

    expect(isSettledCardTransaction(tx)).toBe(true);
  });

  it('returns false when funding sources have no txHash', () => {
    const tx = createTx({
      status: CardTransactionStatus.Failed,
      fundingSources: [{ address: '0xaddr' }],
    });

    expect(isSettledCardTransaction(tx)).toBe(false);
  });

  it('classifies by hash presence, not status', () => {
    const pendingWithHash = createTx({
      status: CardTransactionStatus.Pending,
      fundingSources: [{ txHash: '0x1' }],
    });
    const completedWithoutHash = createTx({
      status: CardTransactionStatus.Completed,
      fundingSources: [],
    });

    expect(isSettledCardTransaction(pendingWithHash)).toBe(true);
    expect(isSettledCardTransaction(completedWithoutHash)).toBe(false);
  });
});

describe('settlementHashesForCardTransaction', () => {
  it('lowercases and filters missing hashes', () => {
    const tx = createTx({
      fundingSources: [
        { txHash: '0xAbCd' },
        { address: '0xnohash' },
        { txHash: '0xEF' },
      ],
    });

    expect(settlementHashesForCardTransaction(tx)).toEqual(['0xabcd', '0xef']);
  });
});

describe('isMoneyAccountCardTransaction', () => {
  it('returns true for veda funding on Monad', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          fundingSources: [
            {
              currency: MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
              chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
              txHash: '0x1',
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  it('returns false for base USDC funding', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          fundingSources: [
            {
              currency: 'usdc',
              chainId: 'eip155:8453',
              txHash: '0x1',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('returns false for monad USDC funding', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          fundingSources: [
            {
              currency: 'usdc',
              chainId: MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
              txHash: '0x1',
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  it('returns true for a VEDA decline with empty funding sources', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          status: CardTransactionStatus.Failed,
          fundingSources: [],
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 VEDA. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(true);
  });

  it('returns false for a MONAD USDC decline with empty funding sources', () => {
    expect(
      isMoneyAccountCardTransaction(
        createTx({
          status: CardTransactionStatus.Failed,
          fundingSources: [],
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 USDC. The total transaction cost was $11.95.',
          },
        }),
      ),
    ).toBe(false);
  });
});

describe('classifyCardTransactionsForIndex', () => {
  it('indexes settled txs by lowercased hash and collects declined rows', () => {
    const settled = createTx({
      id: 'settled',
      fundingSources: [{ txHash: '0xAbC' }],
    });
    const declined = createTx({
      id: 'declined',
      status: CardTransactionStatus.Failed,
      fundingSources: [],
    });

    const result = classifyCardTransactionsForIndex([settled, declined]);

    expect(result.bySettlementHash.get('0xabc')).toBe(settled);
    expect(result.declined).toEqual([declined]);
  });

  it('maps multiple funding hashes of one tx to the same entry', () => {
    const tx = createTx({
      fundingSources: [{ txHash: '0xONE' }, { txHash: '0xTWO' }],
    });

    const result = classifyCardTransactionsForIndex([tx]);

    expect(result.bySettlementHash.get('0xone')).toBe(tx);
    expect(result.bySettlementHash.get('0xtwo')).toBe(tx);
    expect(result.declined).toEqual([]);
  });
});

describe('useCardTransactionIndex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAuthenticated = true;
    mockProviderId = 'baanx';
    mockProviderUserId = 'user-1';
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectIsCardAuthenticated) {
        return mockIsAuthenticated;
      }
      if (selector === selectCardActiveProviderId) {
        return mockProviderId;
      }
      if (selector === selectCardProviderUserId) {
        return mockProviderUserId;
      }
      return undefined;
    });
    mockListTransactions.mockResolvedValue(
      buildPage([
        createTx({
          id: 'ma-settled',
          fundingSources: [moneyAccountFunding],
        }),
        createTx({
          id: 'other',
          fundingSources: [
            { currency: 'usdc', chainId: 'eip155:8453', txHash: '0xother' },
          ],
        }),
      ]),
    );
    (Engine.context.CardController.listTransactions as jest.Mock) =
      mockListTransactions;
  });

  afterEach(() => {
    if (activeQueryClient) {
      activeQueryClient.getQueryCache().clear();
      activeQueryClient.clear();
      activeQueryClient = null;
    }
  });

  it('scopes the query key by provider and user under card transactions', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSettling).toBe(false));

    expect(
      queryClient.getQueryData(
        cardQueries.transactions.keys.index('baanx', 'user-1'),
      ),
    ).toBeDefined();
    expect(cardQueries.transactions.keys.index('baanx', 'user-1')).toEqual([
      'card',
      'transactions',
      'index',
      'baanx',
      'user-1',
    ]);
  });

  it('indexes Money Account settled txs and ignores other funding', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSettling).toBe(false));

    expect(result.current.bySettlementHash.get('0xabc')?.id).toBe('ma-settled');
    expect(result.current.bySettlementHash.has('0xother')).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('auto-paginates while oldest fetched time is above the visible floor', async () => {
    const older = createTx({
      id: 'older',
      timestamp: Date.UTC(2026, 4, 10),
      fundingSources: [{ ...moneyAccountFunding, txHash: '0xolder' }],
    });
    const newer = createTx({
      id: 'newer',
      timestamp: Date.UTC(2026, 6, 1),
      fundingSources: [{ ...moneyAccountFunding, txHash: '0xnewer' }],
    });
    mockListTransactions
      .mockResolvedValueOnce(buildPage([newer], 'cursor-1'))
      .mockResolvedValueOnce(buildPage([older]));

    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () =>
        useCardTransactionIndex({
          oldestVisibleTime: Date.UTC(2026, 4, 15),
        }),
      { wrapper: Wrapper },
    );

    await waitFor(() => expect(result.current.isSettling).toBe(false));
    expect(mockListTransactions).toHaveBeenCalledTimes(2);
    expect(result.current.bySettlementHash.get('0xnewer')?.id).toBe('newer');
    expect(result.current.bySettlementHash.get('0xolder')?.id).toBe('older');
  });

  it('collects Money Account declined txs without settlement hashes', async () => {
    mockListTransactions.mockResolvedValue(
      buildPage([
        createTx({
          id: 'declined',
          status: CardTransactionStatus.Failed,
          fundingSources: [],
          declineReason: {
            message:
              'You attempted this MONAD transaction with a balance of 0.500000 VEDA. The total transaction cost was $11.95.',
          },
        }),
      ]),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSettling).toBe(false));

    expect(result.current.declined.map((tx) => tx.id)).toEqual(['declined']);
    expect(result.current.oldestFetchedTime).toBe(Date.UTC(2026, 5, 20));
  });

  it('does not fetch or expose cached index rows while unauthenticated', async () => {
    const { Wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(
      cardQueries.transactions.keys.index('baanx', 'user-1'),
      {
        pages: [
          buildPage([
            createTx({
              id: 'cached',
              fundingSources: [moneyAccountFunding],
            }),
          ]),
        ],
        pageParams: [undefined],
      },
    );
    mockIsAuthenticated = false;

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(
        queryClient.getQueryData(
          cardQueries.transactions.keys.index('baanx', 'user-1'),
        ),
      ).toBeUndefined(),
    );
    expect(mockListTransactions).not.toHaveBeenCalled();
    expect(result.current.bySettlementHash.size).toBe(0);
    expect(result.current.declined).toEqual([]);
    expect(result.current.isSettling).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('uses legacy cache user id when providerUserId is missing', async () => {
    mockProviderUserId = null;
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSettling).toBe(false));

    expect(
      queryClient.getQueryData(
        cardQueries.transactions.keys.index('baanx', 'legacy'),
      ),
    ).toBeDefined();
  });

  it('surfaces controller errors and stays unsettled only while enabled', async () => {
    mockListTransactions.mockRejectedValue(new Error('auth'));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSettling).toBe(false);
  });

  it('skips fetching when enabled is false', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCardTransactionIndex({ enabled: false }),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListTransactions).not.toHaveBeenCalled();
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isSettling).toBe(false);
  });

  it('returns negative infinity oldestFetchedTime when there are no items', async () => {
    mockListTransactions.mockResolvedValue(buildPage([]));
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useCardTransactionIndex(), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(result.current.isSettling).toBe(false));

    expect(result.current.oldestFetchedTime).toBe(Number.NEGATIVE_INFINITY);
  });
});
