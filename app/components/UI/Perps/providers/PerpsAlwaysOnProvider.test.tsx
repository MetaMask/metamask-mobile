import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text, AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { PerpsAlwaysOnProvider } from './PerpsAlwaysOnProvider';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../services/PerpsConnectionManager');

// Prevent PerpsStreamManager singleton from instantiating PERFORMANCE_CONFIG
jest.mock('../providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('@metamask/perps-controller', () => ({
  PERPS_CONSTANTS: {
    FeatureName: 'perps',
    ReconnectionDelayAndroidMs: 500,
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
const mockConnect = PerpsConnectionManager.connect as jest.Mock;
const mockDisconnect = PerpsConnectionManager.disconnect as jest.Mock;

describe('PerpsAlwaysOnProvider', () => {
  let mockAppStateListener: ((state: string) => void) | null = null;
  let mockSubscriptionRemove: jest.Mock;
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockConnect.mockResolvedValue(undefined);
    mockDisconnect.mockResolvedValue(undefined);

    mockSubscriptionRemove = jest.fn();
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'change') {
          mockAppStateListener = handler as (state: string) => void;
        }
        return { remove: mockSubscriptionRemove };
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
    expect(getByText('child content')).toBeTruthy();
  });

  it('calls connect on mount when perps is enabled', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('does not call connect on mount when perps is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    expect(mockConnect).not.toHaveBeenCalled();
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

  it('calls connect after delay when app returns to foreground', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    // Clear the initial mount connect call
    mockConnect.mockClear();

    act(() => {
      mockAppStateListener?.('background');
    });
    act(() => {
      mockAppStateListener?.('active');
    });

    // Should not reconnect immediately — uses a timer delay
    expect(mockConnect).not.toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('cancels pending reconnect timer if app goes background before timer fires', () => {
    render(
      <PerpsAlwaysOnProvider>
        <Text>child</Text>
      </PerpsAlwaysOnProvider>,
    );

    mockConnect.mockClear();

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

    // connect should NOT have been called (timer was cancelled)
    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
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
  });
});
