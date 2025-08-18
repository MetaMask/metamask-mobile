import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import { usePerpsLiveAccount } from './usePerpsLiveAccount';
import type { AccountState } from '../../controllers/types';

// Mock the stream manager
const mockSubscribe = jest.fn();
const mockStreamManager = {
  account: {
    subscribe: mockSubscribe,
  },
  prices: { subscribeToSymbols: jest.fn() },
  orders: { subscribe: jest.fn() },
  positions: { subscribe: jest.fn() },
  fills: { subscribe: jest.fn() },
};

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: () => mockStreamManager,
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('usePerpsLiveAccount', () => {
  const mockAccount: AccountState = {
    totalBalance: '10000.00',
    availableBalance: '8000.00',
    marginUsed: '2000.00',
    unrealizedPnl: '150.00',
  };

  let mockUnsubscribe: jest.Mock;
  let mockCallback: (account: AccountState) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe = jest.fn();

    // Mock the subscription
    mockSubscribe.mockImplementation(
      ({
        callback,
      }: {
        callback: (account: AccountState) => void;
        throttleMs?: number;
      }) => {
        mockCallback = callback;
        // Simulate immediate callback with cached data
        setTimeout(() => callback(mockAccount), 0);
        return mockUnsubscribe;
      },
    );
  });

  it('should return null account initially with loading state', () => {
    const { result } = renderHook(() => usePerpsLiveAccount());

    expect(result.current.account).toBeNull();
    expect(result.current.isInitialLoading).toBe(true);
  });

  it('should return account data after subscription', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsLiveAccount(),
    );

    await waitForNextUpdate();

    expect(result.current.account).toEqual(mockAccount);
    expect(result.current.isInitialLoading).toBe(false);
  });

  it('should subscribe with custom throttle time', () => {
    const customThrottle = 5000;
    renderHook(() => usePerpsLiveAccount({ throttleMs: customThrottle }));

    // Subscription should be called with the custom throttle
    expect(mockSubscribe).toHaveBeenCalledWith({
      callback: expect.any(Function),
      throttleMs: customThrottle,
    });
  });

  it('should update when account data changes', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      usePerpsLiveAccount(),
    );

    // Wait for initial data
    await waitForNextUpdate();
    expect(result.current.account).toEqual(mockAccount);
    expect(result.current.isInitialLoading).toBe(false);

    // Simulate account update
    const updatedAccount: AccountState = {
      ...mockAccount,
      availableBalance: '7500.00',
      marginUsed: '2500.00',
    };

    // Update through the callback
    act(() => {
      mockCallback(updatedAccount);
    });

    // Verify update was applied
    expect(result.current.account).toEqual(updatedAccount);
    expect(result.current.isInitialLoading).toBe(false);
  });

  it('should unsubscribe on unmount', () => {
    const { unmount } = renderHook(() => usePerpsLiveAccount());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('should resubscribe when throttle changes', () => {
    const { rerender } = renderHook(
      ({ throttleMs }: { throttleMs: number }) =>
        usePerpsLiveAccount({ throttleMs }),
      {
        initialProps: { throttleMs: 1000 },
      },
    );

    expect(mockUnsubscribe).not.toHaveBeenCalled();

    // Change throttle time
    rerender({ throttleMs: 5000 });

    // Should unsubscribe and resubscribe
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
