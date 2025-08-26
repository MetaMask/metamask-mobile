import { renderHook } from '@testing-library/react-hooks';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePredictMarketData } from './usePredictMarketData';
import type { Market } from '../types';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      initializeProviders: jest.fn(),
      getMarkets: jest.fn(),
    },
  },
}));

describe('usePredictMarketData', () => {
  const mockInitializeProviders = jest.fn();
  const mockGetMarkets = jest.fn();

  const mockMarketData: Market[] = [
    {
      id: 'market-1',
      question: 'Will Bitcoin reach $100k by end of 2024?',
      outcomes: 'Yes,No',
      outcomePrices: '0.65,0.35',
      image: 'https://example.com/btc.png',
      volume: '1000000',
      providerId: 'polymarket',
      status: 'open',
      image_url: 'https://example.com/btc.png',
      icon: 'BTC',
    },
    {
      id: 'market-2',
      question: 'Will Ethereum reach $100000 by end of 2025?',
      outcomes: 'Yes,No',
      outcomePrices: '0.45,0.55',
      image: 'https://example.com/eth.png',
      volume: '500000',
      providerId: 'polymarket',
      status: 'open',
      image_url: 'https://example.com/eth.png',
      icon: 'ETH',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Engine mocks
    (Engine.context.PredictController.initializeProviders as jest.Mock) =
      mockInitializeProviders;
    (Engine.context.PredictController.getMarkets as jest.Mock) = mockGetMarkets;

    // Setup DevLogger mock
    (DevLogger.log as jest.Mock).mockImplementation(() => {
      // Mock implementation
    });
  });

  it('should fetch market data successfully', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue(mockMarketData);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);
    expect(mockInitializeProviders).toHaveBeenCalledTimes(1);
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith('Fetching market data');
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Market data received:',
      mockMarketData,
    );
  });

  it('should handle null market data', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue(null);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('should handle empty market data array', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should handle initialization error', async () => {
    const error = new Error('Failed to initialize providers');
    mockInitializeProviders.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Failed to initialize providers');
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Error fetching market data:',
      error,
    );
  });

  it('should handle getMarkets error', async () => {
    const error = new Error('Failed to fetch markets');
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Failed to fetch markets');
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Error fetching market data:',
      error,
    );
  });

  it('should handle non-Error exceptions', async () => {
    const error = 'String error';
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockRejectedValue(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Failed to fetch market data');
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Error fetching market data:',
      error,
    );
  });

  it('should refetch data when calling refetch', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue(mockMarketData);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(1);

    // Call refetch
    result.current.refetch();

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(2);
  });

  it('should handle refetch error', async () => {
    const error = new Error('Refetch failed');
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets
      .mockResolvedValueOnce(mockMarketData)
      .mockRejectedValueOnce(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);

    // Call refetch with error
    result.current.refetch();

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.marketData).toBe(null);
    expect(result.current.error).toBe('Refetch failed');
  });

  it('should log console message on hook call', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {
      // Mock implementation
    });

    renderHook(() => usePredictMarketData());

    expect(consoleSpy).toHaveBeenCalledWith('usePredictMarketData hook called');

    // Cleanup
    consoleSpy.mockRestore();
  });

  it('should maintain stable refetch function reference', () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue(mockMarketData);

    const { result, rerender } = renderHook(() => usePredictMarketData());

    const firstRefetch = result.current.refetch;

    // Trigger a re-render
    rerender();

    expect(result.current.refetch).toBe(firstRefetch);
  });
});
