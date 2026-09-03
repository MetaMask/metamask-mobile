import React, { type PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import type { MarketInsightsReport } from '@metamask/ai-controllers';
import { useMarketInsights } from './useMarketInsights';
const mockFetchMarketInsights = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AiDigestController: {
        fetchMarketInsights: (...args: unknown[]) =>
          mockFetchMarketInsights(...args),
      },
    },
  },
}));

let queryClient: QueryClient;

const wrapper = ({ children }: PropsWithChildren) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useMarketInsights', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-17T12:00:00.000Z'));
    jest.clearAllMocks();
    onlineManager.setOnline(true);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
    onlineManager.setOnline(true);
    jest.useRealTimers();
  });

  it('does not fetch when assetIdentifier is missing', () => {
    const { result } = renderHook(() => useMarketInsights(undefined), {
      wrapper,
    });

    expect(mockFetchMarketInsights).not.toHaveBeenCalled();
    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when market insights feature is disabled', () => {
    const { result } = renderHook(
      () => useMarketInsights('eip155:1/erc20:0x123', false),
      { wrapper },
    );

    expect(mockFetchMarketInsights).not.toHaveBeenCalled();
    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches and returns report data with relative time', async () => {
    const report = {
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH advances',
      summary: 'ETF headlines support demand',
      trends: [],
      sources: [],
    };

    mockFetchMarketInsights.mockResolvedValue(report);

    const { result } = renderHook(
      () => useMarketInsights('eip155:1/erc20:0x123', true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchMarketInsights).toHaveBeenCalledWith(
      'eip155:1/erc20:0x123',
    );
    expect(result.current.report).toEqual(report);
    expect(result.current.reportAssetId).toBe('eip155:1/erc20:0x123');
    expect(result.current.error).toBeNull();
    expect(result.current.timeAgo).toBe('5m ago');
  });

  it('returns null when controller has no insights', async () => {
    mockFetchMarketInsights.mockResolvedValue(null);

    const { result } = renderHook(
      () => useMarketInsights('eip155:1/erc20:0x2260', true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.timeAgo).toBe('');
  });

  it('returns an error when fetch fails', async () => {
    mockFetchMarketInsights.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(
      () => useMarketInsights('eip155:1/erc20:0x456', true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBe('fetch failed');
    expect(result.current.timeAgo).toBe('');
  });

  it('fetches using a perps market symbol as assetIdentifier', async () => {
    const report = {
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH perpetuals update',
      summary: 'Perps funding rates normalizing.',
      trends: [],
      sources: [],
    };

    mockFetchMarketInsights.mockResolvedValue(report);

    const { result } = renderHook(() => useMarketInsights('ETH', true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchMarketInsights).toHaveBeenCalledWith('ETH');
    expect(result.current.report).toEqual(report);
    expect(result.current.reportAssetId).toBe('ETH');
    expect(result.current.error).toBeNull();
  });

  it('clears report and reportAssetId when assetIdentifier changes', async () => {
    const ethReport = {
      digestId: 'eth-digest',
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH advances',
      summary: 'ETF headlines support demand',
      trends: [],
      sources: [],
    };

    const usdcReport = {
      version: '1.0',
      asset: 'usdc',
      generatedAt: '2026-02-17T12:00:00.000Z',
      headline: 'USDC stable',
      summary: 'Stablecoin demand steady',
      trends: [],
      sources: [],
    };

    mockFetchMarketInsights.mockResolvedValueOnce(ethReport);

    const { result, rerender } = renderHook(
      ({ id }) => useMarketInsights(id, true),
      {
        initialProps: { id: 'eip155:1/erc20:0x123' },
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toEqual(ethReport);
    expect(result.current.reportAssetId).toBe('eip155:1/erc20:0x123');

    mockFetchMarketInsights.mockResolvedValueOnce(usdcReport);

    rerender({ id: 'eip155:1/erc20:0x456' });

    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toEqual(usdcReport);
    expect(result.current.reportAssetId).toBe('eip155:1/erc20:0x456');
  });

  it('clears report when the feature is disabled after loading', async () => {
    const report = {
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH advances',
      summary: 'ETH summary',
      trends: [],
      sources: [],
    };
    mockFetchMarketInsights.mockResolvedValue(report);
    const { result, rerender } = renderHook(
      ({ enabled }) => useMarketInsights('ETH', enabled),
      { initialProps: { enabled: true }, wrapper },
    );
    await waitFor(() => expect(result.current.report).toEqual(report));

    rerender({ enabled: false });

    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('starts clean when re-enabled after loading', async () => {
    const report = {
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH advances',
      summary: 'ETH summary',
      trends: [],
      sources: [],
    };
    mockFetchMarketInsights.mockResolvedValueOnce(report);
    const { result, rerender } = renderHook(
      ({ enabled }) => useMarketInsights('ETH', enabled),
      { initialProps: { enabled: true }, wrapper },
    );
    await waitFor(() => expect(result.current.report).toEqual(report));
    rerender({ enabled: false });
    mockFetchMarketInsights.mockRejectedValueOnce(new Error('reload failed'));

    rerender({ enabled: true });

    expect(result.current.report).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.error).toBe('reload failed'));
    expect(result.current.report).toBeNull();
  });

  it('ignores a late response from the previous assetIdentifier', async () => {
    let resolveEth: (report: MarketInsightsReport) => void = () => undefined;
    let resolveBtc: (report: MarketInsightsReport) => void = () => undefined;
    const ethRequest = new Promise<MarketInsightsReport>((resolve) => {
      resolveEth = resolve;
    });
    const btcRequest = new Promise<MarketInsightsReport>((resolve) => {
      resolveBtc = resolve;
    });
    const ethReport = {
      digestId: 'late-eth-digest',
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH advances',
      summary: 'ETH summary',
      trends: [],
      sources: [],
    };
    const btcReport = {
      digestId: 'btc-digest',
      version: '1.0',
      asset: 'btc',
      generatedAt: '2026-02-17T11:56:00.000Z',
      headline: 'BTC advances',
      summary: 'BTC summary',
      trends: [],
      sources: [],
    };
    mockFetchMarketInsights.mockImplementation((assetIdentifier: string) =>
      assetIdentifier === 'ETH' ? ethRequest : btcRequest,
    );
    const { result, rerender } = renderHook(
      ({ id }) => useMarketInsights(id, true),
      { initialProps: { id: 'ETH' }, wrapper },
    );

    rerender({ id: 'BTC' });
    resolveBtc(btcReport);
    await waitFor(() => expect(result.current.report).toEqual(btcReport));

    resolveEth(ethReport);
    await Promise.resolve();

    expect(result.current.report).toEqual(btcReport);
    expect(result.current.reportAssetId).toBe('BTC');
  });

  it('reads the controller cache while offline', async () => {
    const report = {
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'Cached ETH insight',
      summary: 'Cached ETH summary',
      trends: [],
      sources: [],
    };
    mockFetchMarketInsights.mockResolvedValue(report);
    onlineManager.setOnline(false);
    const { result } = renderHook(() => useMarketInsights('ETH', true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.report).toEqual(report));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetchMarketInsights).toHaveBeenCalledWith('ETH');
  });

  it('keeps a loaded report when a background refetch fails', async () => {
    const report = {
      version: '1.0',
      asset: 'eth',
      generatedAt: '2026-02-17T11:55:00.000Z',
      headline: 'ETH advances',
      summary: 'ETH summary',
      trends: [],
      sources: [],
    };
    mockFetchMarketInsights.mockResolvedValueOnce(report);
    const { result } = renderHook(() => useMarketInsights('ETH', true), {
      wrapper,
    });
    await waitFor(() => expect(result.current.report).toEqual(report));
    mockFetchMarketInsights.mockRejectedValueOnce(new Error('refresh failed'));

    await act(async () => {
      await queryClient.refetchQueries({
        queryKey: ['market-insights', 'ETH'],
      });
    });

    expect(result.current.report).toEqual(report);
    expect(result.current.reportAssetId).toBe('ETH');
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
