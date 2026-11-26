import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type { InterestHistoryGranularity } from '../../types/moneyInterestHistory';
import EarningsHero from './EarningsHero';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const renderHero = (
  totalEarnedUsd: number,
  periodStart = '2026-11-15T00:00:00.000Z',
  periodEndExclusive = '2026-11-16T00:00:00.000Z',
  periodGranularity: InterestHistoryGranularity = 'day',
) =>
  renderWithProvider(
    <EarningsHero
      totalEarnedUsd={totalEarnedUsd}
      periodStart={periodStart}
      periodEndExclusive={periodEndExclusive}
      periodGranularity={periodGranularity}
      rangeStart={periodStart}
      rangeEndExclusive={periodEndExclusive}
    />,
  );

describe('EarningsHero', () => {
  it('adds a positive prefix to positive earnings', () => {
    const { getByTestId } = renderHero(2);

    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '+$2.00',
    );
  });

  it('omits a positive prefix for zero earnings', () => {
    const { getByTestId } = renderHero(0);

    expect(getByTestId(MoneyEarningsViewTestIds.HERO_TOTAL)).toHaveTextContent(
      '$0.00',
    );
  });

  it('omits the year for a same-year date range', () => {
    const { getByTestId } = renderHero(
      0,
      '2026-08-25T00:00:00.000Z',
      '2026-11-23T00:00:00.000Z',
    );

    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('Aug 25 – Nov 22');
  });

  it.each(['day', 'week'] as const)(
    'includes the year for a cross-year %s range',
    (granularity) => {
      const { getByTestId } = renderHero(
        0,
        '2026-12-30T00:00:00.000Z',
        '2027-01-06T00:00:00.000Z',
        granularity,
      );

      expect(
        getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
      ).toHaveTextContent('Dec 30, 2026 – Jan 5, 2027');
    },
  );

  it('includes the year for a cross-year monthly range', () => {
    const { getByTestId } = renderHero(
      0,
      '2026-11-01T00:00:00.000Z',
      '2027-02-01T00:00:00.000Z',
      'month',
    );

    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('Nov 2026 – Jan 2027');
  });

  it('omits the year for a same-year monthly range', () => {
    const { getByTestId } = renderHero(
      0,
      '2026-08-01T00:00:00.000Z',
      '2026-12-01T00:00:00.000Z',
      'month',
    );

    expect(
      getByTestId(MoneyEarningsViewTestIds.HERO_PERIOD_DATE),
    ).toHaveTextContent('Aug – Nov');
  });
});
