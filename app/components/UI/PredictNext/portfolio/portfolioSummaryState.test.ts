import type { PredictPortfolioSummary, PredictVenueId } from '../types';
import { projectPortfolioSummary } from './portfolioSummaryState';

const KALSHI = 'kalshi' as PredictVenueId;

const summary = (
  overrides: Partial<PredictPortfolioSummary> = {},
): PredictPortfolioSummary =>
  ({
    venueId: KALSHI,
    currency: 'USD',
    availableBalance: '123.13',
    positionsValue: '45.00',
    claimableValue: '0',
    totalValue: '168.13',
    unrealizedPnl: '3.75',
    unrealizedPnlPercent: '9.09',
    asOf: '2026-10-23T12:00:05.120Z',
    complete: true,
    ...overrides,
  }) as PredictPortfolioSummary;

describe('projectPortfolioSummary', () => {
  it('is ready with the Summary as served', () => {
    const data = summary();

    expect(projectPortfolioSummary({ data, isError: false }, KALSHI)).toEqual({
      status: 'ready',
      summary: data,
    });
  });

  it('keeps a partial Summary ready: its total is a lower bound, not a guess', () => {
    const data = summary({ complete: false });

    expect(projectPortfolioSummary({ data, isError: false }, KALSHI)).toEqual({
      status: 'ready',
      summary: data,
    });
  });

  it('is loading without data, including a read paused offline', () => {
    expect(projectPortfolioSummary({ isError: false }, KALSHI)).toEqual({
      status: 'loading',
    });
  });

  it.each([
    ['a failed first read', undefined],
    ['a failed refresh over a cached, now stale, Summary', summary()],
  ])('is an error for %s', (_case, data) => {
    expect(projectPortfolioSummary({ data, isError: true }, KALSHI)).toEqual({
      status: 'error',
    });
  });

  it("is an error for another Venue's Summary", () => {
    expect(
      projectPortfolioSummary(
        {
          data: summary({ venueId: 'polymarket' as PredictVenueId }),
          isError: false,
        },
        KALSHI,
      ),
    ).toEqual({ status: 'error' });
  });
});
