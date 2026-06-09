import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getCryptoTargetPrice: jest.fn(),
    },
  },
}));

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

describe('useCryptoTargetPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch when eventId is empty', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCryptoTargetPrice({ ...defaultParams, eventId: '' }),
      { wrapper: Wrapper },
    );

    expect(result.current.isFetching).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(
      Engine.context.PredictController.getCryptoTargetPrice,
    ).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useCryptoTargetPrice({ ...defaultParams, enabled: false }),
      { wrapper: Wrapper },
    );

    expect(result.current.isFetching).toBe(false);
    expect(
      Engine.context.PredictController.getCryptoTargetPrice,
    ).not.toHaveBeenCalled();
  });

  it('returns target price from controller', async () => {
    (
      Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
    ).mockResolvedValueOnce(42000);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCryptoTargetPrice(defaultParams), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.data).toBe(42000);
    expect(result.current.error).toBeNull();
  });

  it('enters error state when controller returns null', async () => {
    (
      Engine.context.PredictController.getCryptoTargetPrice as jest.Mock
    ).mockResolvedValue(null);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCryptoTargetPrice(defaultParams), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isFetching).toBe(false);
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});
