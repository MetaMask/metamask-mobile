import { AppState, AppStateStatus } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { detectPushNotificationOsPermissionRevocation } from '../utils/push-notification-os-permission-sync';
import { useNotificationOsPermissionEffect } from './useNotificationOsPermissionEffect';

jest.mock('../utils/push-notification-os-permission-sync', () => ({
  detectPushNotificationOsPermissionRevocation: jest.fn(),
}));

const mockDetect = jest.mocked(detectPushNotificationOsPermissionRevocation);

describe('useNotificationOsPermissionEffect', () => {
  let changeHandler: (state: AppStateStatus) => void;
  const removeSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler) => {
        changeHandler = handler as (state: AppStateStatus) => void;
        return { remove: removeSpy } as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    // clearAllMocks does not restore spies; restore so the AppState spy does not
    // leak into other suites sharing this Jest worker.
    jest.restoreAllMocks();
  });

  it('runs the detection once on mount', () => {
    renderHook(() => useNotificationOsPermissionEffect());

    expect(mockDetect).toHaveBeenCalledTimes(1);
  });

  it('runs the detection on a background -> active transition', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    mockDetect.mockClear();

    changeHandler('background');
    changeHandler('active');

    expect(mockDetect).toHaveBeenCalledTimes(1);
  });

  it('ignores the intermediate iOS inactive state during background -> active', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    mockDetect.mockClear();

    changeHandler('background');
    changeHandler('inactive');
    changeHandler('active');

    expect(mockDetect).toHaveBeenCalledTimes(1);
  });

  it('does not run the detection on active -> background', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    mockDetect.mockClear();

    changeHandler('active');
    changeHandler('background');

    expect(mockDetect).not.toHaveBeenCalled();
  });

  it('removes the AppState subscription on unmount', () => {
    const { unmount } = renderHook(() => useNotificationOsPermissionEffect());

    unmount();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
