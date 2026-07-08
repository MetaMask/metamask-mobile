import type { ActivityKind } from '../../../util/activity-adapters';
import {
  ACTIVITY_TYPE_FILTER_KINDS,
  ActivityTypeFilter,
  PERPS_ACTIVITY_FILTER_KINDS,
  PERPS_ACTIVITY_FILTER_ORDER,
  PerpsActivityFilter,
  activityKindMatchesTypeFilter,
  getPerpsSubFilterKinds,
  resolveInitialActivityTypeFilter,
} from './types';

describe('Perps sub-filter buckets', () => {
  it('defaults to Trades first in the sheet order', () => {
    expect(PERPS_ACTIVITY_FILTER_ORDER[0]).toBe(PerpsActivityFilter.Trades);
    expect(PERPS_ACTIVITY_FILTER_ORDER).toEqual([
      PerpsActivityFilter.Trades,
      PerpsActivityFilter.Order,
      PerpsActivityFilter.Fundings,
      PerpsActivityFilter.Deposits,
    ]);
  });

  it('derives the top-level Perps bucket from the union of the sub-buckets', () => {
    const union = new Set<ActivityKind>();
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      for (const kind of PERPS_ACTIVITY_FILTER_KINDS[filter]) {
        union.add(kind);
      }
    }

    const perpsBucket = ACTIVITY_TYPE_FILTER_KINDS[ActivityTypeFilter.Perps];
    expect(perpsBucket).not.toBeNull();
    expect([...(perpsBucket ?? [])].sort()).toEqual([...union].sort());
  });

  it('assigns each Perps kind to exactly one sub-filter (disjoint buckets)', () => {
    const seen = new Set<ActivityKind>();
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      for (const kind of PERPS_ACTIVITY_FILTER_KINDS[filter]) {
        expect(seen.has(kind)).toBe(false);
        seen.add(kind);
      }
    }
  });

  it('groups withdrawals with deposits under Deposits', () => {
    const deposits = PERPS_ACTIVITY_FILTER_KINDS[PerpsActivityFilter.Deposits];
    expect(deposits.has('perpsWithdraw')).toBe(true);
    expect(deposits.has('perpsAddFunds')).toBe(true);
  });

  it('keeps trade fills, orders, and fundings in distinct buckets', () => {
    expect(
      PERPS_ACTIVITY_FILTER_KINDS[PerpsActivityFilter.Trades].has(
        'perpsOpenLong',
      ),
    ).toBe(true);
    expect(
      PERPS_ACTIVITY_FILTER_KINDS[PerpsActivityFilter.Order].has('limitShort'),
    ).toBe(true);
    expect(
      PERPS_ACTIVITY_FILTER_KINDS[PerpsActivityFilter.Fundings].has(
        'perpsPaidFundingFees',
      ),
    ).toBe(true);
  });
});

describe('getPerpsSubFilterKinds', () => {
  it('returns the bucket set for a known filter', () => {
    expect(getPerpsSubFilterKinds(PerpsActivityFilter.Deposits)).toBe(
      PERPS_ACTIVITY_FILTER_KINDS[PerpsActivityFilter.Deposits],
    );
  });

  it('returns undefined when no filter is provided', () => {
    expect(getPerpsSubFilterKinds(undefined)).toBeUndefined();
  });

  it('returns undefined for an unknown/stale value instead of throwing', () => {
    expect(
      getPerpsSubFilterKinds(
        // Simulate a stale persisted/hot-reloaded value not in the map.
        'trades' as unknown as PerpsActivityFilter,
      ),
    ).toBeUndefined();
  });
});

describe('activityKindMatchesTypeFilter', () => {
  it('groups lending and mUSD-bonus kinds under Transactions (the Money bucket is removed)', () => {
    for (const kind of [
      'lendingDeposit',
      'lendingWithdrawal',
      'claimMusdBonus',
    ] as ActivityKind[]) {
      expect(
        activityKindMatchesTypeFilter(kind, ActivityTypeFilter.Transactions),
      ).toBe(true);
    }
  });

  it('groups earn/staking kinds (incl. stake) under Transactions', () => {
    for (const kind of [
      'stake',
      'deposit',
      'claim',
      'unstake',
    ] as ActivityKind[]) {
      expect(
        activityKindMatchesTypeFilter(kind, ActivityTypeFilter.Transactions),
      ).toBe(true);
    }
  });
});

describe('resolveInitialActivityTypeFilter', () => {
  it('defaults to Transactions when there are no params', () => {
    expect(resolveInitialActivityTypeFilter(undefined)).toBe(
      ActivityTypeFilter.Transactions,
    );
    expect(resolveInitialActivityTypeFilter({})).toBe(
      ActivityTypeFilter.Transactions,
    );
  });

  it('honors an explicit, selectable initialTypeFilter', () => {
    expect(
      resolveInitialActivityTypeFilter({
        initialTypeFilter: ActivityTypeFilter.Predictions,
      }),
    ).toBe(ActivityTypeFilter.Predictions);
  });

  it('ignores a non-selectable initialTypeFilter (e.g. All) and falls back', () => {
    expect(
      resolveInitialActivityTypeFilter({
        initialTypeFilter: ActivityTypeFilter.All,
      }),
    ).toBe(ActivityTypeFilter.Transactions);
  });

  it('maps the legacy redirectToPerpsTransactions hint to Perps', () => {
    expect(
      resolveInitialActivityTypeFilter({ redirectToPerpsTransactions: true }),
    ).toBe(ActivityTypeFilter.Perps);
  });

  it('maps the legacy redirectToOrders hint to Buy/Sell', () => {
    expect(resolveInitialActivityTypeFilter({ redirectToOrders: true })).toBe(
      ActivityTypeFilter.BuySell,
    );
  });

  it('prefers an explicit initialTypeFilter over legacy redirect hints', () => {
    expect(
      resolveInitialActivityTypeFilter({
        initialTypeFilter: ActivityTypeFilter.Predictions,
        redirectToPerpsTransactions: true,
      }),
    ).toBe(ActivityTypeFilter.Predictions);
  });
});
