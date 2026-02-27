import { renderHook, act } from '@testing-library/react-hooks';
import { NativeModules, AppState } from 'react-native';
import { useSelector } from 'react-redux';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockCheckCallState = jest.fn().mockResolvedValue(false);
const mockRemoveSubscription = jest.fn();
const mockAddListener = jest
  .fn()
  .mockReturnValue({ remove: mockRemoveSubscription });

// Override the global auto-mock with our own implementation
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () =>
  jest.fn().mockImplementation(() => ({
    addListener: mockAddListener,
  })),
);

const mockAppStateRemove = jest.fn();
jest.spyOn(AppState, 'addEventListener').mockReturnValue({
  remove: mockAppStateRemove,
} as unknown as ReturnType<typeof AppState.addEventListener>);

// Set up the native module mock
NativeModules.RCTCallDetection = {
  checkCallState: mockCheckCallState,
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

import useCallDetection from './useCallDetection';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useCallDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckCallState.mockResolvedValue(false);
    mockAddListener.mockReturnValue({ remove: mockRemoveSubscription });
    (AppState.addEventListener as jest.Mock).mockReturnValue({
      remove: mockAppStateRemove,
    });
    NativeModules.RCTCallDetection = {
      checkCallState: mockCheckCallState,
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    };
  });

  it('returns inactive state when feature flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { result } = renderHook(() => useCallDetection());

    expect(result.current.isOnCall).toBe(false);
    expect(result.current.isDismissed).toBe(false);
  });

  it('does not subscribe to events when feature flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    renderHook(() => useCallDetection());

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it('subscribes to native events when feature flag is enabled', () => {
    mockUseSelector.mockReturnValue(true);

    renderHook(() => useCallDetection());

    expect(mockAddListener).toHaveBeenCalledWith(
      'onCallStateChanged',
      expect.any(Function),
    );
  });

  it('subscribes to AppState changes when feature flag is enabled', () => {
    mockUseSelector.mockReturnValue(true);

    renderHook(() => useCallDetection());

    expect(AppState.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('checks call state on mount when feature is enabled', () => {
    mockUseSelector.mockReturnValue(true);

    renderHook(() => useCallDetection());

    expect(mockCheckCallState).toHaveBeenCalled();
  });

  it('updates isOnCall when native event fires', () => {
    mockUseSelector.mockReturnValue(true);
    let eventCallback: (event: { isOnCall: boolean }) => void = () => undefined;
    mockAddListener.mockImplementation(
      (_event: string, cb: (event: { isOnCall: boolean }) => void) => {
        eventCallback = cb;
        return { remove: mockRemoveSubscription };
      },
    );

    const { result } = renderHook(() => useCallDetection());

    act(() => {
      eventCallback({ isOnCall: true });
    });

    expect(result.current.isOnCall).toBe(true);
  });

  it('dismiss sets isDismissed to true', () => {
    mockUseSelector.mockReturnValue(true);
    let eventCallback: (event: { isOnCall: boolean }) => void = () => undefined;
    mockAddListener.mockImplementation(
      (_event: string, cb: (event: { isOnCall: boolean }) => void) => {
        eventCallback = cb;
        return { remove: mockRemoveSubscription };
      },
    );

    const { result } = renderHook(() => useCallDetection());

    act(() => {
      eventCallback({ isOnCall: true });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.isDismissed).toBe(true);
  });

  it('resets dismiss state when a new call is detected', () => {
    mockUseSelector.mockReturnValue(true);
    let eventCallback: (event: { isOnCall: boolean }) => void = () => undefined;
    mockAddListener.mockImplementation(
      (_event: string, cb: (event: { isOnCall: boolean }) => void) => {
        eventCallback = cb;
        return { remove: mockRemoveSubscription };
      },
    );

    const { result } = renderHook(() => useCallDetection());

    act(() => {
      eventCallback({ isOnCall: true });
    });

    act(() => {
      result.current.dismiss();
    });
    expect(result.current.isDismissed).toBe(true);

    act(() => {
      eventCallback({ isOnCall: false });
    });

    act(() => {
      eventCallback({ isOnCall: true });
    });
    expect(result.current.isDismissed).toBe(false);
  });

  it('cleans up subscriptions on unmount', () => {
    mockUseSelector.mockReturnValue(true);

    const { unmount } = renderHook(() => useCallDetection());
    unmount();

    expect(mockRemoveSubscription).toHaveBeenCalled();
    expect(mockAppStateRemove).toHaveBeenCalled();
  });
});
