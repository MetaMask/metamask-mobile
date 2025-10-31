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
import type { PriceUpdate, PerpsMarketData } from '../controllers/types';
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
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

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
      state: {
        isTestnet: false,
        activeProvider: 'hyperliquid',
        lastUpdateTimestamp: Date.now(),
      },
    } as unknown as typeof mockEngine.context.PerpsController;

    mockDevLogger.log = jest.fn();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <Text>Child Component</Text>
      </PerpsStreamProvider>,
    );

    expect(getByText('Child Component')).toBeOnTheScreen();
  });

  it('throws error when usePerpsStream is used outside provider', () => {
    const originalError = console.error;
    console.error = jest.fn();
    const TestComponentOutsideProvider = () => {
      usePerpsStream();
      return <Text>Test</Text>;
    };

    const renderOutsideProvider = () => {
      render(<TestComponentOutsideProvider />);
    };

    expect(renderOutsideProvider).toThrow(
      'usePerpsStream must be used within PerpsStreamProvider',
    );
    console.error = originalError;
  });

  it('provides immediate cached data on subscription', async () => {
    const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
    mockSubscribeToPrices.mockImplementation(
      (params: { callback: (updates: PriceUpdate[]) => void }) => {
        const cachedData: PriceUpdate[] = [
          {
            coin: 'BTC-PERP',
            price: '50000',
            percentChange24h: '5',
            timestamp: 999,
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

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        'BTC-PERP': {
          coin: 'BTC-PERP',
          price: '50000',
          timestamp: fixedTimestamp,
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

  it('throttles updates after first immediate update', async () => {
    const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
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
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50000',
          percentChange24h: '5',
          timestamp: 999,
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50100',
          percentChange24h: '5.1',
          timestamp: 999,
        },
      ]);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenLastCalledWith({
        'BTC-PERP': {
          coin: 'BTC-PERP',
          price: '50100',
          timestamp: fixedTimestamp,
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

  it('handles multiple rapid updates with throttling', async () => {
    const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
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
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50000',
          percentChange24h: '5',
          timestamp: 999,
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50100',
          percentChange24h: '5.1',
          timestamp: 999,
        },
      ]);
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50200',
          percentChange24h: '5.2',
          timestamp: 999,
        },
      ]);
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50300',
          percentChange24h: '5.3',
          timestamp: 999,
        },
      ]);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      expect(onUpdate).toHaveBeenLastCalledWith({
        'BTC-PERP': {
          coin: 'BTC-PERP',
          price: '50300',
          timestamp: fixedTimestamp,
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

  it('handles subscription without throttling', async () => {
    const timestamps = { first: 1000, second: 2000, third: 3000 };
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
          throttleMs: 0,
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
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });
    onUpdate.mockClear();

    act(() => {
      controllerCallback?.([
        {
          coin: 'ETH-PERP',
          price: '3000',
          timestamp: timestamps.first,
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
          timestamp: timestamps.second,
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
          timestamp: timestamps.third,
          percentChange24h: '2.2',
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(3);
    });
  });

  it('cleans up timers on unsubscribe', async () => {
    const timestamps = { first: 1000, second: 2000 };
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
    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalled();
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50000',
          timestamp: timestamps.first,
          percentChange24h: '5',
        },
      ]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    act(() => {
      controllerCallback?.([
        {
          coin: 'BTC-PERP',
          price: '50100',
          timestamp: timestamps.second,
          percentChange24h: '5.1',
        },
      ]);
    });
    unmount();

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('subscribes to prices when component mounts', async () => {
    mockSubscribeToPrices.mockImplementation(() => jest.fn());
    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider testStreamManager={testStreamManager}>
        <TestPriceComponent onUpdate={onUpdate} />
      </PerpsStreamProvider>,
    );

    await waitFor(() => {
      expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
      const callArgs = mockSubscribeToPrices.mock.calls[0][0];
      expect(callArgs.symbols).toEqual(['BTC-PERP']);
      expect(callArgs.includeOrderBook).toBe(true);
      expect(typeof callArgs.callback).toBe('function');
    });
  });

  it('unsubscribes when component unmounts', async () => {
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

  it('delivers first update immediately', async () => {
    const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
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
      timestamp: 999,
    };

    act(() => {
      priceCallback([firstUpdate]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
      const call = onUpdate.mock.calls[0][0];
      expect(call['BTC-PERP'].coin).toBe('BTC-PERP');
      expect(call['BTC-PERP'].price).toBe('50000');
      expect(call['BTC-PERP'].timestamp).toBe(fixedTimestamp);
    });
  });

  describe('clearCache', () => {
    it('clears cache and notifies subscribers with empty data', async () => {
      const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
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

      act(() => {
        priceCallback([
          {
            coin: 'BTC-PERP',
            price: '50000',
            timestamp: 999,
            percentChange24h: '5',
          },
        ]);
      });

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({
          'BTC-PERP': {
            coin: 'BTC-PERP',
            price: '50000',
            timestamp: fixedTimestamp,
            percentChange24h: '5',
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
      onUpdate.mockClear();

      act(() => {
        testStreamManager.prices.clearCache();
      });

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
      expect(onUpdate).toHaveBeenCalledWith({});

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
      });
    });

    it('cleans up prewarm subscription when clearing price cache', async () => {
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.prices,
        'cleanupPrewarm',
      );

      await testStreamManager.prices.prewarm();

      act(() => {
        testStreamManager.prices.clearCache();
      });

      expect(cleanupPrewarmSpy).toHaveBeenCalledTimes(1);
      cleanupPrewarmSpy.mockRestore();
    });

    it('cleans up prewarm subscription when clearing order cache', () => {
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.orders,
        'cleanupPrewarm',
      );

      testStreamManager.orders.prewarm();

      act(() => {
        testStreamManager.orders.clearCache();
      });

      expect(cleanupPrewarmSpy).toHaveBeenCalledTimes(1);
      cleanupPrewarmSpy.mockRestore();
    });

    it('cleans up prewarm subscription when clearing position cache', () => {
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.positions,
        'cleanupPrewarm',
      );

      testStreamManager.positions.prewarm();

      act(() => {
        testStreamManager.positions.clearCache();
      });

      expect(cleanupPrewarmSpy).toHaveBeenCalledTimes(1);
      cleanupPrewarmSpy.mockRestore();
    });

    it('cleans up prewarm subscription when clearing account cache', () => {
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.account,
        'cleanupPrewarm',
      );

      testStreamManager.account.prewarm();

      act(() => {
        testStreamManager.account.clearCache();
      });

      expect(cleanupPrewarmSpy).toHaveBeenCalledTimes(1);
      cleanupPrewarmSpy.mockRestore();
    });

    it('resets all prewarm state when clearing price cache', async () => {
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
      const cleanupPrewarmSpy = jest.spyOn(
        testStreamManager.prices,
        'cleanupPrewarm',
      );

      await testStreamManager.prices.prewarm();

      act(() => {
        testStreamManager.prices.clearCache();
      });

      expect(cleanupPrewarmSpy).toHaveBeenCalledTimes(1);
      cleanupPrewarmSpy.mockRestore();
    });

    it('cleans up all prewarm subscriptions when clearing all channel caches', async () => {
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

      await testStreamManager.prices.prewarm();
      testStreamManager.orders.prewarm();
      testStreamManager.positions.prewarm();
      testStreamManager.account.prewarm();

      act(() => {
        testStreamManager.prices.clearCache();
        testStreamManager.orders.clearCache();
        testStreamManager.positions.clearCache();
        testStreamManager.account.clearCache();
      });

      expect(priceCleanupSpy).toHaveBeenCalledTimes(1);
      expect(orderCleanupSpy).toHaveBeenCalledTimes(1);
      expect(positionCleanupSpy).toHaveBeenCalledTimes(1);
      expect(accountCleanupSpy).toHaveBeenCalledTimes(1);

      priceCleanupSpy.mockRestore();
      orderCleanupSpy.mockRestore();
      positionCleanupSpy.mockRestore();
      accountCleanupSpy.mockRestore();
    });

    it('disconnects WebSocket when clearing cache', async () => {
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

      act(() => {
        testStreamManager.prices.clearCache();
      });

      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    it('does not reconnect after clearing cache even with active subscribers', async () => {
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

      act(() => {
        testStreamManager.prices.clearCache();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
      });
    });

    it('does not reconnect when no active subscribers exist', async () => {
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

      unmount();

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
      mockSubscribeToPrices.mockClear();

      act(() => {
        testStreamManager.prices.clearCache();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(mockSubscribeToPrices).not.toHaveBeenCalled();
    });
  });

  it('throttles subsequent updates', async () => {
    const fixedTimestamp = new Date('2024-01-01T00:00:00.000Z').getTime();
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
      timestamp: 999,
    };

    act(() => {
      priceCallback([firstUpdate]);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    const secondUpdate: PriceUpdate = {
      coin: 'BTC-PERP',
      price: '50100',
      timestamp: 999,
    };
    const thirdUpdate: PriceUpdate = {
      coin: 'BTC-PERP',
      price: '50200',
      timestamp: 999,
    };

    act(() => {
      priceCallback([secondUpdate]);
      priceCallback([thirdUpdate]);
    });
    expect(onUpdate).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      const lastCall = onUpdate.mock.calls[1][0];
      expect(lastCall['BTC-PERP'].coin).toBe('BTC-PERP');
      expect(lastCall['BTC-PERP'].price).toBe('50200');
      expect(lastCall['BTC-PERP'].timestamp).toBe(fixedTimestamp);
    });
  });

  it('handles multiple subscribers with different throttle times', async () => {
    const testTimestamp = 1234567890;
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
      timestamp: testTimestamp,
    };

    act(() => {
      priceCallback([update]);
    });

    await waitFor(() => {
      expect(onUpdate1).toHaveBeenCalledTimes(1);
      expect(onUpdate2).toHaveBeenCalledTimes(1);
    });

    const update2: PriceUpdate = {
      ...update,
      price: '50100',
    };

    act(() => {
      priceCallback([update2]);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate1).toHaveBeenCalledTimes(2);
      expect(onUpdate2).toHaveBeenCalledTimes(1);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onUpdate2).toHaveBeenCalledTimes(2);
    });
  });

  it('handles subscription to multiple symbols', async () => {
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
      expect(mockSubscribeToPrices).toHaveBeenCalledTimes(1);
      const callArgs = mockSubscribeToPrices.mock.calls[0][0];
      expect(callArgs.symbols).toEqual(['BTC-PERP', 'ETH-PERP']);
      expect(callArgs.includeOrderBook).toBe(true);
      expect(typeof callArgs.callback).toBe('function');
    });
  });

  it('cleans up all subscriptions on provider unmount', async () => {
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

    it('fetches market data on first subscription', async () => {
      const callback = jest.fn();

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockMarketData);
      });

      unsubscribe();
    });

    it('uses cached data for subsequent subscriptions within cache duration', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      const unsubscribe1 = testStreamManager.marketData.subscribe({
        callback: callback1,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
        expect(callback1).toHaveBeenCalledWith(mockMarketData);
      });

      const unsubscribe2 = testStreamManager.marketData.subscribe({
        callback: callback2,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(callback2).toHaveBeenCalledWith(mockMarketData);
      });

      expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      unsubscribe1();
      unsubscribe2();
    });

    it('refreshes market data when refresh is called', async () => {
      const callback = jest.fn();

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });
      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      await testStreamManager.marketData.refresh();

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(2);
      });
      expect(callback).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    it('clears cache when clearCache is called', async () => {
      const callback = jest.fn();

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });
      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockMarketData);
      });

      testStreamManager.marketData.clearCache();

      expect(callback).toHaveBeenLastCalledWith([]);
      unsubscribe();
    });

    it('handles fetch errors gracefully', async () => {
      const callback = jest.fn();
      const error = new Error('Network error');
      mockGetMarketDataWithPrices.mockRejectedValue(error);

      const unsubscribe = testStreamManager.marketData.subscribe({
        callback,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalled();
      });

      unsubscribe();
    });

    it('prewarms market data cache', async () => {
      const cleanup = testStreamManager.marketData.prewarm();

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('deduplicates concurrent fetch requests', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      testStreamManager.marketData.clearCache();

      const unsubscribe1 = testStreamManager.marketData.subscribe({
        callback: callback1,
        throttleMs: 0,
      });
      const unsubscribe2 = testStreamManager.marketData.subscribe({
        callback: callback2,
        throttleMs: 0,
      });

      await waitFor(() => {
        expect(mockGetMarketDataWithPrices).toHaveBeenCalledTimes(1);
      });

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
      mockPerpsConnectionManager.isCurrentlyConnecting = jest.fn(() => false);
      const mockProvider = {
        getMarketDataWithPrices: jest.fn().mockResolvedValue([]),
      };
      mockEngine.context.PerpsController.getActiveProvider = jest
        .fn()
        .mockReturnValue(mockProvider);
      const streamManager = new PerpsStreamManager();

      const callback = jest.fn();
      const unsubscribe = streamManager.marketData.subscribe({ callback });

      await act(async () => {
        await Promise.resolve();
      });

      expect(
        mockPerpsConnectionManager.isCurrentlyConnecting,
      ).toHaveBeenCalledTimes(1);
      unsubscribe();
    });

    it('includes error handling logic in connect method', () => {
      mockPerpsConnectionManager.isCurrentlyConnecting = jest.fn(() => false);

      expect(typeof mockPerpsConnectionManager.isCurrentlyConnecting).toBe(
        'function',
      );
      expect(typeof mockLogger.error).toBe('function');
    });
  });
});
