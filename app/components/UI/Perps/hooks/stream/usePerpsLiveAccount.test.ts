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
    returnOnEquity: '7.5',
    totalValue: '10150.00',
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

  describe('null handling during reconnection', () => {
    it('should handle null account data without setting loading to false', () => {
      // Override mock to not send initial data
      mockSubscribe.mockImplementation(
        ({
          callback,
        }: {
          callback: (account: AccountState | null) => void;
          throttleMs?: number;
        }) => {
          mockCallback = callback as (account: AccountState) => void;
          // Don't send initial data
          return mockUnsubscribe;
        },
      );

      const { result } = renderHook(() => usePerpsLiveAccount());

      // Should be in loading state
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);

      // Simulate null update (during reconnection)
      act(() => {
        (mockCallback as unknown as (data: null) => void)(null);
      });

      // Should still be in loading state when null is received
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);
    });

    it('should transition from null to data correctly', async () => {
      // Override mock to control data flow
      mockSubscribe.mockImplementation(
        ({
          callback,
        }: {
          callback: (account: AccountState | null) => void;
          throttleMs?: number;
        }) => {
          mockCallback = callback as (account: AccountState) => void;
          // Don't send initial data
          return mockUnsubscribe;
        },
      );

      const { result } = renderHook(() => usePerpsLiveAccount());

      // Initial state
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);

      // Simulate null update (during reconnection)
      act(() => {
        (mockCallback as unknown as (data: null) => void)(null);
      });

      // Should still be loading
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);

      // Simulate successful reconnection with data
      act(() => {
        mockCallback(mockAccount);
      });

      // Should now have data and loading false
      expect(result.current.account).toEqual(mockAccount);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it('should handle multiple null updates during reconnection', () => {
      // Override mock to control data flow
      mockSubscribe.mockImplementation(
        ({
          callback,
        }: {
          callback: (account: AccountState | null) => void;
          throttleMs?: number;
        }) => {
          mockCallback = callback as (account: AccountState) => void;
          return mockUnsubscribe;
        },
      );

      const { result } = renderHook(() => usePerpsLiveAccount());

      // Simulate multiple null updates (e.g., during repeated reconnection attempts)
      act(() => {
        (mockCallback as unknown as (data: null) => void)(null);
      });

      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);

      act(() => {
        (mockCallback as unknown as (data: null) => void)(null);
      });

      // Should remain in loading state
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);

      act(() => {
        (mockCallback as unknown as (data: null) => void)(null);
      });

      // Still loading
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(true);

      // Finally receive data
      act(() => {
        mockCallback(mockAccount);
      });

      // Now should have data
      expect(result.current.account).toEqual(mockAccount);
      expect(result.current.isInitialLoading).toBe(false);
    });

    it('should handle data -> null -> data transitions', () => {
      const { result } = renderHook(() => usePerpsLiveAccount());

      // First, receive initial data
      act(() => {
        mockCallback(mockAccount);
      });

      expect(result.current.account).toEqual(mockAccount);
      expect(result.current.isInitialLoading).toBe(false);

      // Account/network change causes null
      act(() => {
        (mockCallback as unknown as (data: null) => void)(null);
      });

      // Should keep null but not change loading state
      // since we already had data
      expect(result.current.account).toBeNull();
      expect(result.current.isInitialLoading).toBe(false);

      // New account data arrives
      const newAccount: AccountState = {
        totalBalance: '5000.00',
        availableBalance: '4000.00',
        marginUsed: '1000.00',
        unrealizedPnl: '50.00',
        returnOnEquity: '5.0',
        totalValue: '5050.00',
      };

      act(() => {
        mockCallback(newAccount);
      });

      expect(result.current.account).toEqual(newAccount);
      expect(result.current.isInitialLoading).toBe(false);
    });
  });
});
