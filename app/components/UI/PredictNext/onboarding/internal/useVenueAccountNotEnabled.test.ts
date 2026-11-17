import { act, renderHook } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { PredictError, PredictErrorCode } from '../../errors';
import { portfolioQueries } from '../../queries/portfolioQueries';
import type { PredictVenueId } from '../../types';
import { useVenueAccountNotEnabled } from './useVenueAccountNotEnabled';

const VENUE = 'kalshi' as PredictVenueId;

const harness = (
  client: QueryClient,
): { wrapper: React.FC<{ children: React.ReactNode }> } => ({
  wrapper: ({ children }: { children: React.ReactNode }): React.ReactElement =>
    React.createElement(QueryClientProvider, { client }, children),
});

const readWithError = (client: QueryClient, error: unknown): void => {
  client
    .getQueryCache()
    .build(client, {
      queryKey: portfolioQueries.getBalance(VENUE).family,
      queryFn: async () => {
        throw error;
      },
    })
    .setState({ status: 'error', error: error as Error });
};

describe('useVenueAccountNotEnabled', () => {
  const client = new QueryClient();

  beforeEach(() => {
    client.clear();
  });

  it('is false while every cached read is healthy', () => {
    const { result } = renderHook(() => useVenueAccountNotEnabled(VENUE), {
      ...harness(client),
    });

    expect(result.current).toBe(false);
  });

  it('is true when a cached read failed on a missing venue account', () => {
    readWithError(
      client,
      PredictError.from(PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED),
    );

    const { result } = renderHook(() => useVenueAccountNotEnabled(VENUE), {
      ...harness(client),
    });

    expect(result.current).toBe(true);
  });

  it('ignores a read that failed for any other reason', () => {
    readWithError(client, PredictError.from(PredictErrorCode.NETWORK_ERROR));
    readWithError(client, new Error('not a PredictError'));

    const { result } = renderHook(() => useVenueAccountNotEnabled(VENUE), {
      ...harness(client),
    });

    expect(result.current).toBe(false);
  });

  it('follows the cache as a read starts failing', () => {
    const { result } = renderHook(() => useVenueAccountNotEnabled(VENUE), {
      ...harness(client),
    });
    expect(result.current).toBe(false);

    act(() => {
      readWithError(
        client,
        PredictError.from(PredictErrorCode.VENUE_ACCOUNT_NOT_ENABLED),
      );
    });

    expect(result.current).toBe(true);
  });
});
