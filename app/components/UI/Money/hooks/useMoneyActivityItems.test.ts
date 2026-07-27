import { renderHook } from '@testing-library/react-native';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  mergeMoneyActivity,
  buildMoneyActivityBuckets,
  useMoneyActivityItems,
  AUTO_FILL_MAX_PAGES,
} from './useMoneyActivityItems';
import { MoneyActivityFilter } from '../constants/mockActivityData';
import type { AccountsApiActivity } from '../types/moneyActivity';
import { useMoneyAccountTransactions } from './useMoneyAccountTransactions';
import { useMoneyAccountApiActivity } from './useMoneyAccountApiActivity';

jest.mock('./useMoneyAccountTransactions');
jest.mock('./useMoneyAccountApiActivity');

const mockUseMoneyAccountTransactions = jest.mocked(
  useMoneyAccountTransactions,
);
const mockUseMoneyAccountApiActivity = jest.mocked(useMoneyAccountApiActivity);

const onchainTx = (id: string, time: number, hash?: Hex): TransactionMeta =>
  ({ id, time, hash }) as TransactionMeta;

const cardTx = (hash: Hex, time: number): AccountsApiActivity => ({
  kind: 'card',
  hash,
  time,
  chainId: '0x8f',
  token: { address: '0xusdc' as Hex, symbol: 'USDC', decimals: 6 },
  amount: '1000000',
  paidTo: '0xsettlement' as Hex,
});

const cashbackTx = (hash: Hex, time: number): AccountsApiActivity => ({
  kind: 'cashback',
  hash,
  time,
  chainId: '0x8f',
  token: { address: '0xmusd' as Hex, symbol: 'mUSD', decimals: 6 },
  amount: '300000',
  receivedFrom: '0xrewarder' as Hex,
});

const refundTx = (hash: Hex, time: number): AccountsApiActivity => ({
  kind: 'refund',
  hash,
  time,
  chainId: '0x8f',
  token: { address: '0xmusd' as Hex, symbol: 'mUSD', decimals: 6 },
  amount: '10000000',
  receivedFrom: '0xsettlement' as Hex,
});

describe('mergeMoneyActivity', () => {
  it('merges both sources, tags by source, and sorts time-descending', () => {
    const onchain = [onchainTx('a', 100), onchainTx('b', 300)];
    const api = [cardTx('0xcard' as Hex, 200)];

    const items = mergeMoneyActivity(onchain, api);

    expect(items.map((i) => [i.kind, i.id, i.time])).toEqual([
      ['onchain', 'b', 300],
      ['accountsApi', '0xcard', 200],
      ['onchain', 'a', 100],
    ]);
  });

  it('drops an on-chain row that collides with an API hash (double-count guard)', () => {
    const shared = '0xAbC123' as Hex;
    const onchain = [onchainTx('dup', 100, shared)];
    const api = [cardTx('0xabc123' as Hex, 100)];

    const items = mergeMoneyActivity(onchain, api);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'accountsApi', id: '0xabc123' });
  });

  it('returns an empty list when both sources are empty', () => {
    expect(mergeMoneyActivity([], [])).toEqual([]);
  });

  it('orders rows sharing a timestamp deterministically by id', () => {
    // A spend and its cashback can settle in the same second; the tie must
    // resolve the same way regardless of input order.
    const onchain = [onchainTx('zzz', 100)];
    const api = [cardTx('0xccc' as Hex, 100), cashbackTx('0xaaa' as Hex, 100)];

    const forward = mergeMoneyActivity(onchain, api).map((i) => i.id);
    const reversed = mergeMoneyActivity([...onchain], [...api].reverse()).map(
      (i) => i.id,
    );

    expect(forward).toEqual(['0xaaa', '0xccc', 'zzz']);
    expect(reversed).toEqual(forward);
  });
});

