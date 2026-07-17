import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { notifyManager } from '@tanstack/query-core';
import { useIsPriceAlertsChainSupported } from './useIsPriceAlertsChainSupported';

notifyManager.setBatchNotifyFunction((callback: () => void) => {
  callback();
});

const mockFetchSupportedChains = jest.fn();

jest.mock('../api', () => ({
  fetchSupportedChains: (...args: unknown[]) =>
    mockFetchSupportedChains(...args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const makeOkResponse = (chains: string[]) =>
  ({
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue(chains),
  }) as unknown as Response;

const makeErrorResponse = (status: number) =>
  ({
    ok: false,
    status,
    json: jest.fn(),
  }) as unknown as Response;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchSupportedChains.mockResolvedValue(
    makeOkResponse(['eip155:1', 'eip155:137']),
  );
});

describe('useIsPriceAlertsChainSupported', () => {
  it('returns false while supported chains are loading', () => {
    mockFetchSupportedChains.mockReturnValue(new Promise(() => undefined));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIsPriceAlertsChainSupported('eip155:1/slip44:60'),
      { wrapper: Wrapper },
    );

    expect(result.current).toBe(false);
  });

  it('returns true when the asset chain is supported', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIsPriceAlertsChainSupported('eip155:1/slip44:60'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('returns false when the asset chain is not supported', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIsPriceAlertsChainSupported('eip155:56/slip44:714'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('returns false when assetId is null', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useIsPriceAlertsChainSupported(null), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(mockFetchSupportedChains).toHaveBeenCalled();
    });

    expect(result.current).toBe(false);
  });

  it('returns false for an invalid assetId', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIsPriceAlertsChainSupported('not-a-caip-id'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(mockFetchSupportedChains).toHaveBeenCalled();
    });

    expect(result.current).toBe(false);
  });

  it('does not fetch when enabled is false', () => {
    const { Wrapper } = createWrapper();
    renderHook(
      () =>
        useIsPriceAlertsChainSupported('eip155:1/slip44:60', {
          enabled: false,
        }),
      { wrapper: Wrapper },
    );

    expect(mockFetchSupportedChains).not.toHaveBeenCalled();
  });

  it('retries the fetch after a transient failure', async () => {
    jest.useFakeTimers();

    mockFetchSupportedChains
      .mockResolvedValueOnce(makeErrorResponse(500))
      .mockResolvedValueOnce(makeOkResponse(['eip155:1', 'eip155:137']));

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useIsPriceAlertsChainSupported('eip155:1/slip44:60'),
      { wrapper: Wrapper },
    );

    expect(mockFetchSupportedChains).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5_000);

    await waitFor(() => {
      expect(mockFetchSupportedChains).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    jest.useRealTimers();
  });

  it('caches supported chains for 24 hours', async () => {
    const { Wrapper, queryClient } = createWrapper();
    const { result, unmount } = renderHook(
      () => useIsPriceAlertsChainSupported('eip155:1/slip44:60'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    expect(mockFetchSupportedChains).toHaveBeenCalledTimes(1);
    unmount();

    const { result: secondResult } = renderHook(
      () => useIsPriceAlertsChainSupported('eip155:137/erc20:0xabc'),
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(secondResult.current).toBe(true);
    });

    expect(mockFetchSupportedChains).toHaveBeenCalledTimes(1);

    const queryState = queryClient.getQueryState([
      'priceAlerts',
      'supportedChains',
    ]);
    expect(queryState?.dataUpdatedAt).toBeGreaterThan(0);
  });
});
