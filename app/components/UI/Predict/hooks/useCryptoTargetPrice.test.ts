import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import { clearTargetPriceCache } from '../queries/cryptoTargetPrice';
import type { PredictOutcome } from '../types';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGetMarket = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarket: (...args: unknown[]) => mockGetMarket(...args),
    },
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const defaultParams = {
  eventId: 'event-123',
  symbol: 'BTC',
  eventStartTime: '2025-01-01T00:00:00Z',
  variant: 'up',
  endDate: '2025-01-02',
};

const makeOutcome = (
  overrides: Partial<PredictOutcome> = {},
): PredictOutcome => ({
  id: 'outcome-1',
  providerId: 'polymarket',
  marketId: 'event-123',
  title: 'Up',
  description: '',
  image: '',
  status: 'open',
  tokens: [],
  volume: 0,
  groupItemTitle: 'Up/Down',
  groupItemThreshold: 42000,
  ...overrides,
});

describe('useCryptoTargetPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearTargetPriceCache();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not fetch when eventId is empty', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCryptoTargetPrice({ ...defaultParams, eventId: '' }),
      { wrapper: Wrapper },
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCryptoTargetPrice({ ...defaultParams, enabled: false }),
      { wrapper: Wrapper },
    );

    expect(result.current.isFetching).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns target price from primary API on success', async () => {
    const { Wrapper } = createWrapper();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ price: 42000 }),
    });

    const { result } = renderHook(() => useCryptoTargetPrice(defaultParams), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBe(42000);
    expect(result.current.error).toBeNull();
  });

  it('uses provided outcomes for fallback instead of fetching market', async () => {
    const { Wrapper } = createWrapper();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const outcomes = [makeOutcome({ groupItemThreshold: 41500 })];

    const { result } = renderHook(
      () => useCryptoTargetPrice({ ...defaultParams, outcomes }),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBe(41500);
    expect(mockGetMarket).not.toHaveBeenCalled();
  });

  it('falls back to controller getMarket when outcomes not provided', async () => {
    const { Wrapper } = createWrapper();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockGetMarket.mockResolvedValueOnce({
      outcomes: [{ groupItemThreshold: 40000 }],
    });

    const { result } = renderHook(() => useCryptoTargetPrice(defaultParams), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBe(40000);
    expect(mockGetMarket).toHaveBeenCalledWith({ marketId: 'event-123' });
  });

  it('returns null when both API and fallback fail', async () => {
    const { Wrapper } = createWrapper();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockGetMarket.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCryptoTargetPrice(defaultParams), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('never enters React Query error state since queryFn handles all failures', async () => {
    const { Wrapper } = createWrapper();
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockGetMarket.mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useCryptoTargetPrice(defaultParams), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(true);
  });
});
