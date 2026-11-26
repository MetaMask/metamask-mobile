import React from 'react';
import {
  act,
  cleanup,
  renderHook,
  waitFor,
} from '@testing-library/react-native';
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { HttpError } from './errors';
import { reportNetworkFailure } from './errorReporting';
import { useNetworkMutation, useNetworkQuery } from './hooks';
import { isTierPolicyEnabled } from './killSwitch';

jest.mock('../../util/deviceCapability/conditions', () => ({
  getNetworkConditions: jest.fn(),
}));
jest.mock('./killSwitch', () => ({ isTierPolicyEnabled: jest.fn() }));
jest.mock('./errorReporting', () => ({ reportNetworkFailure: jest.fn() }));

const intent = { feature: 'prices', operation: 'spot' };

let client: QueryClient;
const wrapper = ({ children }: React.PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  // The shared client retries mutations by default; the hook must not.
  client = new QueryClient({
    defaultOptions: { mutations: { retry: 2, gcTime: Infinity } },
  });
});

afterEach(() => {
  // Unmount first so no observer re-arms a poll or garbage-collection timer.
  cleanup();
  onlineManager.setOnline(true);
  client.clear();
});

describe('useNetworkQuery', () => {
  beforeEach(() => {
    jest.mocked(isTierPolicyEnabled).mockReturnValue(true);
    jest.mocked(getNetworkConditions).mockReturnValue({
      hardware: 'LOW',
      network: 'SLOW_CELLULAR',
      latency: 'SLOW',
    });
  });

  it('applies the tier policies', async () => {
    const { result } = renderHook(
      () =>
        useNetworkQuery({
          ...intent,
          queryKey: ['prices', 'spot'],
          queryFn: async () => 3,
          freshness: 'live',
          poll: 'frequent',
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data).toBe(3));
    const query = client.getQueryCache().find({ queryKey: ['prices', 'spot'] });
    const observer = query?.observers[0];
    expect(observer?.options).toMatchObject({
      staleTime: 30000,
      gcTime: 300000,
    });
    const { refetchInterval } = observer?.options ?? {};
    if (typeof refetchInterval !== 'function' || !query)
      throw new Error('Expected adaptive polling');
    expect(refetchInterval(query)).toBe(120000);
    jest.mocked(isTierPolicyEnabled).mockReturnValue(false);
    expect(refetchInterval(query)).toBe(30000);
  });

  it('pauses offline while keeping the cached data', async () => {
    client.setQueryData(['paused'], 1);
    const queryFn = jest.fn().mockResolvedValue(2);
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(
      () =>
        useNetworkQuery({
          ...intent,
          queryKey: ['paused'],
          queryFn,
          freshness: 'realtime',
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.fetchStatus).toBe('paused'));
    expect(result.current.data).toBe(1);
    expect(queryFn).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));
    await waitFor(() => expect(result.current.data).toBe(2));
  });

  it('does not retry a non-retryable error and reports it once', async () => {
    const error = new HttpError(404, 'host');
    const queryFn = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(
      () => useNetworkQuery({ ...intent, queryKey: ['missing'], queryFn }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(reportNetworkFailure).toHaveBeenCalledTimes(1);
    expect(reportNetworkFailure).toHaveBeenCalledWith(
      error,
      expect.objectContaining(intent),
      1,
    );
  });
});

describe('useNetworkMutation', () => {
  it('runs offline, fails once without retrying, and reports the failure', async () => {
    const error = new HttpError(503, 'host');
    const mutationFn = jest.fn().mockRejectedValue(error);
    const onError = jest.fn();
    act(() => onlineManager.setOnline(false));
    const { result } = renderHook(
      () => useNetworkMutation({ ...intent, mutationFn, onError }),
      { wrapper },
    );

    act(() => result.current.mutate());
    // Waiting on the rendered state lets TanStack's deferred notification land.
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(reportNetworkFailure).toHaveBeenCalledWith(
      error,
      expect.objectContaining(intent),
      1,
    );
  });
});
