import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  PerpsStreamProvider,
  usePerpsStream,
  PerpsStreamManager,
} from './PerpsStreamManager';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { PriceUpdate, PerpsMarketData } from '../controllers/types';

// Mock dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;

// Test component that uses the stream hook
const TestPriceComponent = ({
  onUpdate,
}: {
  onUpdate?: (prices: Record<string, PriceUpdate>) => void;
}) => {
  const stream = usePerpsStream();

  React.useEffect(() => {
    const unsubscribe = stream.prices.subscribeToSymbols({
      symbols: ['BTC-PERP'],
      callback: (prices: Record<string, PriceUpdate>) => {
        onUpdate?.(prices);
      },
      throttleMs: 100,
    });

    return () => {
      unsubscribe();
    };
  }, [stream, onUpdate]);

  return <Text testID="price-display">Test Component</Text>;
};

describe('PerpsStreamManager', () => {
  let mockSubscribeToPrices: jest.Mock;
  let mockUnsubscribeFromPrices: jest.Mock;
  let mockSubscribeToOrders: jest.Mock;
  let mockSubscribeToPositions: jest.Mock;
  let mockSubscribeToAccount: jest.Mock;
  let testStreamManager: PerpsStreamManager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Create a fresh stream manager for each test
    testStreamManager = new PerpsStreamManager();

    // Setup default mocks
    mockSubscribeToPrices = jest.fn();
    mockUnsubscribeFromPrices = jest.fn();
    mockSubscribeToOrders = jest.fn();
    mockSubscribeToPositions = jest.fn();
    mockSubscribeToAccount = jest.fn();

    // Setup mock return values for all subscription methods
    mockSubscribeToOrders.mockReturnValue(jest.fn());
    mockSubscribeToPositions.mockReturnValue(jest.fn());
    mockSubscribeToAccount.mockReturnValue(jest.fn());

    mockEngine.context.PerpsController = {
      subscribeToPrices: mockSubscribeToPrices,
      unsubscribeFromPrices: mockUnsubscribeFromPrices,
      subscribeToOrders: mockSubscribeToOrders,
      subscribeToPositions: mockSubscribeToPositions,
      subscribeToAccount: mockSubscribeToAccount,
    } as unknown as typeof mockEngine.context.PerpsController;

    mockDevLogger.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <Text>Child Component</Text>
      </PerpsStreamProvider>,
    );

    expect(getByText('Child Component')).toBeDefined();
  });

  it('should throw error when usePerpsStream is used outside provider', () => {
    // Suppress console.error for this test since we expect an error
    const originalError = console.error;
    console.error = jest.fn();

    const TestComponentOutsideProvider = () => {
      usePerpsStream();
      return <Text>Test</Text>;
    };

    // The hook should throw an error when used outside of the provider
    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('usePerpsStream must be used within PerpsStreamProvider');

    console.error = originalError;
  });

  it('should provide immediate cached data on subscription', async () => {
    // Setup mock subscription that will trigger updates
    mockSubscribeToPrices.mockImplementation(
      (params: { callback: (updates: PriceUpdate[]) => void }) => {
        // Simulate immediate cached data with all required fields
        const cachedData: PriceUpdate[] = [
          {
            coin: 'BTC-PERP',
            price: '50000',
            percentChange24h: '5',
            timestamp: Date.now(),
            bestBid: '49900',
            bestAsk: '50100',
            spread: '200',
            markPrice: '50050',
          },
        ];
        params.callback(cachedData);
        return jest.fn();
      },
    );

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    // Should receive cached data immediately
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        'BTC-PERP': {
          coin: 'BTC-PERP',
          price: '50000',
          timestamp: expect.any(Number),
          percentChange24h: '5',
          bestBid: '49900',
          bestAsk: '50100',
          spread: '200',
          markPrice: '50050',
          funding: undefined,
          openInterest: undefined,
          volume24h: undefined,
        },
      });
    });
  });

  it('should throttle updates after first immediate update', async () => {
    let controllerCallback: ((updates: PriceUpdate[]) => void) | null = null;
    mockSubscribeToPrices.mockImplementation(
      (params: { callback: (updates: PriceUpdate[]) => void }) => {
        controllerCallback = params.callback;
        return jest.fn();
      },
    );

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    // Wait for subscription setup
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    // First update should be immediate
    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50000',
          percentChange24h: '5',
          timestamp: Date.now(),
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    // Subsequent updates should be throttled
    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50100',
          percentChange24h: '5.1',
          timestamp: Date.now(),
        },
      ]);
    });

    // Should not be called immediately
    expect(onUpdate).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger throttled update
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenLastCalledWith({
        'BTC-PERP': {
          coin: 'BTC-PERP',
          price: '50100',
          timestamp: expect.any(Number),
          percentChange24h: '5.1',
          bestBid: undefined,
          bestAsk: undefined,
          spread: undefined,
          markPrice: undefined,
          funding: undefined,
          openInterest: undefined,
          volume24h: undefined,
        },
      });
    });
  });

  it('should handle multiple rapid updates with throttling', async () => {
    let controllerCallback: ((updates: PriceUpdate[]) => void) | null = null;
    mockSubscribeToPrices.mockImplementation(
      (params: { callback: (updates: PriceUpdate[]) => void }) => {
        controllerCallback = params.callback;
        return jest.fn();
      },
    );

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    // Wait for subscription setup
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    // First update (immediate)
    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50000',
          percentChange24h: '5',
          timestamp: Date.now(),
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    // Multiple rapid updates during throttle period
    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50100',
          percentChange24h: '5.1',
          timestamp: Date.now(),
        },
      ]);
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50200',
          percentChange24h: '5.2',
          timestamp: Date.now(),
        },
      ]);
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50300',
          percentChange24h: '5.3',
          timestamp: Date.now(),
        },
      ]);
    });

    // Still only 1 call (first immediate)
    expect(onUpdate).toHaveBeenCalledTimes(1);

    // Advance timer to trigger throttled update
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should receive the latest update
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenLastCalledWith({
        'BTC-PERP': {
          coin: 'BTC-PERP',
          price: '50300',
          timestamp: expect.any(Number),
          percentChange24h: '5.3',
          bestBid: undefined,
          bestAsk: undefined,
          spread: undefined,
          markPrice: undefined,
          funding: undefined,
          openInterest: undefined,
          volume24h: undefined,
        },
      });
    });
  });

  it('should handle subscription without throttling', async () => {
    let controllerCallback: ((updates: PriceUpdate[]) => void) | null = null;
    mockSubscribeToPrices.mockImplementation(
      (params: { callback: (updates: PriceUpdate[]) => void }) => {
        controllerCallback = params.callback;
        return jest.fn();
      },
    );

    const TestNoThrottleComponent = ({
      onUpdate,
    }: {
      onUpdate?: (prices: Record<string, PriceUpdate>) => void;
    }) => {
      const stream = usePerpsStream();

      React.useEffect(() => {
        const unsubscribe = stream.prices.subscribeToSymbols({
          symbols: ['ETH-PERP'],
          callback: (prices: Record<string, PriceUpdate>) => {
            onUpdate?.(prices);
          },
          throttleMs: 0, // No throttling
        });

        return () => {
          unsubscribe();
        };
      }, [stream, onUpdate]);

      return <Text>No Throttle</Text>;
    };

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestNoThrottleComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    // Wait for subscription setup
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    // Reset the mock call count after initial setup
    onUpdate.mockClear();

    // All updates should be immediate when throttleMs is 0
    act(() => {
      controllerCallback?.([
        {
          coin: 'ETH-PERP',
          price: '3000',
          timestamp: Date.now(),
          percentChange24h: '2',
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'ETH-PERP',
          price: '3010',
          timestamp: Date.now(),
          percentChange24h: '2.1',
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'ETH-PERP',
          price: '3020',
          timestamp: Date.now(),
          percentChange24h: '2.2',
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(3);
    });
  });

  it('should clean up timers on unsubscribe', async () => {
    let controllerCallback: ((updates: PriceUpdate[]) => void) | null = null;
    const unsubscribeMock = jest.fn();
    mockSubscribeToPrices.mockImplementation(
      (params: { callback: (updates: PriceUpdate[]) => void }) => {
        controllerCallback = params.callback;
        return unsubscribeMock;
      },
    );

    const onUpdate = jest.fn();

    const { unmount } = render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    // Wait for subscription setup
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    // First update (immediate)
    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50000',
          timestamp: Date.now(),
          percentChange24h: '5',
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    // Queue a throttled update
    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50100',
          timestamp: Date.now(),
          percentChange24h: '5.1',
        },
      ]);
    });

    // Unmount before timer fires
    unmount();

    // Advance timer
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should not receive update after unmount
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('should subscribe to prices when component mounts', async () => {
    mockSubscribeToPrices.mockImplementation(() => jest.fn());

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    // Wait for subscription to be established
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalledWith({
        symbols: ['BTC-PERP'],
        callback: expect.any(Function),
      });
    });
  });

  it('should unsubscribe when component unmounts', async () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    unmount();

    // Should call the unsubscribe function returned by subscribeToPrices
    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  it('should deliver first update immediately', async () => {
    const onUpdate = jest.fn();
    let priceCallback: (data: PriceUpdate[]) => void = jest.fn();

    mockSubscribeToPrices.mockImplementation((params) => {
      priceCallback = params.callback;
      return jest.fn();
    });

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    const firstUpdate: PriceUpdate = {
      coin: 'BTC-PERP',

      price: '50000',
      timestamp: Date.now(),
    };

    // Send first update from WebSocket
    act(() => {
      priceCallback([firstUpdate]);
    });

    // First update should be delivered immediately
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
      const call = onUpdate.mock.calls[0][0];
      expect(call['BTC-PERP']).toMatchObject({
        coin: 'BTC-PERP',
        price: '50000',
      });
    });
  });

  describe('clearCache', () => {
    it('should clear cache and notify subscribers with empty data', async () => {
      let priceCallback: (data: PriceUpdate[]) => void = jest.fn();
      const mockUnsubscribe = jest.fn();

      mockSubscribeToPrices.mockImplementation((params) => {
        priceCallback = params.callback;
        return mockUnsubscribe;
      });

      const onUpdate = jest.fn();

      render(
        <PerpsStreamProvider testStreamManager={testStreamManager}>
          <TestPriceComponent onUpdate={onUpdate} />
        </PerpsStreamProvider>,
      );

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalled();
      });

      // Send initial data
      act(() => {
        priceCallback([
          {
            coin: 'BTC-PERP',
            price: '50000',
            timestamp: Date.now(),
            percentChange24h: '5',
          },
        ]);
      });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({
          'BTC-PERP': expect.objectContaining({
            coin: 'BTC-PERP',
            price: '50000',
          }),
        });
      });

      // Clear the mock to track only clearCache calls
      onUpdate.mockClear();

      // Clear cache
      act(() => {
        testStreamManager.prices.clearCache();
      });

      // Should disconnect and reconnect
      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });

      // Should notify with empty data after clearing
      expect(onUpdate).toHaveBeenCalledWith({});

      // Should reconnect after delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(2);
      });
    });

    it('should cleanup prewarm subscription when clearing price cache', async () => {
      // Mock the cleanupPrewarm method to verify it's called
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.prices,
        'cleanupPrewarm',
      );

      // Set up prewarm subscription
      await testStreamManager.prices.prewarm();

      // Clear cache - should call cleanupPrewarm
      act(() => {
        testStreamManager.prices.clearCache();
      });

      // Verify cleanupPrewarm was called
      expect(cleanupPrewarmSpy).toHaveBeenCalled();

      cleanupPrewarmSpy.mockRestore();
    });

    it('should cleanup prewarm subscription when clearing order cache', () => {
      // Mock the cleanupPrewarm method to verify it's called
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.orders,
        'cleanupPrewarm',
      );

      // Set up prewarm subscription
      testStreamManager.orders.prewarm();

      // Clear cache - should call cleanupPrewarm
      act(() => {
        testStreamManager.orders.clearCache();
      });

      // Verify cleanupPrewarm was called
      expect(cleanupPrewarmSpy).toHaveBeenCalled();

      cleanupPrewarmSpy.mockRestore();
    });

    it('should cleanup prewarm subscription when clearing position cache', () => {
      // Mock the cleanupPrewarm method to verify it's called
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.positions,
        'cleanupPrewarm',
      );

      // Set up prewarm subscription
      testStreamManager.positions.prewarm();

      // Clear cache - should call cleanupPrewarm
      act(() => {
        testStreamManager.positions.clearCache();
      });

      // Verify cleanupPrewarm was called
      expect(cleanupPrewarmSpy).toHaveBeenCalled();

      cleanupPrewarmSpy.mockRestore();
    });

    it('should cleanup prewarm subscription when clearing account cache', () => {
      // Mock the cleanupPrewarm method to verify it's called
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.account,
        'cleanupPrewarm',
      );

      // Set up prewarm subscription
      testStreamManager.account.prewarm();

      // Clear cache - should call cleanupPrewarm
      act(() => {
        testStreamManager.account.clearCache();
      });

      // Verify cleanupPrewarm was called
      expect(cleanupPrewarmSpy).toHaveBeenCalled();

      cleanupPrewarmSpy.mockRestore();
    });

    it('should reset all prewarm state when clearing price cache', async () => {
      // Mock market data to populate allMarketSymbols
      const mockGetMarketDataWithPrices = jest.fn();
      const mockMarketData = [
        { symbol: 'BTC', name: 'Bitcoin' },
        { symbol: 'ETH', name: 'Ethereum' },
      ];

      mockEngine.context.PerpsController.getActiveProvider = jest
        .fn()
        .mockReturnValue({
          getMarketDataWithPrices:
            mockGetMarketDataWithPrices.mockResolvedValue(mockMarketData),
        });

      // Mock the cleanupPrewarm method to verify it's called and resets state
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.prices,
        'cleanupPrewarm',
      );

      // Set up prewarm subscription which populates allMarketSymbols
      await testStreamManager.prices.prewarm();

      // Clear cache - should call cleanupPrewarm which resets all state
      act(() => {
        testStreamManager.prices.clearCache();
      });

      // Verify cleanupPrewarm was called
      expect(cleanupPrewarmSpy).toHaveBeenCalled();

      cleanupPrewarmSpy.mockRestore();
    });

    it('should cleanup all prewarm subscriptions when clearing all channel caches', async () => {
      // Create spies for all cleanupPrewarm methods
      const priceCleanupSpy = jest.spyOn(
        testStreamManager.prices,
        'cleanupPrewarm',
      );
      const orderCleanupSpy = jest.spyOn(
        testStreamManager.orders,
        'cleanupPrewarm',
      );
      const positionCleanupSpy = jest.spyOn(
        testStreamManager.positions,
        'cleanupPrewarm',
      );
      const accountCleanupSpy = jest.spyOn(
        testStreamManager.account,
        'cleanupPrewarm',
      );

      // Set up prewarm subscriptions for all channels
      await testStreamManager.prices.prewarm();
      testStreamManager.orders.prewarm();
      testStreamManager.positions.prewarm();
      testStreamManager.account.prewarm();

      // Clear all caches - should call cleanupPrewarm on each channel
      act(() => {
        testStreamManager.prices.clearCache();
        testStreamManager.orders.clearCache();
        testStreamManager.positions.clearCache();
        testStreamManager.account.clearCache();
      });

      // Verify all cleanupPrewarm methods were called
      expect(priceCleanupSpy).toHaveBeenCalled();
      expect(orderCleanupSpy).toHaveBeenCalled();
      expect(positionCleanupSpy).toHaveBeenCalled();
      expect(accountCleanupSpy).toHaveBeenCalled();

      // Clean up spies
      priceCleanupSpy.mockRestore();
      orderCleanupSpy.mockRestore();
      positionCleanupSpy.mockRestore();
      accountCleanupSpy.mockRestore();
    });

    it('should disconnect WebSocket when clearing cache', async () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

      const onUpdate = jest.fn();

      render(
        <PerpsStreamProvider testStreamManager={testStreamManager}>
          <TestPriceComponent onUpdate={onUpdate} />
        </PerpsStreamProvider>,
      );

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalled();
      });

      // Clear cache
      act(() => {
        testStreamManager.prices.clearCache();
      });

      // Should disconnect existing subscription
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should reconnect after clearing cache if there are active subscribers', async () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

      const onUpdate = jest.fn();

      render(
        <PerpsStreamProvider testStreamManager={testStreamManager}>
          <TestPriceComponent onUpdate={onUpdate} />
        </PerpsStreamProvider>,
      );

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
      });

      // Clear cache
      act(() => {
        testStreamManager.prices.clearCache();
      });

      // Advance timer to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should reconnect
      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(2);
      });
    });

    it('should not reconnect if no active subscribers', async () => {
      const mockUnsubscribe = jest.fn();
      mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

      const onUpdate = jest.fn();

      const { unmount } = render(
        <PerpsStreamProvider testStreamManager={testStreamManager}>
          <TestPriceComponent onUpdate={onUpdate} />
        </PerpsStreamProvider>,
      );

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
      });

      // Unmount to remove all subscribers
      unmount();

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });

      // Reset mock
      mockSubscribeToPrices.mockClear();

      // Clear cache with no subscribers
      act(() => {
        testStreamManager.prices.clearCache();
      });

      // Advance timer
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not reconnect
      expect(mockSubscribeToPrices).not.toHaveBeenCalled();
    });
  });

  it('should throttle subsequent updates', async () => {
    const onUpdate = jest.fn();
    let priceCallback: (data: PriceUpdate[]) => void = jest.fn();

    mockSubscribeToPrices.mockImplementation((params) => {
      priceCallback = params.callback;
      return jest.fn();
    });

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    const firstUpdate: PriceUpdate = {
      coin: 'BTC-PERP',

      price: '50000',
      timestamp: Date.now(),
    };

    // Send first update - should be immediate
    act(() => {
      priceCallback([firstUpdate]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    const secondUpdate: PriceUpdate = {
      coin: 'BTC-PERP',

      price: '50100',
      timestamp: Date.now() + 10,
    };

    const thirdUpdate: PriceUpdate = {
      coin: 'BTC-PERP',

      price: '50200',
      timestamp: Date.now() + 20,
    };

    // Send rapid subsequent updates
    act(() => {
      priceCallback([secondUpdate]);
      priceCallback([thirdUpdate]);
    });

    // Should not be called immediately
    expect(onUpdate).toHaveBeenCalledTimes(1);

    // Advance timers to trigger throttle
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should receive the last update after throttle
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      const lastCall = onUpdate.mock.calls[1][0];
      expect(lastCall['BTC-PERP']).toMatchObject({
        coin: 'BTC-PERP',
        price: '50200',
      });
    });
  });

  it('should handle multiple subscribers with different throttle times', async () => {
    const onUpdate1 = jest.fn();
    const onUpdate2 = jest.fn();
    let priceCallback: (data: PriceUpdate[]) => void = jest.fn();

    mockSubscribeToPrices.mockImplementation((params) => {
      priceCallback = params.callback;
      return jest.fn();
    });

    const TestMultipleSubscribers = () => {
      const stream = usePerpsStream();

      React.useEffect(() => {
        const sub1 = stream.prices.subscribeToSymbols({
          symbols: ['BTC-PERP'],
          callback: (prices: Record<string, PriceUpdate>) => {
            onUpdate1(prices);
          },
          throttleMs: 100,
        });

        const sub2 = stream.prices.subscribeToSymbols({
          symbols: ['BTC-PERP'],
          callback: (prices: Record<string, PriceUpdate>) => {
            onUpdate2(prices);
          },
          throttleMs: 200,
        });

        return () => {
          sub1();
          sub2();
        };
      }, [stream]);

      return <Text>Test</Text>;
    };

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestMultipleSubscribers />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    const update: PriceUpdate = {
      coin: 'BTC-PERP',

      price: '50000',
      timestamp: Date.now(),
    };

    // Send update
    act(() => {
      priceCallback([update]);
    });

    // Both should receive first update immediately
    await waitFor(() => {
      expect(onUpdate1).toHaveBeenCalledTimes(1);
      expect(onUpdate2).toHaveBeenCalledTimes(1);
    });

    // Send another update
    const update2: PriceUpdate = {
      ...update,
      price: '50100',
    };

    act(() => {
      priceCallback([update2]);
    });

    // Advance time for first subscriber
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate1).toHaveBeenCalledTimes(2);
      expect(onUpdate2).toHaveBeenCalledTimes(1); // Still waiting
    });

    // Advance time for second subscriber
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate2).toHaveBeenCalledTimes(2);
    });
  });

  it('should handle subscription to multiple symbols', async () => {
    mockSubscribeToPrices.mockImplementation((params) => {
      expect(params.symbols).toEqual(['BTC-PERP', 'ETH-PERP']);
      return jest.fn();
    });

    const TestMultipleSymbols = ({
      onUpdate,
    }: {
      onUpdate: (prices: Record<string, PriceUpdate>) => void;
    }) => {
      const stream = usePerpsStream();

      React.useEffect(() => {
        const sub = stream.prices.subscribeToSymbols({
          symbols: ['BTC-PERP', 'ETH-PERP'],
          callback: (prices: Record<string, PriceUpdate>) => {
            onUpdate(prices);
          },
          throttleMs: 100,
        });

        return () => {
          sub();
        };
      }, [stream, onUpdate]);

      return <Text>Test</Text>;
    };

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestMultipleSymbols onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalledWith({
        symbols: ['BTC-PERP', 'ETH-PERP'],
        callback: expect.any(Function),
      });
    });
  });

  it('should cleanup all subscriptions on provider unmount', async () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribeToPrices.mockReturnValue(mockUnsubscribe);

    const { unmount } = render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    unmount();

    await waitFor(() => {
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('MarketDataChannel', () => {
    const mockGetMarketDataWithPrices = jest.fn();
    const mockMarketData: PerpsMarketData[] = [
      {
        symbol: 'BTC',
        name: 'Bitcoin',
        maxLeverage: '40x',
        price: '$50,000.00',
        change24h: '+2.5%',
        change24hPercent: '2.5',
        volume: '$1.2B',
      },
      {
        symbol: 'ETH',
        name: 'Ethereum',
        maxLeverage: '25x',
        price: '$3,000.00',
        change24h: '-1.2%',
        change24hPercent: '-1.2',
        volume: '$900M',
      },
    ];

    const mockProvider = {
      getMarketDataWithPrices: mockGetMarketDataWithPrices,
    };

    beforeEach(() => {
      mockGetMarketDataWithPrices.mockResolvedValue(mockMarketData);
      mockEngine.context.PerpsController.getActiveProvider = jest
        .fn()
        .mockReturnValue(mockProvider);
    });

    afterEach(() => {
      mockGetMarketDataWithPrices.mockClear();
    });

    it('should fetch market data on first subscription', async () => {
      const callback = jest.fn();

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });

      // Should fetch data immediately
      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      // Should notify subscriber with data
      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockMarketData);
      });

      unsubscribe();
    });

    it('should use cached data for subsequent subscriptions within cache duration', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // First subscription
      const unsubscribe1 = testStreamManager.marketData.subscribe({
        callback: callback1,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
        expect(callback1).toHaveBeenCalledWith(mockMarketData);
      });

      // Second subscription (within cache duration)
      const unsubscribe2 = testStreamManager.marketData.subscribe({
        callback: callback2,
        throttleMs: 0,
      });

      // Should use cached data, not fetch again
      await waitFor(() => {
        expect(callback2).toHaveBeenCalledWith(mockMarketData);
      });

      expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1); // Still only 1 call

      unsubscribe1();
      unsubscribe2();
    });

    it('should refresh market data when refresh() is called', async () => {
      const callback = jest.fn();

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      // Call refresh
      await testStreamManager.marketData.refresh();

      // Should fetch again
      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(2);
      });

      // Should notify subscriber with new data
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('should clear cache when clearCache() is called', async () => {
      const callback = jest.fn();

      // First subscription to populate cache
      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockMarketData);
      });

      // Clear cache
      testStreamManager.marketData.clearCache();

      // Should notify with empty array
      expect(callback).toHaveBeenLastCalledWith([]);

      unsubscribe();
    });

    it('should handle fetch errors gracefully', async () => {
      const callback = jest.fn();
      const error = new Error('Network error');

      mockGetMarketDataWithPrices.mockRejectedValue(error);

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });

      // Wait for fetch attempt
      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalled();
      });

      // Should not crash, callback might receive empty array or cached data
      // depending on implementation

      unsubscribe();
    });

    it('should prewarm market data cache', async () => {
      // Call prewarm
      const cleanup = testStreamManager.marketData.prewarm();

      // Should fetch data immediately
      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      // Cleanup function should be a no-op for REST data
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });

    it('should deduplicate concurrent fetch requests', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // Clear cache to force fetch
      testStreamManager.marketData.clearCache();

      // Two subscriptions at the same time
      const unsubscribe1 = testStreamManager.marketData.subscribe({
        callback: callback1,
        throttleMs: 0,
      });

      const unsubscribe2 = testStreamManager.marketData.subscribe({
        callback: callback2,
        throttleMs: 0,
      });

      // Should only fetch once despite two subscriptions
      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      // Both callbacks should receive data
      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(mockMarketData);
        expect(callback2).toHaveBeenCalledWith(mockMarketData);
      });

      unsubscribe1();
      unsubscribe2();
    });
  });
});
