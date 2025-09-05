import { renderHook, act } from '@testing-library/react-hooks';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePredictMarketData } from './usePredictMarketData';
import type { PredictEvent } from '../types';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      initializeProviders: jest.fn(),
      getEvents: jest.fn(),
    },
  },
}));

describe('usePredictMarketData', () => {
  const mockInitializeProviders = jest.fn();
  const mockGetEvents = jest.fn();

  const mockEventData: PredictEvent[] = [
    {
      id: 'event-1',
      title: 'Bitcoin Price Prediction',
      markets: [
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
      ],
      series: [{ recurrence: 'daily' }],
    },
    {
      id: 'event-2',
      title: 'Ethereum Price Prediction',
      markets: [
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
      ],
      series: [{ recurrence: 'daily' }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Engine mocks
    (Engine.context.PredictController.initializeProviders as jest.Mock) =
      mockInitializeProviders;
    (Engine.context.PredictController.getEvents as jest.Mock) = mockGetEvents;

    // Setup DevLogger mock
    (DevLogger.log as jest.Mock).mockImplementation(() => {
      // Mock implementation
    });
  });

  it('should fetch market data successfully', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue(mockEventData);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    // Initially loading
    expect(result.current.isFetching).toBe(true);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);

    // Wait for data to load
    await waitForNextUpdate();

    expect(result.current.isFetching).toBe(false);
    expect(result.current.marketData).toEqual(mockEventData);
    expect(result.current.error).toBe(null);
    expect(mockInitializeProviders).toHaveBeenCalledTimes(1);
    expect(mockGetEvents).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Fetching market data for category:',
      'trending',
      'offset:',
      0,
      'limit:',
      20,
    );
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Market data received:',
      mockEventData,
    );
  });

  it('should handle null market data', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue(null);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isFetching).toBe(false);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should handle empty market data array', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(result.current.isFetching).toBe(false);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should refetch data when calling refetch', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue(mockEventData);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(mockGetEvents).toHaveBeenCalledTimes(1);

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetEvents).toHaveBeenCalledTimes(2);
  });

  it('should maintain stable refetch function reference', () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetEvents.mockResolvedValue(mockEventData);

    const { result, rerender } = renderHook(() => usePredictMarketData());

    const firstRefetch = result.current.refetch;

    // Trigger a re-render
    rerender();

    expect(result.current.refetch).toBe(firstRefetch);
  });
});
