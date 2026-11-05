import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { PredictPortfolioSummary, PredictVenueId } from '../../../types';
import {
  portfolioValueFromSummary,
  usePredictPortfolioValue,
} from './usePredictPortfolioValue';

// The import fence: the next value cannot be built from Positions or
// Activity, because this module cannot load them. A refactor that brings
// either into the module graph fails here before it can sum a page.
jest.mock('../../../hooks/usePositions', () => {
  throw new Error('The portfolio value must not load Positions');
});
jest.mock('../../../hooks/useActivity', () => {
  throw new Error('The portfolio value must not load Activity');
});
jest.mock('../../../hooks/useBalance', () => {
  throw new Error('The portfolio value must not load the Balance');
});

const KALSHI = 'kalshi' as PredictVenueId;

const summary = (
  overrides: Partial<PredictPortfolioSummary> = {},
): PredictPortfolioSummary =>
  ({
    venueId: KALSHI,
    currency: 'USD',
    availableBalance: '120.50',
    positionsValue: '312.40',
    claimableValue: '0',
    totalValue: '432.90',
    unrealizedPnl: '2.15',
    asOf: '2026-10-23T12:00:05.120Z',
    complete: true,
    ...overrides,
  }) as PredictPortfolioSummary;

const messengerCall = jest.fn();

/** A query client whose default query function calls the messenger the
 * way the app's UI query client does. */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        queryFn: ({ queryKey }) =>
          messengerCall(...(queryKey as [string, ...unknown[]])),
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('next usePredictPortfolioValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is the Summary total, read with nothing else', async () => {
    messengerCall.mockResolvedValue(summary());

    const { result } = renderHook(
      () => usePredictPortfolioValue({ venueId: KALSHI }),
      { wrapper: createWrapper() },
    );

    await waitFor(() =>
      expect(result.current).toEqual({ status: 'ready', valueUsd: 432.9 }),
    );
    expect(messengerCall.mock.calls).toEqual([
      ['PredictPortfolioService:getPortfolioSummary', KALSHI],
    ]);
  });

  it('is loading while the Summary is in flight', () => {
    messengerCall.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(
      () => usePredictPortfolioValue({ venueId: KALSHI }),
      { wrapper: createWrapper() },
    );

    expect(result.current).toEqual({ status: 'loading' });
  });

  it('is an error when the Summary read fails', async () => {
    messengerCall.mockRejectedValue(new Error('503'));

    const { result } = renderHook(
      () => usePredictPortfolioValue({ venueId: KALSHI }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
  });

  it('reads nothing while no next Venue is active', async () => {
    const { result, rerender } = renderHook(
      () => usePredictPortfolioValue({}),
      { wrapper: createWrapper() },
    );
    rerender(undefined);
    await waitFor(() => expect(result.current).toEqual({ status: 'loading' }));

    expect(messengerCall).not.toHaveBeenCalled();
  });
});

describe('portfolioValueFromSummary', () => {
  it.each([
    ['a complete Summary', summary(), 432.9],
    ['a partial Summary', summary({ complete: false }), 432.9],
    [
      'an empty portfolio',
      summary({
        availableBalance: '0' as never,
        positionsValue: '0' as never,
        totalValue: '0' as never,
      }),
      0,
    ],
  ])('takes the total of %s exactly', (_case, data, valueUsd) => {
    expect(
      portfolioValueFromSummary({ status: 'ready', summary: data }),
    ).toEqual({ status: 'ready', valueUsd });
  });

  it('is an error for a total that is not a number', () => {
    expect(
      portfolioValueFromSummary({
        status: 'ready',
        summary: summary({ totalValue: 'NaN' as never }),
      }),
    ).toEqual({ status: 'error' });
  });

  it.each(['loading', 'error'] as const)('passes %s through', (status) => {
    expect(portfolioValueFromSummary({ status })).toEqual({ status });
  });
});
