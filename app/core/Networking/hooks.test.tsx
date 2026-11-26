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
import { useNetworkMutation, useNetworkQuery } from './hooks';
import { isTierPolicyEnabled } from './killSwitch';

jest.mock('../../util/deviceCapability/conditions', () => ({
  getNetworkConditions: jest.fn(),
}));
jest.mock('./killSwitch', () => ({ isTierPolicyEnabled: jest.fn() }));

const intent = { feature: 'prices', operation: 'spot' };

let client: QueryClient;
const wrapper = ({ children }: React.PropsWithChildren) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  // Mirrors the app-wide mutation defaults set in ReactQueryService.
  client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
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

  it('applies the tier policies and tags the query', async () => {
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
    expect(query?.meta).toMatchObject({ networking: true, ...intent });
    expect(observer?.options).toMatchObject({
      staleTime: 30000,
      gcTime: 300000,
      refetchIntervalInBackground: false,
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

  it('does not retry a non-retryable error', async () => {
    const queryFn = jest.fn().mockRejectedValue(new HttpError(404, 'host'));
    const { result } = renderHook(
      () => useNetworkQuery({ ...intent, queryKey: ['missing'], queryFn }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

describe('useNetworkMutation', () => {
  it('tags the mutation and keeps the global no-retry default', async () => {
    const mutationFn = jest.fn().mockRejectedValue(new HttpError(503, 'host'));
    const { result } = renderHook(
      () => useNetworkMutation({ ...intent, mutationFn }),
      { wrapper },
    );

    act(() => result.current.mutate());
    // Waiting on the rendered state lets TanStack's deferred notification land.
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(client.getMutationCache().getAll()[0]?.meta).toMatchObject({
      networking: true,
      ...intent,
    });
  });
});
