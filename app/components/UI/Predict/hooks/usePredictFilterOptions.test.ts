import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictFilterOptions } from './usePredictFilterOptions';
import type { PredictFilterOption } from '../types';

const mockListFilterOptions = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      listFilterOptions: (...args: unknown[]) => mockListFilterOptions(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: Infinity } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper };
};

const createOption = (id: string): PredictFilterOption => ({
  id,
  label: id.toUpperCase(),
  source: 'hot-tags',
  params: { tagSlugs: [id], order: 'volume24hr', status: 'open' },
});

describe('usePredictFilterOptions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListFilterOptions.mockResolvedValue([]);
  });

  it('fetches filter options on mount and exposes them', async () => {
    const { Wrapper } = createWrapper();
    mockListFilterOptions.mockResolvedValueOnce([
      createOption('nba'),
      createOption('nfl'),
    ]);

    const { result } = renderHook(
      () => usePredictFilterOptions({ source: 'hot-tags' }),
      { wrapper: Wrapper },
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filterOptions.map((o) => o.id)).toEqual([
      'nba',
      'nfl',
    ]);
    expect(result.current.error).toBeNull();
    expect(mockListFilterOptions).toHaveBeenCalledWith({ source: 'hot-tags' });
  });

  it('returns an empty list when the provider returns none', async () => {
    const { Wrapper } = createWrapper();
    mockListFilterOptions.mockResolvedValueOnce([]);

    const { result } = renderHook(
      () => usePredictFilterOptions({ source: 'hot-tags' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filterOptions).toEqual([]);
  });

  it('does not fetch when disabled', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => usePredictFilterOptions({ source: 'hot-tags' }, { enabled: false }),
      { wrapper: Wrapper },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.filterOptions).toEqual([]);
    expect(mockListFilterOptions).not.toHaveBeenCalled();
  });

  it('surfaces errors and recovers on refetch', async () => {
    const { Wrapper } = createWrapper();
    mockListFilterOptions.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(
      () => usePredictFilterOptions({ source: 'hot-tags' }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.error?.message).toBe('boom');

    mockListFilterOptions.mockResolvedValueOnce([createOption('nba')]);
    await result.current.refetch();

    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
    expect(result.current.filterOptions.map((o) => o.id)).toEqual(['nba']);
  });
});
