import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FEED_CAIP2_CHAINS } from './feed-constants';
import {
  SUPPORTED_NETWORKS_QUERY_KEY,
  resolveFeedChains,
  useFeedChains,
} from './supportedNetworks';

const SUPPORTED = {
  fullSupport: ['eip155:1', 'eip155:999'],
  partialSupport: ['eip155:137'],
} as const;

const createWrapper = (
  queryFn?: () => Promise<unknown>,
): {
  client: QueryClient;
  wrapper: ({ children }: { children: React.ReactNode }) => React.ReactElement;
} => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, ...(queryFn ? { queryFn } : {}) },
    },
  });
  const wrapper = ({
    children,
  }: {
    children: React.ReactNode;
  }): React.ReactElement =>
    React.createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
};

describe('resolveFeedChains', () => {
  it('returns the fully supported networks, in the order social-api lists them', () => {
    expect(
      resolveFeedChains({
        fullSupport: [...SUPPORTED.fullSupport],
        partialSupport: [...SUPPORTED.partialSupport],
      }),
    ).toEqual(['eip155:1', 'eip155:999']);
  });

  it('does not request partially supported networks', () => {
    const chains = resolveFeedChains({
      fullSupport: ['eip155:1'],
      partialSupport: ['eip155:137'],
    });

    expect(chains).not.toContain('eip155:137');
  });

  it('falls back while the list is not loaded', () => {
    expect(resolveFeedChains(undefined)).toBe(FEED_CAIP2_CHAINS);
  });

  it('falls back on an empty list rather than sending no chains', () => {
    expect(resolveFeedChains({ fullSupport: [], partialSupport: [] })).toBe(
      FEED_CAIP2_CHAINS,
    );
  });
});

describe('useFeedChains', () => {
  it('returns the fallback chains until the list loads, then the fetched ones', async () => {
    const queryFn = jest.fn().mockResolvedValue({
      fullSupport: [...SUPPORTED.fullSupport],
      partialSupport: [...SUPPORTED.partialSupport],
    });
    const { wrapper } = createWrapper(queryFn);

    const { result } = renderHook(() => useFeedChains(), { wrapper });

    expect(result.current).toBe(FEED_CAIP2_CHAINS);
    await waitFor(() =>
      expect(result.current).toEqual(['eip155:1', 'eip155:999']),
    );
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('keeps the fallback chains when the request fails', async () => {
    const queryFn = jest.fn().mockRejectedValue(new Error('401'));
    const { client, wrapper } = createWrapper(queryFn);

    const { result } = renderHook(() => useFeedChains(), { wrapper });

    await waitFor(() =>
      expect(client.getQueryState(SUPPORTED_NETWORKS_QUERY_KEY)?.status).toBe(
        'error',
      ),
    );
    expect(result.current).toBe(FEED_CAIP2_CHAINS);
  });

  it('does not fetch while disabled', () => {
    const queryFn = jest.fn().mockResolvedValue(SUPPORTED);
    const { wrapper } = createWrapper(queryFn);

    const { result } = renderHook(() => useFeedChains(false), { wrapper });

    expect(queryFn).not.toHaveBeenCalled();
    expect(result.current).toBe(FEED_CAIP2_CHAINS);
  });
});
