import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, AppState } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { PerpsAlwaysOnProvider } from './PerpsAlwaysOnProvider';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { PERPS_CONNECTION_SOURCE } from '../constants/perpsConfig';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../services/PerpsConnectionManager');

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      startMarketDataPreload: jest.fn(),
      stopMarketDataPreload: jest.fn(),
    },
  },
}));

// Prevent PerpsStreamManager singleton from instantiating PERFORMANCE_CONFIG
jest.mock('../providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@metamask/perps-controller', () => ({
  PERPS_CONSTANTS: {
    FeatureName: 'perps',
    ReconnectionDelayAndroidMs: 500,
    ConnectRetryDelayMs: 1000,
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../util/errorUtils', () => ({
  ensureError: jest.fn((err) =>
    err instanceof Error ? err : new Error(String(err)),
  ),
}));

jest.mock('../index', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockResumeFromForeground =
  PerpsConnectionManager.resumeFromForeground as jest.Mock;
const mockDisconnect = PerpsConnectionManager.disconnect as jest.Mock;
const mockStartMarketDataPreload = Engine.context.PerpsController
  .startMarketDataPreload as jest.Mock;
const mockStopMarketDataPreload = Engine.context.PerpsController
  .stopMarketDataPreload as jest.Mock;

describe('PerpsAlwaysOnProvider', () => {
  let mockAppStateListener: ((state: string) => void) | null = null;
  let mockSubscriptionRemove: jest.Mock;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockResumeFromForeground.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);
    mockStartMarketDataPreload.mockClear();
    mockStopMarketDataPreload.mockClear();

    mockSubscriptionRemove = jest.fn();
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'change') {
          mockAppStateListener = handler as (state: string) => void;
        }
        return { remove: mockSubscriptionRemove };
      });

    // In real app, AppState.currentState starts as 'active'.
    // In Jest (native not initialized) it's null — mock it so lastAppState
    // initializes correctly and the prevState === 'active' guard works.
    Object.defineProperty(AppState, 'currentState', {
      get: () => 'active',
      configurable: true,
    });

    // Default: perps enabled
    mockUseSelector.mockReturnValue(true);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    addEventListenerSpy.mockRestore();
    mockAppStateListener = null;
  });

  it('renders children', () => {
    const { getByText } = render(
      <PerpsAlwaysOnProvider>
        <Text>child content</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(getByText('child content')).toBeOnTheScreen();
  });

  it('calls resumeFromForeground on mount when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
    expect(mockResumeFromForeground).toHaveBeenCalledWith({
      source: PERPS_CONNECTION_SOURCE.WALLET_ROOT_MOUNT,
      suppressError: true,
    });
  });

  it('starts market data preload on mount when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockStartMarketDataPreload).toHaveBeenCalledTimes(1);
  });

  it('does not call resumeFromForeground on mount when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockResumeFromForeground).not.toHaveBeenCalled();
  });

  it('does not start market data preload when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockStartMarketDataPreload).not.toHaveBeenCalled();
    expect(mockStopMarketDataPreload).toHaveBeenCalledTimes(1);
  });

  it('registers AppState listener when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('does not register AppState listener when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('calls disconnect when app goes to background', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => {
      mockAppStateListener?.('background');
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calls disconnect when app goes inactive', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    act(() => {
      mockAppStateListener?.('inactive');
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('calls resumeFromForeground after delay when app returns to foreground', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    // Clear the initial mount call
    mockResumeFromForeground.mockClear();

    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Should not reconnect immediately — uses a timer delay
    expect(mockResumeFromForeground).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('cancels pending reconnect timer if app goes background before timer fires', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();

    // Goes active — schedules reconnect timer
    act(() => {
      mockAppStateListener?.('active');
    });

    // Goes background before timer fires — cancels the pending reconnect
    act(() => {
      mockAppStateListener?.('background');
    });

    act(() => {
      jest.runAllTimers();
    });

    // resumeFromForeground should NOT have been called (timer was cancelled)
    expect(mockResumeFromForeground).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('only disconnects once on iOS active→inactive→background sequence', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockDisconnect.mockClear();

    // iOS fires active → inactive → background when backgrounding.
    // Only the first transition (active → inactive) should trigger disconnect.
    act(() => {
      mockAppStateListener?.('inactive'); // prevState='active' → disconnect
    });
    act(() => {
      mockAppStateListener?.('background'); // prevState='inactive' → no-op
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('does not double-disconnect on iOS pull-down notification center (active→inactive→active)', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();
    mockDisconnect.mockClear();

    // Pull-down: active → inactive → active
    act(() => {
      mockAppStateListener?.('inactive'); // prevState='active' → disconnect once
    });
    act(() => {
      mockAppStateListener?.('active'); // schedule reconnect
    });

    act(() => {
      jest.runAllTimers();
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('retries connection when initial resumeFromForeground fails', async () => {
    // Arrange: make initial connect reject
    mockResumeFromForeground.mockRejectedValueOnce(
      new Error('initial failure'),
    );
    // Subsequent calls succeed
    mockResumeFromForeground.mockResolvedValue(undefined);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    // Flush the rejection microtask so the .catch() handler runs
    // and schedules the retry timer
    await act(async () => {
      await Promise.resolve();
    });

    // Now advance timers to fire the retry setTimeout
    await act(async () => {
      jest.runAllTimers();
    });

    // Initial call (rejected) + retry call from the timer
    expect(mockResumeFromForeground).toHaveBeenCalledTimes(2);
  });

  it('clears existing reconnect timer when scheduling a new one', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();

    // First foreground event schedules a timer
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Second foreground event before the first timer fires — should clear the first
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Only one timer should fire (the second one replaced the first)
    act(() => {
      jest.runAllTimers();
    });

    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('logs error when foreground reconnect timer callback fails', async () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockResumeFromForeground.mockClear();
    // Make the delayed reconnect reject
    mockResumeFromForeground.mockRejectedValueOnce(
      new Error('reconnect failed'),
    );

    // Trigger foreground → schedules timer
    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Fire the timer — the catch logs but does not throw
    await act(async () => {
      jest.runAllTimers();
    });

    expect(mockResumeFromForeground).toHaveBeenCalledTimes(1);
  });

  it('calls disconnect and removes AppState subscription on unmount', () => {
    const { unmount } = render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockDisconnect.mockClear();

    act(() => {
      unmount();
    });

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockSubscriptionRemove).toHaveBeenCalledTimes(1);
    expect(mockStopMarketDataPreload).toHaveBeenCalledTimes(1);
  });
});