describe('buildMoneyActivityBuckets', () => {
  const onchain = {
    all: [onchainTx('all', 50)],
    deposits: [onchainTx('dep', 40)],
    transfers: [onchainTx('xfer', 30)],
  };
  const card = cardTx('0xcard' as Hex, 200);
  const cashback = cashbackTx('0xback' as Hex, 300);
  const refund = refundTx('0xrefund' as Hex, 250);

  it('routes card spends to Transfers and cashback to Deposits; both into All', () => {
    const buckets = buildMoneyActivityBuckets(onchain, [card, cashback]);

    const ids = (filter: MoneyActivityFilter) =>
      buckets[filter].map((i) => i.id);

    // All contains both API rows.
    expect(ids(MoneyActivityFilter.All)).toEqual(
      expect.arrayContaining(['0xback', '0xcard', 'all']),
    );
    // Deposits: cashback inflow, not the card spend.
    expect(ids(MoneyActivityFilter.Deposits)).toContain('0xback');
    expect(ids(MoneyActivityFilter.Deposits)).not.toContain('0xcard');
    // Transfers: card outflow, not the cashback.
    expect(ids(MoneyActivityFilter.Transfers)).toContain('0xcard');
    expect(ids(MoneyActivityFilter.Transfers)).not.toContain('0xback');
  });

  it('groups all card activity (spend, cashback, refund) into Purchases without on-chain rows', () => {
    const buckets = buildMoneyActivityBuckets(onchain, [
      card,
      cashback,
      refund,
    ]);

    const ids = (filter: MoneyActivityFilter) =>
      buckets[filter].map((i) => i.id);

    // Purchases: every card-related row, time-descending, and no on-chain rows.
    expect(ids(MoneyActivityFilter.Purchases)).toEqual([
      '0xback',
      '0xrefund',
      '0xcard',
    ]);
    // Refund flows into All but leaves Deposits/Sends untouched (additive).
    expect(ids(MoneyActivityFilter.All)).toContain('0xrefund');
    expect(ids(MoneyActivityFilter.Deposits)).not.toContain('0xrefund');
    expect(ids(MoneyActivityFilter.Transfers)).not.toContain('0xrefund');
  });

  it('keeps each bucket time-descending', () => {
    const buckets = buildMoneyActivityBuckets(onchain, [card, cashback]);
    const times = buckets[MoneyActivityFilter.All].map((i) => i.time);
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('withholds rows older than the watermark from every bucket', () => {
    // Watermark at 100: the on-chain rows (50/40/30) are below it and may have
    // un-fetched API rows above them, so they must not render yet.
    const buckets = buildMoneyActivityBuckets(onchain, [card, cashback], 100);

    expect(buckets[MoneyActivityFilter.All].map((i) => i.id)).toEqual([
      '0xback',
      '0xcard',
    ]);
    expect(buckets[MoneyActivityFilter.Deposits].map((i) => i.id)).toEqual([
      '0xback',
    ]);
    expect(buckets[MoneyActivityFilter.Transfers].map((i) => i.id)).toEqual([
      '0xcard',
    ]);
  });

  it('withholds rows at exactly the watermark (second-resolution ties)', () => {
    // The card row sits exactly on the watermark (200). The next un-fetched
    // page can open with rows at the same timestamp whose id tiebreak would
    // sort them above this one, so it must not render yet — from any bucket,
    // including the API-only Purchases tab.
    const buckets = buildMoneyActivityBuckets(onchain, [card, cashback], 200);

    expect(buckets[MoneyActivityFilter.All].map((i) => i.id)).toEqual([
      '0xback',
    ]);
    expect(buckets[MoneyActivityFilter.Purchases].map((i) => i.id)).toEqual([
      '0xback',
    ]);
  });

  it('shows everything when the watermark is -Infinity (fully loaded)', () => {
    const buckets = buildMoneyActivityBuckets(
      onchain,
      [card, cashback],
      Number.NEGATIVE_INFINITY,
    );
    expect(buckets[MoneyActivityFilter.All]).toHaveLength(3);
  });
});

describe('useMoneyActivityItems', () => {
  const txResult = (
    overrides: Partial<ReturnType<typeof useMoneyAccountTransactions>> = {},
  ) =>
    ({
      allTransactions: [],
      deposits: [],
      transfers: [],
      submittedTransactions: [],
      moneyAddress: '0xmoney',
      mockDataEnabled: false,
      ...overrides,
    }) as ReturnType<typeof useMoneyAccountTransactions>;

  const apiResult = (
    overrides: Partial<ReturnType<typeof useMoneyAccountApiActivity>> = {},
  ) =>
    ({
      activity: [],
      watermark: Number.NEGATIVE_INFINITY,
      isComplete: true,
      pageCount: 1,
      hasMore: false,
      loadMore: jest.fn(),
      isLoadingMore: false,
      isLoading: false,
      error: false,
      refetch: jest.fn(),
      ...overrides,
    }) as ReturnType<typeof useMoneyAccountApiActivity>;

  const fillAll = (count: number) => ({
    fill: { bucket: MoneyActivityFilter.All, count },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountTransactions.mockReturnValue(txResult());
    mockUseMoneyAccountApiActivity.mockReturnValue(apiResult());
  });

  it('gates buckets by the watermark from the API hook', () => {
    mockUseMoneyAccountTransactions.mockReturnValue(
      txResult({ allTransactions: [onchainTx('old', 50)] }),
    );
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [cardTx('0xnew' as Hex, 200)],
        watermark: 100,
        isComplete: false,
        hasMore: true,
      }),
    );

    const { result } = renderHook(() => useMoneyActivityItems());

    // The old on-chain row (50) is below the watermark and withheld.
    expect(
      result.current.buckets[MoneyActivityFilter.All].map((i) => i.id),
    ).toEqual(['0xnew']);
    expect(result.current.hasMore).toBe(true);
  });

  it('fetches more pages until the fill bucket reaches its count', () => {
    const loadMore = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [cardTx('0xa' as Hex, 200)],
        watermark: Number.NEGATIVE_INFINITY,
        isComplete: false,
        hasMore: true,
        loadMore,
      }),
    );

    renderHook(() => useMoneyActivityItems(fillAll(5)));

    // Only one safe row but five wanted and more pages remain → fetch more.
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('fills the target bucket, not All: an empty Deposits tab keeps fetching', () => {
    // Card rows land in All/Transfers/Purchases but not Deposits, so a fill
    // targeting Deposits must keep paging even though All has rows.
    const loadMore = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [cardTx('0xa' as Hex, 200)],
        isComplete: false,
        hasMore: true,
        loadMore,
      }),
    );

    const { result } = renderHook(() =>
      useMoneyActivityItems({
        fill: { bucket: MoneyActivityFilter.Deposits, count: 5 },
      }),
    );

    expect(loadMore).toHaveBeenCalledTimes(1);
    // And the empty target bucket reports as settling while it fetches.
    expect(result.current.isSettling).toBe(true);
  });

  it('does not over-fetch once the fill bucket already meets its count', () => {
    const loadMore = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [
          cardTx('0xa' as Hex, 205),
          cardTx('0xb' as Hex, 204),
          cardTx('0xc' as Hex, 203),
        ],
        isComplete: false,
        hasMore: true,
        loadMore,
      }),
    );

    renderHook(() => useMoneyActivityItems(fillAll(2)));

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('keeps fetching while the list is empty and the page budget remains', () => {
    const loadMore = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [],
        isComplete: false,
        hasMore: true,
        pageCount: AUTO_FILL_MAX_PAGES - 1,
        loadMore,
      }),
    );

    renderHook(() => useMoneyActivityItems(fillAll(5)));

    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('stops auto-filling once the page budget is spent, and settles', () => {
    // A card-less account with a long raw history parses every page to zero
    // rows; the budget keeps that from sweeping the entire history.
    const loadMore = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [],
        isComplete: false,
        hasMore: true,
        pageCount: AUTO_FILL_MAX_PAGES,
        loadMore,
      }),
    );

    const { result } = renderHook(() => useMoneyActivityItems(fillAll(5)));

    expect(loadMore).not.toHaveBeenCalled();
    // With the fill stopped, an empty list must settle (no eternal skeleton).
    expect(result.current.isSettling).toBe(false);
  });

  it('never auto-fetches while a page is already in flight', () => {
    const loadMore = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        hasMore: true,
        isLoadingMore: true,
        isComplete: false,
        loadMore,
      }),
    );

    renderHook(() => useMoneyActivityItems(fillAll(5)));

    expect(loadMore).not.toHaveBeenCalled();
  });

  it('reports isSettling while an empty list may still gain rows, and settles once it cannot', () => {
    // Empty + auto-fill still fetching → settling.
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [],
        isComplete: false,
        hasMore: true,
        pageCount: 1,
      }),
    );
    const { result: filling } = renderHook(() =>
      useMoneyActivityItems(fillAll(5)),
    );
    expect(filling.current.isSettling).toBe(true);

    // A row on screen → settled even though more pages remain.
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        activity: [cardTx('0xa' as Hex, 200)],
        isComplete: false,
        hasMore: true,
        pageCount: 1,
      }),
    );
    const { result: withRow } = renderHook(() =>
      useMoneyActivityItems(fillAll(5)),
    );
    expect(withRow.current.isSettling).toBe(false);

    // Exhausted and empty → settled (genuinely no activity).
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({ activity: [], isComplete: true, hasMore: false }),
    );
    const { result: exhausted } = renderHook(() =>
      useMoneyActivityItems(fillAll(5)),
    );
    expect(exhausted.current.isSettling).toBe(false);
  });

  it('reports isSettling during the initial load', () => {
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({ isLoading: true, isComplete: false, pageCount: 0 }),
    );

    const { result } = renderHook(() => useMoneyActivityItems());

    expect(result.current.isSettling).toBe(true);
  });

  it('passes through error and refetch from the API hook', () => {
    const refetch = jest.fn();
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({ error: true, refetch }),
    );

    const { result } = renderHook(() => useMoneyActivityItems());

    expect(result.current.error).toBe(true);
    result.current.refetch();
    expect(refetch).toHaveBeenCalled();
  });

  it('masks the API error in mock mode', () => {
    mockUseMoneyAccountTransactions.mockReturnValue(
      txResult({ mockDataEnabled: true }),
    );
    mockUseMoneyAccountApiActivity.mockReturnValue(apiResult({ error: true }));

    const { result } = renderHook(() => useMoneyActivityItems());

    expect(result.current.error).toBe(false);
    expect(result.current.isSettling).toBe(false);
  });

  it('treats mock mode as exhaustive: no watermark gating, no pagination', () => {
    const loadMore = jest.fn();
    mockUseMoneyAccountTransactions.mockReturnValue(
      txResult({ mockDataEnabled: true }),
    );
    mockUseMoneyAccountApiActivity.mockReturnValue(
      apiResult({
        watermark: 100,
        hasMore: true,
        isComplete: false,
        loadMore,
      }),
    );

    const { result } = renderHook(() => useMoneyActivityItems(fillAll(5)));

    expect(result.current.mockDataEnabled).toBe(true);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.isLoadingMore).toBe(false);
    expect(loadMore).not.toHaveBeenCalled();
  });
});
