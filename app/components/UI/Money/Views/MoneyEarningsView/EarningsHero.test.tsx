import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import EarningsHero from './EarningsHero';
import { MoneyEarningsViewTestIds } from './MoneyEarningsView.testIds';

const renderHero = (totalEarnedUsd: number) =>
  renderWithProvider(
    <EarningsHero
      totalEarnedUsd={totalEarnedUsd}
      periodStart="2026-11-15T00:00:00.000Z"
      periodEndExclusive="2026-11-16T00:00:00.000Z"
      periodGranularity="day"
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
});
