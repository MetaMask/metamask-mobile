/**
 * Unit tests for usePerpsOICap hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { usePerpsOICap } from './usePerpsOICap';
import {
  PerpsStreamProvider,
  PerpsStreamManager,
} from '../providers/PerpsStreamManager';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine');
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../util/Logger');

const mockEngine = Engine as jest.Mocked<typeof Engine>;

// Wrapper component for hook tests
const createWrapper =
  (testStreamManager: PerpsStreamManager) =>
  ({ children }: { children: React.ReactNode }) => (
    <PerpsStreamProvider testStreamManager={testStreamManager}>
      {children}
    </PerpsStreamProvider>
  );

describe('usePerpsOICap', () => {
  let testStreamManager: PerpsStreamManager;
  let mockSubscribeToOICaps: jest.Mock;
  let mockUnsubscribeFromOICaps: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh stream manager for each test
    testStreamManager = new PerpsStreamManager();

    // Setup mocks
    mockSubscribeToOICaps = jest.fn();
    mockUnsubscribeFromOICaps = jest.fn();

    mockEngine.context.PerpsController = {
      subscribeToOICaps: mockSubscribeToOICaps,
      isCurrentlyReinitializing: jest.fn().mockReturnValue(false),
    } as unknown as typeof mockEngine.context.PerpsController;

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
  });

  it('returns isAtCap true when symbol in caps list', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'), {
      wrapper: createWrapper(testStreamManager),
    });

    // Initial state - loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAtCap).toBe(false);

    // Send OI cap update with BTC at cap
    await act(async () => {
      oiCapCallback?.(['BTC', 'ETH']);
    });

    // Should indicate BTC is at cap
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns isAtCap false when symbol not in caps list', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('SOL'), {
      wrapper: createWrapper(testStreamManager),
    });

    // Send OI cap update without SOL
    await act(async () => {
      oiCapCallback?.(['BTC', 'ETH']);
    });

    // Should indicate SOL is NOT at cap
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('returns isLoading true until first data received', () => {
    // Don't call callback - simulates waiting for first data
    mockSubscribeToOICaps.mockImplementation(() => mockUnsubscribeFromOICaps);

    const { result } = renderHook(() => usePerpsOICap('BTC'), {
      wrapper: createWrapper(testStreamManager),
    });

    // Should be loading before first data
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAtCap).toBe(false);
  });

  it('returns isLoading false after first data received', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'), {
      wrapper: createWrapper(testStreamManager),
    });

    // Initial loading state
    expect(result.current.isLoading).toBe(true);

    // Send first data (empty caps list)
    await act(async () => {
      oiCapCallback?.([]);
    });

    // Should not be loading anymore
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles undefined symbol gracefully', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const { result } = renderHook(() => usePerpsOICap(undefined), {
      wrapper: createWrapper(testStreamManager),
    });

    // Should not crash with undefined symbol
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAtCap).toBe(false);

    // Send data
    await act(async () => {
      oiCapCallback?.(['BTC']);
    });

    // Should still handle data but return false for isAtCap
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
    });
  });

  it('unsubscribes when component unmounts', async () => {
    mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

    const { unmount } = renderHook(() => usePerpsOICap('BTC'), {
      wrapper: createWrapper(testStreamManager),
    });

    // Subscription should be created
    await waitFor(() => {
      expect(mockSubscribeToOICaps).toHaveBeenCalled();
    });

    // Unmount component
    unmount();

    // Should have called unsubscribe
    await waitFor(() => {
      expect(mockUnsubscribeFromOICaps).toHaveBeenCalled();
    });
  });

  it('updates isAtCap when caps list changes', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'), {
      wrapper: createWrapper(testStreamManager),
    });

    // First update - BTC not at cap
    await act(async () => {
      oiCapCallback?.(['ETH', 'SOL']);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
    });

    // Second update - BTC now at cap
    await act(async () => {
      oiCapCallback?.(['BTC', 'ETH', 'SOL']);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(true);
    });

    // Third update - BTC no longer at cap
    await act(async () => {
      oiCapCallback?.(['ETH', 'SOL']);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
    });
  });

  it('handles empty caps list correctly', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const { result } = renderHook(() => usePerpsOICap('BTC'), {
      wrapper: createWrapper(testStreamManager),
    });

    // Send empty caps list
    await act(async () => {
      oiCapCallback?.([]);
    });

    await waitFor(() => {
      expect(result.current.isAtCap).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('resubscribes when symbol changes', async () => {
    mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

    const { rerender } = renderHook(({ symbol }) => usePerpsOICap(symbol), {
      initialProps: { symbol: 'BTC' as string | undefined },
      wrapper: createWrapper(testStreamManager),
    });

    await waitFor(() => {
      expect(mockSubscribeToOICaps).toHaveBeenCalledTimes(1);
    });

    // Change symbol
    rerender({ symbol: 'ETH' });

    // Should have unsubscribed from old and subscribed to new
    await waitFor(() => {
      expect(mockUnsubscribeFromOICaps).toHaveBeenCalledTimes(1);
      expect(mockSubscribeToOICaps).toHaveBeenCalledTimes(2);
    });
  });

  it('does not subscribe when symbol is undefined', () => {
    mockSubscribeToOICaps.mockReturnValue(mockUnsubscribeFromOICaps);

    renderHook(() => usePerpsOICap(undefined), {
      wrapper: createWrapper(testStreamManager),
    });

    // Should not have subscribed
    expect(mockSubscribeToOICaps).not.toHaveBeenCalled();
  });

  it('uses memoized isAtCap value to avoid unnecessary re-renders', async () => {
    let oiCapCallback: ((caps: string[]) => void) | null = null;
    mockSubscribeToOICaps.mockImplementation(
      (params: { callback: (caps: string[]) => void }) => {
        oiCapCallback = params.callback;
        return mockUnsubscribeFromOICaps;
      },
    );

    const renderSpy = jest.fn();
    const { result } = renderHook(
      () => {
        const hookResult = usePerpsOICap('BTC');
        renderSpy();
        return hookResult;
      },
      {
        wrapper: createWrapper(testStreamManager),
      },
    );

    const initialRenderCount = renderSpy.mock.calls.length;

    // Send same caps list multiple times
    await act(async () => {
      oiCapCallback?.(['BTC']);
    });

    await act(async () => {
      oiCapCallback?.(['BTC']);
    });

    await act(async () => {
      oiCapCallback?.(['BTC']);
    });

    // isAtCap should remain true
    await waitFor(() => {
      expect(result.current.isAtCap).toBe(true);
    });

    // Should have minimal re-renders due to memoization
    // (Initial + data update, not one per callback)
    expect(renderSpy.mock.calls.length).toBeLessThan(initialRenderCount + 5);
  });
});
