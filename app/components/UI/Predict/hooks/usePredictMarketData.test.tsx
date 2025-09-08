import { renderHook, act } from '@testing-library/react-hooks';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { usePredictMarketData } from './usePredictMarketData';
import { PredictMarket, Recurrence } from '../types';

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

  const mockMarketData: PredictMarket[] = [
    {
      id: 'market-1',
      providerId: 'polymarket',
      slug: 'bitcoin-price-prediction',
      title: 'Will Bitcoin reach $100k by end of 2024?',
      description: 'Bitcoin price prediction market',
      image: 'https://example.com/btc.png',
      status: 'open',
      recurrence: Recurrence.NONE,
      categories: ['crypto', 'trending'],
      outcomes: [
        {
          id: 'outcome-1',
          marketId: 'market-1',
          title: 'Yes',
          description: 'Bitcoin will reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-1',
              title: 'Yes',
              price: 0.65,
            },
          ],
          volume: 1000000,
          groupItemTitle: 'Yes/No',
        },
        {
          id: 'outcome-2',
          marketId: 'market-1',
          title: 'No',
          description: 'Bitcoin will not reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-2',
              title: 'No',
              price: 0.35,
            },
          ],
          volume: 1000000,
          groupItemTitle: 'Yes/No',
        },
      ],
    },
    {
      id: 'market-2',
      providerId: 'polymarket',
      slug: 'ethereum-price-prediction',
      title: 'Will Ethereum reach $100000 by end of 2025?',
      description: 'Ethereum price prediction market',
      image: 'https://example.com/eth.png',
      status: 'open',
      recurrence: Recurrence.NONE,
      categories: ['crypto', 'trending'],
      outcomes: [
        {
          id: 'outcome-3',
          marketId: 'market-2',
          title: 'Yes',
          description: 'Ethereum will reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-3',
              title: 'Yes',
              price: 0.45,
            },
          ],
          volume: 500000,
          groupItemTitle: 'Yes/No',
        },
        {
          id: 'outcome-4',
          marketId: 'market-2',
          title: 'No',
          description: 'Ethereum will not reach $100k',
          image: '',
          status: 'open',
          tokens: [
            {
              id: 'token-4',
              title: 'No',
              price: 0.55,
            },
          ],
          volume: 500000,
          groupItemTitle: 'Yes/No',
        },
      ],
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

  it.skip('should fetch market data successfully', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue(mockMarketData);

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
    expect(result.current.marketData).toEqual(mockMarketData);
    expect(result.current.error).toBe(null);
    expect(mockInitializeProviders).toHaveBeenCalledTimes(1);
    expect(mockGetMarkets).toHaveBeenCalledTimes(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      'Fetching market data for category:',
      'trending',
      'search:',
      undefined,
      'offset:',
      0,
      'limit:',
      20,
    );
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

    expect(result.current.isFetching).toBe(false);
    expect(result.current.marketData).toEqual([]);
    expect(result.current.error).toBe(null);
  });

  it('should handle empty market data array', async () => {
    mockInitializeProviders.mockResolvedValue(undefined);
    mockGetMarkets.mockResolvedValue([]);

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
    mockGetMarkets.mockResolvedValue(mockMarketData);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictMarketData(),
    );

    await waitForNextUpdate();

    expect(mockGetMarkets).toHaveBeenCalledTimes(1);

    // Call refetch
    await act(async () => {
      await result.current.refetch();
    });

    expect(mockGetMarkets).toHaveBeenCalledTimes(2);
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
