import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PerpsStreamProvider, usePerpsStream } from './PerpsStreamManager';
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
      debounceMs: 100,
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

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
    jest.useRealTimers();
  });

  it('should render children correctly', () => {
    const { getByText } = render(
      <PerpsStreamProvider>
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

  it('should subscribe to prices when component mounts', async () => {
    mockSubscribeToPrices.mockImplementation(() => jest.fn());

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider>
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
      <PerpsStreamProvider>
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
      <PerpsStreamProvider>
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

  it('should debounce subsequent updates', async () => {
    const onUpdate = jest.fn();
    let priceCallback: (data: PriceUpdate[]) => void = jest.fn();

    mockSubscribeToPrices.mockImplementation((params) => {
      priceCallback = params.callback;
      return jest.fn();
    });

    render(
      <PerpsStreamProvider>
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

    // Advance timers to trigger debounce
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Should receive the last update after debounce
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(2);
      const lastCall = onUpdate.mock.calls[1][0];
      expect(lastCall['BTC-PERP']).toMatchObject({
        coin: 'BTC-PERP',
        price: '50200',
      });
    });
  });

  it('should handle multiple subscribers with different debounce times', async () => {
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
          debounceMs: 100,
        });

        const sub2 = stream.prices.subscribeToSymbols({
          symbols: ['BTC-PERP'],
          callback: (prices: Record<string, PriceUpdate>) => {
            onUpdate2(prices);
          },
          debounceMs: 200,
        });

        return () => {
          sub1();
          sub2();
        };
      }, [stream]);

      return <Text>Test</Text>;
    };

    render(
      <PerpsStreamProvider>
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
          debounceMs: 100,
        });

        return () => {
          sub();
        };
      }, [stream, onUpdate]);

      return <Text>Test</Text>;
    };

    const onUpdate = jest.fn();

    render(
      <PerpsStreamProvider>
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
      <PerpsStreamProvider>
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
