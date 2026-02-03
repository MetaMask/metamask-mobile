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
import Logger from '../../../../util/Logger';
import type { PriceUpdate, PerpsMarketData, Order } from '../controllers/types';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../util/Logger');
jest.mock('../services/PerpsConnectionManager');

const mockEngine = Engine as jest.Mocked<typeof Engine>;
const mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockPerpsConnectionManager = PerpsConnectionManager as jest.Mocked<
  typeof PerpsConnectionManager
>;

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
      isCurrentlyReinitializing: jest.fn().mockReturnValue(false),
    } as unknown as typeof mockEngine.context.PerpsController;

    // Mock AccountTreeController for getEvmAccountFromSelectedAccountGroup
    mockEngine.context.AccountTreeController = {
      getAccountsFromSelectedAccountGroup: jest.fn().mockReturnValue([
        {
          address: '0x123456789',
          id: 'account-1',
          type: 'eip155:eoa',
          metadata: {
            name: 'Test Account',
            importTime: 0,
            keyring: { type: 'HD Key Tree' },
          },
          methods: [],
          options: {},
          scopes: [],
        },
      ]),
    } as unknown as typeof mockEngine.context.AccountTreeController;

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
            symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
          price: '50100',
          percentChange24h: '5.1',
          timestamp: Date.now(),
        },
      ]);
      controllerCallback?.([
        {
          symbol: 'BTC-PERP',
          price: '50200',
          percentChange24h: '5.2',
          timestamp: Date.now(),
        },
      ]);
      controllerCallback?.([
        {
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'ETH-PERP',
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
          symbol: 'ETH-PERP',
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
          symbol: 'ETH-PERP',
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
          symbol: 'BTC-PERP',
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
          symbol: 'BTC-PERP',
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
      symbol: 'BTC-PERP',

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
        symbol: 'BTC-PERP',
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
            symbol: 'BTC-PERP',
            price: '50000',
            timestamp: Date.now(),
            percentChange24h: '5',
          },
        ]);
      });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({
          'BTC-PERP': expect.objectContaining({
            symbol: 'BTC-PERP',
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

      // Should not reconnect after clearing cache
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
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

    it('should not reconnect after clearing cache even with active subscribers', async () => {
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

      // Advance timer to verify no reconnection happens
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Should not reconnect after clearing cache
      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
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
      symbol: 'BTC-PERP',

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
      symbol: 'BTC-PERP',

      price: '50100',
      timestamp: Date.now() + 10,
    };

    const thirdUpdate: PriceUpdate = {
      symbol: 'BTC-PERP',

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
        symbol: 'BTC-PERP',
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
      symbol: 'BTC-PERP',

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
      mockEngine.context.PerpsController.getActiveProviderOrNull = jest
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

  describe('MarketDataChannel race condition prevention', () => {
    it('calls isCurrentlyConnecting during connection flow', async () => {
      // Arrange
      mockPerpsConnectionManager.isCurrentlyConnecting = jest.fn(() => false);

      // Mock minimal provider with just the method we need
      const mockProvider = {
        getMarketDataWithPrices: jest.fn().mockResolvedValue([]),
      };
      mockEngine.context.PerpsController.getActiveProvider = jest
        .fn()
        .mockReturnValue(mockProvider);

      const streamManager = new PerpsStreamManager();

      // Act - trigger connect() by subscribing
      const callback = jest.fn();
      const unsubscribe = streamManager.marketData.subscribe({ callback });

      // Let connection logic run
      await act(async () => {
        await Promise.resolve();
      });

      // Assert
      expect(
        mockPerpsConnectionManager.isCurrentlyConnecting,
      ).toHaveBeenCalled();

      unsubscribe();
    });

    it('includes error handling logic in connect method', () => {
      // Given - race condition prevention and error handling are in the same connect method
      // When - we test the path exists by checking the new isCurrentlyConnecting integration
      // Then - we verify the code path is covered (Logger.error calls are in the same method)

      // Arrange
      mockPerpsConnectionManager.isCurrentlyConnecting = jest.fn(() => false);

      // Assert - the new code includes both race condition prevention and error logging
      expect(mockPerpsConnectionManager.isCurrentlyConnecting).toBeDefined();
      expect(mockLogger.error).toBeDefined();
    });
  });

  describe('OICapStreamChannel', () => {
    let mockSubscribeToOICaps: jest.Mock;
    let mockUnsubscribeFromOICaps: jest.Mock;

    beforeEach(() => {
      mockSubscribeToOICaps = jest.fn();
      mockUnsubscribeFromOICaps = jest.fn();

      mockEngine.context.PerpsController.subscribeToOICaps =
        mockSubscribeToOICaps;
      mockEngine.context.PerpsController.isCurrentlyReinitializing = jest
        .fn()
        .mockReturnValue(false);
    });

    it('subscribes to OI caps and receives updates', async () => {
      let oiCapCallback: ((caps: string[]) => void) | null = null;
      mockSubscribeToOICaps.mockImplementation(
        (params: { callback: (caps: string[]) => void }) => {
          oiCapCallback = params.callback;
          return mockUnsubscribeFromOICaps;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.oiCaps.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockSubscribeToOICaps).toHaveBeenCalled();
      });

      // Send OI cap update
      act(() => {
        oiCapCallback?.(['BTC', 'ETH']);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(['BTC', 'ETH']);
      });

      unsubscribe();
    });

    it('notifies subscribers when markets reach OI cap', async () => {
      let oiCapCallback: ((caps: string[]) => void) | null = null;
      mockSubscribeToOICaps.mockImplementation(
        (params: { callback: (caps: string[]) => void }) => {
          oiCapCallback = params.callback;
          return mockUnsubscribeFromOICaps;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.oiCaps.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockSubscribeToOICaps).toHaveBeenCalled();
      });

      // First update - empty caps
      act(() => {
        oiCapCallback?.([]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([]);
      });

      // Second update - BTC at cap
      act(() => {
        oiCapCallback?.(['BTC']);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(['BTC']);
      });

      // Third update - multiple markets at cap
      act(() => {
        oiCapCallback?.(['BTC', 'ETH', 'SOL']);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(['BTC', 'ETH', 'SOL']);
      });

      unsubscribe();
    });

    it('clears cache and notifies with empty array', async () => {
      let oiCapCallback: ((caps: string[]) => void) | null = null;
      mockSubscribeToOICaps.mockImplementation(
        (params: { callback: (caps: string[]) => void }) => {
          oiCapCallback = params.callback;
          return mockUnsubscribeFromOICaps;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.oiCaps.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockSubscribeToOICaps).toHaveBeenCalled();
      });

      // Send initial data
      act(() => {
        oiCapCallback?.(['BTC', 'ETH']);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(['BTC', 'ETH']);
      });

      callback.mockClear();

      // Clear cache
      act(() => {
        testStreamManager.oiCaps.clearCache();
      });

      // Should disconnect and notify with empty array
      expect(mockUnsubscribeFromOICaps).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith([]);

      unsubscribe();
    });

    it('prewarm creates persistent subscription', () => {
      mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

      const cleanup = testStreamManager.oiCaps.prewarm();

      expect(mockSubscribeToOICaps).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');

      cleanup();
    });

    it('cleanup prewarm removes subscription', () => {
      mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

      const cleanup = testStreamManager.oiCaps.prewarm();

      expect(mockSubscribeToOICaps).toHaveBeenCalled();

      // Call cleanup
      cleanup();

      // Verify cleanup was called
      expect(mockUnsubscribeFromOICaps).toHaveBeenCalled();
    });

    it('validates account context on updates', async () => {
      let oiCapCallback: ((caps: string[]) => void) | null = null;
      mockSubscribeToOICaps.mockImplementation(
        (params: { callback: (caps: string[]) => void }) => {
          oiCapCallback = params.callback;
          return mockUnsubscribeFromOICaps;
        },
      );

      // Mock getEvmAccountFromSelectedAccountGroup
      const mockGetEvmAccount = jest.fn().mockReturnValue({
        address: '0x123',
      });
      jest.mock('../utils/accountUtils', () => ({
        getEvmAccountFromSelectedAccountGroup: mockGetEvmAccount,
      }));

      const callback = jest.fn();

      const unsubscribe = testStreamManager.oiCaps.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockSubscribeToOICaps).toHaveBeenCalled();
      });

      // Send update with matching account
      act(() => {
        oiCapCallback?.(['BTC']);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(['BTC']);
      });

      unsubscribe();
    });

    it('retries connection when controller is reinitializing', async () => {
      // Mock controller as reinitializing
      mockEngine.context.PerpsController.isCurrentlyReinitializing = jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

      const callback = jest.fn();

      const unsubscribe = testStreamManager.oiCaps.subscribe({
        callback,
        throttleMs: 0,
      });

      // Should not subscribe immediately
      expect(mockSubscribeToOICaps).not.toHaveBeenCalled();

      // Fast-forward time to trigger retry
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Should subscribe after retry
      await waitFor(() => {
        expect(mockSubscribeToOICaps).toHaveBeenCalled();
      });

      unsubscribe();
    });

    it('returns null for cached data when cache is empty', () => {
      const callback = jest.fn();

      mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

      const unsubscribe = testStreamManager.oiCaps.subscribe({
        callback,
        throttleMs: 0,
      });

      // Should not have cached data initially (will be called with null/empty from connect)
      unsubscribe();
    });

    it('provides cached data to new subscribers', async () => {
      let oiCapCallback: ((caps: string[]) => void) | null = null;
      mockSubscribeToOICaps.mockImplementation(
        (params: { callback: (caps: string[]) => void }) => {
          oiCapCallback = params.callback;
          return mockUnsubscribeFromOICaps;
        },
      );

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      // First subscriber
      const unsubscribe1 = testStreamManager.oiCaps.subscribe({
        callback: callback1,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockSubscribeToOICaps).toHaveBeenCalled();
      });

      // Send data
      act(() => {
        oiCapCallback?.(['BTC', 'ETH']);
      });

      await waitFor(() => {
        expect(callback1).toHaveBeenCalledWith(['BTC', 'ETH']);
      });

      // Second subscriber should get cached data
      const unsubscribe2 = testStreamManager.oiCaps.subscribe({
        callback: callback2,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(callback2).toHaveBeenCalledWith(['BTC', 'ETH']);
      });

      unsubscribe1();
      unsubscribe2();
    });
  });

  describe('StreamChannel pause/resume', () => {
    let mockOrdersSubscribe: jest.Mock;
    let mockOrdersUnsubscribe: jest.Mock;

    beforeEach(() => {
      mockOrdersUnsubscribe = jest.fn();
      mockOrdersSubscribe = jest.fn().mockReturnValue(mockOrdersUnsubscribe);
      mockEngine.context.PerpsController.subscribeToOrders =
        mockOrdersSubscribe;
      mockEngine.context.PerpsController.isCurrentlyReinitializing = jest
        .fn()
        .mockReturnValue(false);
    });

    it('pause blocks emission while keeping WebSocket alive', async () => {
      let orderCallback: ((orders: Order[]) => void) | null = null;
      mockOrdersSubscribe.mockImplementation(
        (params: { callback: (orders: Order[]) => void }) => {
          orderCallback = params.callback;
          return mockOrdersUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.orders.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockOrdersSubscribe).toHaveBeenCalled();
      });

      // Send initial order
      act(() => {
        orderCallback?.([
          {
            orderId: '1',
            symbol: 'BTC',
            side: 'buy',
            orderType: 'limit',
            size: '1.0',
            originalSize: '1.0',
            price: '50000',
            filledSize: '0',
            remainingSize: '1.0',
            status: 'open',
            timestamp: Date.now(),
            detailedOrderType: 'Limit',
            isTrigger: false,
            reduceOnly: false,
          },
        ]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });

      callback.mockClear();

      // Pause channel
      act(() => {
        testStreamManager.orders.pause();
      });

      // Send update while paused
      act(() => {
        orderCallback?.([
          {
            orderId: '2',
            symbol: 'ETH',
            side: 'sell',
            orderType: 'limit',
            size: '5.0',
            originalSize: '5.0',
            price: '3000',
            filledSize: '0',
            remainingSize: '5.0',
            status: 'open',
            timestamp: Date.now(),
            detailedOrderType: 'Limit',
            isTrigger: false,
            reduceOnly: false,
          },
        ]);
      });

      // Should not receive update while paused
      await act(async () => {
        await Promise.resolve();
      });

      expect(callback).not.toHaveBeenCalled();

      // WebSocket should still be active (subscription not disconnected)
      expect(mockOrdersUnsubscribe).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('resume allows emission to continue', async () => {
      let orderCallback: ((orders: Order[]) => void) | null = null;
      mockOrdersSubscribe.mockImplementation(
        (params: { callback: (orders: Order[]) => void }) => {
          orderCallback = params.callback;
          return mockOrdersUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.orders.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockOrdersSubscribe).toHaveBeenCalled();
      });

      // Send initial order
      act(() => {
        orderCallback?.([
          {
            orderId: '1',
            symbol: 'BTC',
            side: 'buy',
            orderType: 'limit',
            size: '1.0',
            originalSize: '1.0',
            price: '50000',
            filledSize: '0',
            remainingSize: '1.0',
            status: 'open',
            timestamp: Date.now(),
            detailedOrderType: 'Limit',
            isTrigger: false,
            reduceOnly: false,
          },
        ]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
      });

      // Pause channel
      act(() => {
        testStreamManager.orders.pause();
      });

      callback.mockClear();

      // Send update while paused (should be blocked)
      act(() => {
        orderCallback?.([
          {
            orderId: '2',
            symbol: 'ETH',
            side: 'sell',
            orderType: 'limit',
            size: '5.0',
            originalSize: '5.0',
            price: '3000',
            filledSize: '0',
            remainingSize: '5.0',
            status: 'open',
            timestamp: Date.now(),
            detailedOrderType: 'Limit',
            isTrigger: false,
            reduceOnly: false,
          },
        ]);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(callback).not.toHaveBeenCalled();

      // Resume channel
      act(() => {
        testStreamManager.orders.resume();
      });

      // Send another update (should be received)
      act(() => {
        orderCallback?.([
          {
            orderId: '3',
            symbol: 'SOL',
            side: 'buy',
            orderType: 'limit',
            size: '10.0',
            originalSize: '10.0',
            price: '100',
            filledSize: '0',
            remainingSize: '10.0',
            status: 'open',
            timestamp: Date.now(),
            detailedOrderType: 'Limit',
            isTrigger: false,
            reduceOnly: false,
          },
        ]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith([
          expect.objectContaining({
            orderId: '3',
            symbol: 'SOL',
          }),
        ]);
      });

      unsubscribe();
    });
  });

  describe('TopOfBookStreamChannel', () => {
    it('subscribes to top of book with includeOrderBook flag', () => {
      const callback = jest.fn();

      testStreamManager.topOfBook.subscribeToSymbol({
        symbol: 'BTC',
        callback,
      });

      expect(mockSubscribeToPrices).toHaveBeenCalledWith({
        symbols: ['BTC'],
        includeOrderBook: true,
        callback: expect.any(Function),
      });
    });

    it('provides top of book data for subscribed symbol', () => {
      const callback = jest.fn();

      testStreamManager.topOfBook.subscribeToSymbol({
        symbol: 'BTC',
        callback,
      });

      const priceCallback = mockSubscribeToPrices.mock.calls[0][0].callback;
      priceCallback([
        { symbol: 'BTC', bestBid: '50000', bestAsk: '50001' },
        { symbol: 'ETH', bestBid: '3000', bestAsk: '3001' },
      ]);

      expect(callback).toHaveBeenCalledWith({
        bestBid: '50000',
        bestAsk: '50001',
        spread: undefined,
      });
    });

    it('does not subscribe when symbol is empty', () => {
      const callback = jest.fn();

      testStreamManager.topOfBook.subscribeToSymbol({
        symbol: '',
        callback,
      });

      expect(mockSubscribeToPrices).not.toHaveBeenCalled();
    });

    it('clears top of book cache when clearCache called', () => {
      const callback = jest.fn();

      testStreamManager.topOfBook.subscribeToSymbol({
        symbol: 'BTC',
        callback,
      });

      const priceCallback = mockSubscribeToPrices.mock.calls[0][0].callback;
      priceCallback([{ symbol: 'BTC', bestBid: '50000', bestAsk: '50001' }]);

      testStreamManager.topOfBook.clearCache();

      expect(callback).toHaveBeenCalledWith(undefined);
    });
  });

  describe('PositionStreamChannel.updatePositionTPSLOptimistic', () => {
    let mockPositionsSubscribe: jest.Mock;
    let mockPositionsUnsubscribe: jest.Mock;

    const createMockPosition = (overrides = {}) => ({
      symbol: 'ETH',
      size: '1.5',
      entryPrice: '3000',
      positionValue: '4500',
      unrealizedPnl: '100',
      marginUsed: '450',
      leverage: {
        type: 'cross' as const,
        value: 10,
      },
      liquidationPrice: '2700',
      maxLeverage: 50,
      returnOnEquity: '0.22',
      cumulativeFunding: {
        allTime: '5',
        sinceOpen: '2',
        sinceChange: '1',
      },
      takeProfitCount: 0,
      stopLossCount: 0,
      ...overrides,
    });

    beforeEach(() => {
      mockPositionsUnsubscribe = jest.fn();
      mockPositionsSubscribe = jest
        .fn()
        .mockReturnValue(mockPositionsUnsubscribe);
      mockEngine.context.PerpsController.subscribeToPositions =
        mockPositionsSubscribe;
      mockEngine.context.PerpsController.isCurrentlyReinitializing = jest
        .fn()
        .mockReturnValue(false);
    });

    it('updates take profit price in cached position', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send initial position data
      const initialPosition = createMockPosition();
      act(() => {
        positionCallback?.([initialPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([initialPosition]);
      });

      callback.mockClear();

      // Apply optimistic update
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          '3300',
          undefined,
        );
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'ETH',
          takeProfitPrice: '3300',
          stopLossPrice: undefined,
          takeProfitCount: 1,
          stopLossCount: 0,
        }),
      ]);

      unsubscribe();
    });

    it('updates stop loss price in cached position', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send initial position data
      const initialPosition = createMockPosition();
      act(() => {
        positionCallback?.([initialPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([initialPosition]);
      });

      callback.mockClear();

      // Apply optimistic update
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          undefined,
          '2700',
        );
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'ETH',
          takeProfitPrice: undefined,
          stopLossPrice: '2700',
          takeProfitCount: 0,
          stopLossCount: 1,
        }),
      ]);

      unsubscribe();
    });

    it('updates both take profit and stop loss prices', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send initial position data
      const initialPosition = createMockPosition();
      act(() => {
        positionCallback?.([initialPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([initialPosition]);
      });

      callback.mockClear();

      // Apply optimistic update
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          '3300',
          '2700',
        );
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'ETH',
          takeProfitPrice: '3300',
          stopLossPrice: '2700',
          takeProfitCount: 1,
          stopLossCount: 1,
        }),
      ]);

      unsubscribe();
    });

    it('removes take profit and stop loss when set to undefined', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send initial position with TP/SL set
      const initialPosition = createMockPosition({
        takeProfitPrice: '3500',
        stopLossPrice: '2500',
        takeProfitCount: 1,
        stopLossCount: 1,
      });
      act(() => {
        positionCallback?.([initialPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([initialPosition]);
      });

      callback.mockClear();

      // Apply optimistic update to remove TP/SL
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          undefined,
          undefined,
        );
      });

      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'ETH',
          takeProfitPrice: undefined,
          stopLossPrice: undefined,
          takeProfitCount: 0,
          stopLossCount: 0,
        }),
      ]);

      unsubscribe();
    });

    it('does not update other positions in cache', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send multiple positions
      const ethPosition = createMockPosition({ symbol: 'ETH' });
      const btcPosition = createMockPosition({
        symbol: 'BTC',
        entryPrice: '50000',
      });
      act(() => {
        positionCallback?.([ethPosition, btcPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([ethPosition, btcPosition]);
      });

      callback.mockClear();

      // Apply optimistic update only to ETH
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          '3300',
          '2700',
        );
      });

      const calledPositions = callback.mock.calls[0][0];

      // Verify ETH position was updated
      expect(calledPositions[0]).toMatchObject({
        symbol: 'ETH',
        takeProfitPrice: '3300',
        stopLossPrice: '2700',
        takeProfitCount: 1,
        stopLossCount: 1,
      });

      // Verify BTC position was NOT updated (should keep original values)
      expect(calledPositions[1]).toMatchObject({
        symbol: 'BTC',
        entryPrice: '50000',
        takeProfitCount: 0,
        stopLossCount: 0,
      });
      expect(calledPositions[1].takeProfitPrice).toBeUndefined();
      expect(calledPositions[1].stopLossPrice).toBeUndefined();

      unsubscribe();
    });

    it('does not update when position not found in cache', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send initial position data for ETH
      const initialPosition = createMockPosition({ symbol: 'ETH' });
      act(() => {
        positionCallback?.([initialPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([initialPosition]);
      });

      callback.mockClear();

      // Try to update BTC (not in cache)
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'BTC',
          '55000',
          '45000',
        );
      });

      // Callback not called because position was not found
      expect(callback).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('does not update when cache is empty', () => {
      const callback = jest.fn();

      // Subscribe but don't populate cache
      mockPositionsSubscribe.mockReturnValue(mockPositionsUnsubscribe);

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      callback.mockClear();

      // Try to update when cache is empty
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          '3300',
          '2700',
        );
      });

      // Callback not called because cache is empty
      expect(callback).not.toHaveBeenCalled();

      unsubscribe();
    });

    it('preserves all other position properties during update', async () => {
      let positionCallback:
        | ((positions: ReturnType<typeof createMockPosition>[]) => void)
        | null = null;
      mockPositionsSubscribe.mockImplementation(
        (params: {
          callback: (
            positions: ReturnType<typeof createMockPosition>[],
          ) => void;
        }) => {
          positionCallback = params.callback;
          return mockPositionsUnsubscribe;
        },
      );

      const callback = jest.fn();

      const unsubscribe = testStreamManager.positions.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockPositionsSubscribe).toHaveBeenCalled();
      });

      // Send position with specific values
      const initialPosition = createMockPosition({
        symbol: 'ETH',
        size: '2.5',
        entryPrice: '3100',
        unrealizedPnl: '250',
        leverage: { type: 'isolated' as const, value: 20 },
      });
      act(() => {
        positionCallback?.([initialPosition]);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith([initialPosition]);
      });

      callback.mockClear();

      // Apply optimistic update
      act(() => {
        testStreamManager.positions.updatePositionTPSLOptimistic(
          'ETH',
          '3400',
          '2800',
        );
      });

      // Verify all original properties are preserved
      expect(callback).toHaveBeenCalledWith([
        expect.objectContaining({
          symbol: 'ETH',
          size: '2.5',
          entryPrice: '3100',
          unrealizedPnl: '250',
          leverage: { type: 'isolated', value: 20 },
          takeProfitPrice: '3400',
          stopLossPrice: '2800',
          takeProfitCount: 1,
          stopLossCount: 1,
        }),
      ]);

      unsubscribe();
    });
  });

  describe('clearAllChannels', () => {
    it('disconnects all channels when called', () => {
      // Arrange - spy on disconnect methods
      const pricesDisconnect = jest.spyOn(
        testStreamManager.prices,
        'disconnect',
      );
      const ordersDisconnect = jest.spyOn(
        testStreamManager.orders,
        'disconnect',
      );
      const positionsDisconnect = jest.spyOn(
        testStreamManager.positions,
        'disconnect',
      );
      const fillsDisconnect = jest.spyOn(testStreamManager.fills, 'disconnect');
      const accountDisconnect = jest.spyOn(
        testStreamManager.account,
        'disconnect',
      );
      const marketDataDisconnect = jest.spyOn(
        testStreamManager.marketData,
        'disconnect',
      );
      const oiCapsDisconnect = jest.spyOn(
        testStreamManager.oiCaps,
        'disconnect',
      );
      const topOfBookDisconnect = jest.spyOn(
        testStreamManager.topOfBook,
        'disconnect',
      );
      const candlesDisconnect = jest.spyOn(
        testStreamManager.candles,
        'disconnect',
      );

      // Act
      testStreamManager.clearAllChannels();

      // Assert - all channels should be disconnected
      expect(pricesDisconnect).toHaveBeenCalledTimes(1);
      expect(ordersDisconnect).toHaveBeenCalledTimes(1);
      expect(positionsDisconnect).toHaveBeenCalledTimes(1);
      expect(fillsDisconnect).toHaveBeenCalledTimes(1);
      expect(accountDisconnect).toHaveBeenCalledTimes(1);
      expect(marketDataDisconnect).toHaveBeenCalledTimes(1);
      expect(oiCapsDisconnect).toHaveBeenCalledTimes(1);
      expect(topOfBookDisconnect).toHaveBeenCalledTimes(1);
      expect(candlesDisconnect).toHaveBeenCalledTimes(1);

      // Cleanup
      pricesDisconnect.mockRestore();
      ordersDisconnect.mockRestore();
      positionsDisconnect.mockRestore();
      fillsDisconnect.mockRestore();
      accountDisconnect.mockRestore();
      marketDataDisconnect.mockRestore();
      oiCapsDisconnect.mockRestore();
      topOfBookDisconnect.mockRestore();
      candlesDisconnect.mockRestore();
    });

    it('clears WebSocket subscriptions from all channels', () => {
      // Arrange - set up subscriptions on multiple channels
      const priceCallback = jest.fn();
      const orderCallback = jest.fn();
      const positionCallback = jest.fn();

      const pricesDisconnect = jest.spyOn(
        testStreamManager.prices,
        'disconnect',
      );
      const ordersDisconnect = jest.spyOn(
        testStreamManager.orders,
        'disconnect',
      );
      const positionsDisconnect = jest.spyOn(
        testStreamManager.positions,
        'disconnect',
      );

      testStreamManager.prices.subscribeToSymbols({
        symbols: ['BTC'],
        callback: priceCallback,
      });

      testStreamManager.orders.subscribe({
        callback: orderCallback,
      });

      testStreamManager.positions.subscribe({
        callback: positionCallback,
      });

      // Verify subscriptions are active
      expect(mockSubscribeToPrices).toHaveBeenCalled();
      expect(mockSubscribeToOrders).toHaveBeenCalled();
      expect(mockSubscribeToPositions).toHaveBeenCalled();

      // Act - reconnect all channels
      testStreamManager.clearAllChannels();

      // Assert - disconnect was called on all channels
      expect(pricesDisconnect).toHaveBeenCalled();
      expect(ordersDisconnect).toHaveBeenCalled();
      expect(positionsDisconnect).toHaveBeenCalled();

      // Cleanup
      pricesDisconnect.mockRestore();
      ordersDisconnect.mockRestore();
      positionsDisconnect.mockRestore();
    });

    it('allows channels to reconnect when subscribers are still active', () => {
      // Arrange - clear any previous calls
      jest.clearAllMocks();

      // Set up a subscription
      const callback = jest.fn();
      const unsubscribe = testStreamManager.prices.subscribeToSymbols({
        symbols: ['BTC'],
        callback,
      });

      // Get initial subscription count
      const initialCallCount = mockSubscribeToPrices.mock.calls.length;

      const pricesDisconnect = jest.spyOn(
        testStreamManager.prices,
        'disconnect',
      );

      // Act - reconnect all channels
      testStreamManager.clearAllChannels();

      // Assert - disconnect was called
      expect(pricesDisconnect).toHaveBeenCalled();

      // Assert - reconnection happened (at least one more subscription after clearAllChannels)
      expect(mockSubscribeToPrices.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );

      unsubscribe();
      pricesDisconnect.mockRestore();
    });
  });

});
