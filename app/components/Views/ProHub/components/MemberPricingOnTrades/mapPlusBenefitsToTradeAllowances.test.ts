import type { SubscriptionBenefitsState } from '@metamask/subscription-controller';
import {
  formatPlusPeriodEnd,
  mapPlusBenefitsToTradeAllowances,
} from './mapPlusBenefitsToTradeAllowances';

const createBenefits = (
  overrides: Partial<SubscriptionBenefitsState> = {},
): SubscriptionBenefitsState => ({
  billingPeriodId: 'bp_2026_08_15',
  swaps: {
    feeBips: '0',
    capMicroUsd: 500_000_000,
    consumedMicroUsd: 310_000_000,
    remainingMicroUsd: 190_000_000,
    exhausted: false,
  },
  perps: {
    builderFeeBips: '0',
    builderCode: 'code',
    capMicroUsd: 1_000_000_000,
    consumedMicroUsd: 240_000_000,
    remainingMicroUsd: 760_000_000,
    exhausted: false,
  },
  predict: {
    builderCode: 'code',
    capTxCount: 1,
    consumedTxCount: 0,
    remainingTxCount: 1,
    exhausted: false,
  },
  ...overrides,
});

describe('mapPlusBenefitsToTradeAllowances', () => {
  it('converts swap and perps micro-USD meters to dollar rows', () => {
    const items = mapPlusBenefitsToTradeAllowances(createBenefits());

    expect(items).toEqual([
      {
        id: 'swaps',
        used: 310,
        allowance: 500,
        kind: 'currency',
        exhausted: false,
      },
      {
        id: 'perps',
        used: 240,
        allowance: 1000,
        kind: 'currency',
        exhausted: false,
      },
      {
        id: 'predict',
        used: 0,
        allowance: 1,
        kind: 'count',
        exhausted: false,
      },
    ]);
  });

  it('derives used from remaining when consumed is omitted', () => {
    const items = mapPlusBenefitsToTradeAllowances(
      createBenefits({
        swaps: {
          feeBips: '0',
          capMicroUsd: 500_000_000,
          remainingMicroUsd: 200_000_000,
          exhausted: false,
        },
      }),
    );

    const swaps = items.find((item) => item.id === 'swaps');

    expect(swaps).toEqual(
      expect.objectContaining({ used: 300, allowance: 500 }),
    );
  });

  it('omits a product that has no cap', () => {
    const items = mapPlusBenefitsToTradeAllowances(
      createBenefits({
        predict: {
          builderCode: 'code',
          remainingTxCount: null,
          exhausted: false,
        },
      }),
    );

    expect(items.map((item) => item.id)).toEqual(['swaps', 'perps']);
  });

  it('clamps an exhausted meter to a full allowance bar', () => {
    const items = mapPlusBenefitsToTradeAllowances(
      createBenefits({
        swaps: {
          feeBips: '0',
          capMicroUsd: 500_000_000,
          consumedMicroUsd: 0,
          remainingMicroUsd: 0,
          exhausted: true,
        },
      }),
    );

    expect(items.find((item) => item.id === 'swaps')).toEqual({
      id: 'swaps',
      used: 500,
      allowance: 500,
      kind: 'currency',
      exhausted: true,
    });
  });

  it('returns an empty list when benefits are missing', () => {
    expect(mapPlusBenefitsToTradeAllowances(undefined)).toEqual([]);
  });
});

describe('formatPlusPeriodEnd', () => {
  it('formats an ISO timestamp as a short month-day string', () => {
    expect(formatPlusPeriodEnd('2026-09-15T00:00:00.000Z')).toBe(
      new Date('2026-09-15T00:00:00.000Z').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    );
  });

  it('returns undefined for a missing timestamp', () => {
    expect(formatPlusPeriodEnd(undefined)).toBeUndefined();
  });

  it('returns undefined for an unparseable timestamp', () => {
    expect(formatPlusPeriodEnd('not-a-date')).toBeUndefined();
  });
});
