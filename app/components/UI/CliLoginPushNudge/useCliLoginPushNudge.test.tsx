import React from 'react';
import { AppState } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { ToastContext } from '../../../component-library/components/Toast';
import type {
  ToastRef,
  ToastOptions,
} from '../../../component-library/components/Toast/Toast.types';
import { useCliLoginPushNudge } from './useCliLoginPushNudge';

const mockEnableNotifications = jest.fn();
const mockGetPushPermissionStatus = jest.fn();
const mockOpenSystemSettings = jest.fn();
const mockIsNotificationsFeatureEnabled = jest.fn();

jest.mock('../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: () => mockIsNotificationsFeatureEnabled(),
}));

jest.mock('../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: () => ({
    enableNotifications: mockEnableNotifications,
  }),
}));

jest.mock('../../../util/notifications/services/NotificationService', () => ({
  __esModule: true,
  default: {
    openSystemSettings: () => mockOpenSystemSettings(),
  },
  getPushPermissionStatus: () => mockGetPushPermissionStatus(),
}));

jest.mock('../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('useCliLoginPushNudge', () => {
  let showToast: jest.Mock;
  let closeToast: jest.Mock;
  let appStateChangeHandler: ((state: string) => void) | undefined;

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const toastRef = {
      current: { showToast, closeToast } as unknown as ToastRef,
    };
    return (
      <ToastContext.Provider value={{ toastRef }}>
        {children}
      </ToastContext.Provider>
    );
  };

  const renderNudge = () =>
    renderHook(() => useCliLoginPushNudge(), { wrapper });

  const tapTurnOn = async () => {
    const options = showToast.mock.calls[0][0] as ToastOptions;
    await act(async () => {
      await options.linkButtonOptions?.onPress?.();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    showToast = jest.fn();
    closeToast = jest.fn();
    appStateChangeHandler = undefined;
    mockIsNotificationsFeatureEnabled.mockReturnValue(true);
    mockEnableNotifications.mockResolvedValue(undefined);
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event: string, handler: (s: string) => void) => {
        appStateChangeHandler = handler;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof AppState.addEventListener
        >;
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not show the toast when the notifications feature is disabled', () => {
    mockIsNotificationsFeatureEnabled.mockReturnValue(false);
    const { result } = renderNudge();

    let shown: boolean | undefined;
    act(() => {
      shown = result.current.showNudge();
    });

    expect(shown).toBe(false);
    expect(showToast).not.toHaveBeenCalled();
  });

  it('shows a toast with a Turn on action when enabled', () => {
    const { result } = renderNudge();

    let shown: boolean | undefined;
    act(() => {
      shown = result.current.showNudge();
    });

    expect(shown).toBe(true);
    expect(showToast).toHaveBeenCalledTimes(1);
    const options = showToast.mock.calls[0][0] as ToastOptions;
    expect(options.linkButtonOptions?.onPress).toBeDefined();
    expect(options.closeButtonOptions?.onPress).toBeDefined();
  });

  it('enables notifications directly when native permission is promptable', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('promptable');
    const { result } = renderNudge();

    act(() => {
      result.current.showNudge();
    });
    await tapTurnOn();

    expect(mockOpenSystemSettings).not.toHaveBeenCalled();
    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(closeToast).toHaveBeenCalled();
  });

  it('opens device settings when native permission is denied', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('denied');
    const { result } = renderNudge();

    act(() => {
      result.current.showNudge();
    });
    await tapTurnOn();

    expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });

  it('enables notifications on return from settings when permission becomes grantable', async () => {
    mockGetPushPermissionStatus.mockResolvedValueOnce('denied');
    const { result } = renderNudge();

    act(() => {
      result.current.showNudge();
    });
    await tapTurnOn();

    mockGetPushPermissionStatus.mockResolvedValue('granted');
    await act(async () => {
      appStateChangeHandler?.('active');
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
  });

  it('closes the toast without enabling when the user returns still denied', async () => {
    mockGetPushPermissionStatus.mockResolvedValue('denied');
    const { result } = renderNudge();

    act(() => {
      result.current.showNudge();
    });
    await tapTurnOn();

    closeToast.mockClear();
    await act(async () => {
      appStateChangeHandler?.('active');
    });

    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(closeToast).toHaveBeenCalled();
  });
});
