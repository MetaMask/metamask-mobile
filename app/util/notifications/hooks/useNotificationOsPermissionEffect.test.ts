import { AppState, AppStateStatus } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { selectIsMetaMaskPushNotificationsEnabled } from '../../../selectors/notifications';
import { syncPushNotificationOsPermission } from '../utils/push-notification-os-permission-sync';
import { useNotificationOsPermissionEffect } from './useNotificationOsPermissionEffect';

jest.mock('../utils/push-notification-os-permission-sync', () => ({
  syncPushNotificationOsPermission: jest.fn(),
}));

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockSync = jest.mocked(syncPushNotificationOsPermission);

describe('useNotificationOsPermissionEffect', () => {
  let changeHandler: (state: AppStateStatus) => void;
  const removeSpy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(false);
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

  it('subscribes to the push-enabled selector', () => {
    renderHook(() => useNotificationOsPermissionEffect());

    expect(mockUseSelector).toHaveBeenCalledWith(
      selectIsMetaMaskPushNotificationsEnabled,
    );
  });

  it('runs the sync once on mount', () => {
    renderHook(() => useNotificationOsPermissionEffect());

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('runs the sync when isPushEnabled flips', () => {
    const { rerender } = renderHook(() => useNotificationOsPermissionEffect());
    mockSync.mockClear();

    // Push registration completed asynchronously -> controller flipped the flag.
    mockUseSelector.mockReturnValue(true);
    rerender(undefined);

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('does not re-run the sync on a re-render without an isPushEnabled change', () => {
    const { rerender } = renderHook(() => useNotificationOsPermissionEffect());
    mockSync.mockClear();

    rerender(undefined);

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('runs the sync on a background -> active transition', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    mockSync.mockClear();

    changeHandler('background');
    changeHandler('active');

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('runs the sync on an inactive -> active transition (iOS permission dialog)', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    mockSync.mockClear();

    changeHandler('inactive');
    changeHandler('active');

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('runs the sync once for a background -> inactive -> active sequence', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    mockSync.mockClear();

    changeHandler('background');
    changeHandler('inactive');
    changeHandler('active');

    expect(mockSync).toHaveBeenCalledTimes(1);
  });

  it('does not run the sync on active -> background', () => {
    renderHook(() => useNotificationOsPermissionEffect());
    changeHandler('active');
    mockSync.mockClear();

    changeHandler('background');

    expect(mockSync).not.toHaveBeenCalled();
  });

  it('removes the AppState subscription on unmount', () => {
    const { unmount } = renderHook(() => useNotificationOsPermissionEffect());

    unmount();

    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
