import { renderHook, waitFor } from '@testing-library/react-native';
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

describe('useMarketInsights', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-17T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fetch when assetIdentifier is missing', () => {
    const { result } = renderHook(() => useMarketInsights(undefined));

    expect(mockFetchMarketInsights).not.toHaveBeenCalled();
    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('does not fetch when market insights feature is disabled', () => {
    const { result } = renderHook(() =>
      useMarketInsights('eip155:1/erc20:0x123', false),
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

    const { result } = renderHook(() =>
      useMarketInsights('eip155:1/erc20:0x123', true),
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

    const { result } = renderHook(() =>
      useMarketInsights('eip155:1/erc20:0x2260', true),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toBeNull();
    expect(result.current.reportAssetId).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.timeAgo).toBe('');
  });

  it('returns an error when fetch fails', async () => {
    mockFetchMarketInsights.mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHook(() =>
      useMarketInsights('eip155:1/erc20:0x456', true),
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

    const { result } = renderHook(() => useMarketInsights('ETH', true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetchMarketInsights).toHaveBeenCalledWith('ETH');
    expect(result.current.report).toEqual(report);
    expect(result.current.reportAssetId).toBe('ETH');
    expect(result.current.error).toBeNull();
  });

  it('clears report and reportAssetId when assetIdentifier changes', async () => {
    const ethReport = {
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
      { initialProps: { id: 'eip155:1/erc20:0x123' } },
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
});
