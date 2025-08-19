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
import type { PriceUpdate } from '../controllers/types';

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

    mockEngine.context.PerpsController = {
      subscribeToPrices: mockSubscribeToPrices,
      unsubscribeFromPrices: mockUnsubscribeFromPrices,
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
});
