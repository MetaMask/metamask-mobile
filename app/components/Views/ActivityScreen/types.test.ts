import type { ActivityKind } from '../../../util/activity-adapters';
import {
  ACTIVITY_TYPE_FILTER_KINDS,
  ActivityTypeFilter,
  PERPS_ACTIVITY_FILTER_KINDS,
  PERPS_ACTIVITY_FILTER_ORDER,
  PerpsActivityFilter,
  perpsActivityKindMatchesFilter,
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

  it('covers exactly the top-level Perps bucket (no missing/extra kinds)', () => {
    const union = new Set<ActivityKind>();
    for (const filter of PERPS_ACTIVITY_FILTER_ORDER) {
      for (const kind of PERPS_ACTIVITY_FILTER_KINDS[filter]) {
        union.add(kind);
      }
    }

    const perpsBucket = ACTIVITY_TYPE_FILTER_KINDS[ActivityTypeFilter.Perps];
    expect(perpsBucket).not.toBeNull();
    expect([...union].sort()).toEqual([...(perpsBucket ?? [])].sort());
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
    expect(
      perpsActivityKindMatchesFilter(
        'perpsWithdraw',
        PerpsActivityFilter.Deposits,
      ),
    ).toBe(true);
    expect(
      perpsActivityKindMatchesFilter(
        'perpsAddFunds',
        PerpsActivityFilter.Deposits,
      ),
    ).toBe(true);
  });

  it('matches trade fills under Trades and not other buckets', () => {
    expect(
      perpsActivityKindMatchesFilter(
        'perpsOpenLong',
        PerpsActivityFilter.Trades,
      ),
    ).toBe(true);
    expect(
      perpsActivityKindMatchesFilter(
        'perpsOpenLong',
        PerpsActivityFilter.Order,
      ),
    ).toBe(false);
  });

  it('returns false (no crash) for an unknown/stale bucket value', () => {
    expect(
      perpsActivityKindMatchesFilter(
        'perpsOpenLong',
        // Simulate a stale persisted/hot-reloaded value not in the map.
        'trades' as unknown as PerpsActivityFilter,
      ),
    ).toBe(false);
  });

  it('matches order entries under Order and funding fees under Fundings', () => {
    expect(
      perpsActivityKindMatchesFilter('limitShort', PerpsActivityFilter.Order),
    ).toBe(true);
    expect(
      perpsActivityKindMatchesFilter(
        'perpsPaidFundingFees',
        PerpsActivityFilter.Fundings,
      ),
    ).toBe(true);
  });
});
