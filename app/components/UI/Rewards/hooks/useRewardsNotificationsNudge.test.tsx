import React from 'react';
import { AppState } from 'react-native';
import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  AppState: { addEventListener: jest.fn() },
}));
const mockAppStateAddEventListener = AppState.addEventListener as jest.Mock;
import { useSelector } from 'react-redux';
import { ToastContext } from '../../../../component-library/components/Toast';
import { useRewardsNotificationsNudge } from './useRewardsNotificationsNudge';
import {
  selectIsMetamaskNotificationsEnabled,
  selectIsMetaMaskPushNotificationsEnabled,
} from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications/constants';

const mockShowToast = jest.fn();
const mockEnableNotifications = jest.fn();
const mockOriginalCloseButtonPress = jest.fn();
const mockEnableNotificationsNudge = jest.fn(
  (linkButtonOptions: { label: string; onPress: () => Promise<void> }) => ({
    variant: 'Plain',
    hasNoTimeout: true,
    linkButtonOptions,
    closeButtonOptions: {
      onPress: mockOriginalCloseButtonPress,
    },
  }),
);
const mockLoadingToast = jest.fn((title: string, subtitle?: string) => ({
  variant: 'loading',
  title,
  subtitle,
}));
const mockErrorToast = jest.fn((title: string) => ({
  variant: 'error',
  title,
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      enableNotificationsNudge: mockEnableNotificationsNudge,
      loading: mockLoadingToast,
      error: mockErrorToast,
    },
  })),
}));

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: jest.fn(() => ({
    enableNotifications: mockEnableNotifications,
  })),
}));

jest.mock('../../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: { openSystemSettings: jest.fn() },
    getPushPermission: jest.fn().mockResolvedValue('authorized'),
  }),
);
const mockNotificationService = jest.requireMock(
  '../../../../util/notifications/services/NotificationService',
);
const mockOpenSystemSettings = mockNotificationService.default
  .openSystemSettings as jest.Mock;
const mockGetPushPermission =
  mockNotificationService.getPushPermission as jest.Mock;

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.notifications_nudge.turn_on_button': 'Turn on',
      'rewards.notifications_nudge.loading': 'Enabling notifications...',
      'rewards.notifications_nudge.loading_description':
        'This may take a moment.',
      'rewards.notifications_nudge.enable_error':
        'Failed to enable notifications',
    };
    return translations[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockCloseToast = jest.fn();

function mockSelectors({
  notificationsEnabled,
}: {
  notificationsEnabled: boolean;
}) {
  mockUseSelector.mockImplementation((selector) => {
    if (
      selector === selectIsMetamaskNotificationsEnabled ||
      selector === selectIsMetaMaskPushNotificationsEnabled
    ) {
      return notificationsEnabled;
    }
    return undefined;
  });
}

function renderNudgeHook(options?: {
  enabled?: boolean;
  onNotificationsEnabled?: () => void;
}) {
  const toastRef = {
    current: {
      showToast: jest.fn(),
      closeToast: mockCloseToast,
    },
  };
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      ToastContext.Provider,
      { value: { toastRef } },
      children,
    );

  return renderHook(() => useRewardsNotificationsNudge(options), { wrapper });
}

describe('useRewardsNotificationsNudge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableNotifications.mockResolvedValue(undefined);
    mockGetPushPermission.mockResolvedValue('authorized');
    mockSelectors({ notificationsEnabled: true });
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);
    mockAppStateAddEventListener.mockReturnValue({ remove: jest.fn() });
  });

  it('returns enabled state when notifications and push are enabled', () => {
    const { result } = renderNudgeHook();

    expect(result.current.areNotificationsEnabled).toBe(true);
    expect(result.current.canPromptToEnableNotifications).toBe(true);
    expect(result.current.shouldPromptToEnableNotifications).toBe(false);
  });

  it('returns prompt state when notifications are disabled and feature flag is on', () => {
    mockSelectors({ notificationsEnabled: false });

    const { result } = renderNudgeHook();

    expect(result.current.areNotificationsEnabled).toBe(false);
    expect(result.current.canPromptToEnableNotifications).toBe(true);
    expect(result.current.shouldPromptToEnableNotifications).toBe(true);
  });

  it('shows the notifications nudge and enables notifications from its CTA', async () => {
    mockSelectors({ notificationsEnabled: false });
    const { result } = renderNudgeHook();

    let didShow = false;
    act(() => {
      didShow = result.current.showEnableNotificationsNudge();
    });

    expect(didShow).toBe(true);
    expect(mockEnableNotificationsNudge).toHaveBeenCalledWith({
      label: 'Turn on',
      onPress: expect.any(Function),
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: 'Plain',
        closeButtonOptions: expect.objectContaining({
          onPress: expect.any(Function),
        }),
      }),
    );

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(mockCloseToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'loading' }),
    );
  });

  it('shows loading toast when Turn On CTA is pressed', async () => {
    mockSelectors({ notificationsEnabled: false });
    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'loading' }),
    );
  });

  it('shows error toast if enableNotifications fails', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockEnableNotifications.mockRejectedValue(new Error('failed'));
    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'error' }),
    );
  });

  it('calls onNotificationsEnabled callback after successful enable', async () => {
    mockSelectors({ notificationsEnabled: false });
    const onNotificationsEnabled = jest.fn();
    const { result } = renderNudgeHook({ onNotificationsEnabled });

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(onNotificationsEnabled).toHaveBeenCalledTimes(1);
  });

  it('does not call onNotificationsEnabled callback when enableNotifications fails', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockEnableNotifications.mockRejectedValue(new Error('failed'));
    const onNotificationsEnabled = jest.fn();
    const { result } = renderNudgeHook({ onNotificationsEnabled });

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(onNotificationsEnabled).not.toHaveBeenCalled();
  });

  it('does not call onNotificationsEnabled when push permission is denied', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission.mockResolvedValue('denied');
    const onNotificationsEnabled = jest.fn();
    const { result } = renderNudgeHook({ onNotificationsEnabled });

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(onNotificationsEnabled).not.toHaveBeenCalled();
  });

  it('runs deferred action immediately when notifications are already enabled', async () => {
    const action = jest.fn();
    const { result } = renderNudgeHook();

    let didRun = false;
    await act(async () => {
      didRun = await result.current.runAfterNotificationsEnabled(action);
    });

    expect(didRun).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('defers action until notifications become enabled', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const action = jest.fn();
    const { result, rerender } = renderNudgeHook();

    let didRun = true;
    await act(async () => {
      didRun = await result.current.runAfterNotificationsEnabled(action);
    });

    expect(didRun).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledTimes(1);

    notificationsEnabled = true;
    mockSelectors({ notificationsEnabled });
    rerender();

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    expect(mockCloseToast).toHaveBeenCalledTimes(1);
  });

  it('shows loading toast before deferred action runs via effect', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const action = jest.fn();
    const { result, rerender } = renderNudgeHook();

    await act(async () => {
      await result.current.runAfterNotificationsEnabled(action);
    });

    notificationsEnabled = true;
    mockSelectors({ notificationsEnabled });
    rerender();

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });

    // nudge (1st call) + loading in effect (2nd call)
    expect(mockShowToast).toHaveBeenCalledTimes(2);
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'loading' }),
    );
  });

  it('does not run or prompt when notifications are disabled and feature flag is off', async () => {
    mockSelectors({ notificationsEnabled: false });
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(false);
    const action = jest.fn();
    const { result } = renderNudgeHook();

    let didRun = true;
    await act(async () => {
      didRun = await result.current.runAfterNotificationsEnabled(action);
    });

    expect(didRun).toBe(false);
    expect(action).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('returns false from showEnableNotificationsNudge when the nudge is unavailable', () => {
    mockSelectors({ notificationsEnabled: false });
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(false);
    const { result } = renderNudgeHook();

    let didShow = true;
    act(() => {
      didShow = result.current.showEnableNotificationsNudge();
    });

    expect(didShow).toBe(false);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('clears pending deferred action when the nudge is dismissed', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const action = jest.fn();
    const { result, rerender } = renderNudgeHook();

    await act(async () => {
      await result.current.runAfterNotificationsEnabled(action);
    });

    const toastConfig = mockShowToast.mock.calls[0][0] as {
      closeButtonOptions: { onPress: () => void };
    };
    act(() => {
      toastConfig.closeButtonOptions.onPress();
    });

    notificationsEnabled = true;
    mockSelectors({ notificationsEnabled });
    rerender();

    expect(mockOriginalCloseButtonPress).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });

  it('closes toast and opens Settings when push permission is denied before Turn On', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission.mockResolvedValue('denied');
    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockGetPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockCloseToast).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
    expect(mockAppStateAddEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('calls enableNotifications after user returns from OS settings with permission granted', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission
      .mockResolvedValueOnce('denied')
      .mockResolvedValueOnce('authorized');

    let capturedHandler: ((state: string) => Promise<void>) | null = null;
    const mockRemove = jest.fn();
    mockAppStateAddEventListener.mockImplementation(
      (_event: string, handler: (state: string) => Promise<void>) => {
        capturedHandler = handler;
        return { remove: mockRemove };
      },
    );

    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockOpenSystemSettings).toHaveBeenCalledTimes(1);
    expect(capturedHandler).not.toBeNull();
    expect(mockEnableNotifications).not.toHaveBeenCalled();

    await act(async () => {
      await capturedHandler?.('active');
    });

    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockGetPushPermission).toHaveBeenCalledTimes(2);
    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenLastCalledWith(
      expect.objectContaining({ variant: 'loading' }),
    );
  });

  it('does not call enableNotifications if permission is still denied after returning from OS settings', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission.mockResolvedValue('denied');

    let capturedHandler: ((state: string) => Promise<void>) | null = null;
    mockAppStateAddEventListener.mockImplementation(
      (_event: string, handler: (state: string) => Promise<void>) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      },
    );

    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    await act(async () => {
      await capturedHandler?.('active');
    });

    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });

  it('calls onNotificationsEnabled callback after returning from OS settings with permission granted', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission
      .mockResolvedValueOnce('denied')
      .mockResolvedValueOnce('authorized');

    let capturedHandler: ((state: string) => Promise<void>) | null = null;
    mockAppStateAddEventListener.mockImplementation(
      (_event: string, handler: (state: string) => Promise<void>) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      },
    );

    const onNotificationsEnabled = jest.fn();
    const { result } = renderNudgeHook({ onNotificationsEnabled });

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    await act(async () => {
      await capturedHandler?.('active');
    });

    expect(mockEnableNotifications).toHaveBeenCalledTimes(1);
    expect(onNotificationsEnabled).toHaveBeenCalledTimes(1);
  });

  it('ignores non-active AppState transitions after opening OS settings', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission.mockResolvedValue('denied');

    let capturedHandler: ((state: string) => Promise<void>) | null = null;
    mockAppStateAddEventListener.mockImplementation(
      (_event: string, handler: (state: string) => Promise<void>) => {
        capturedHandler = handler;
        return { remove: jest.fn() };
      },
    );

    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    await act(async () => {
      await capturedHandler?.('background');
    });

    expect(mockGetPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableNotifications).not.toHaveBeenCalled();
  });

  it('does not open Settings when push permission is authorized before Turn On', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockGetPushPermission.mockResolvedValue('authorized');
    const { result } = renderNudgeHook();

    act(() => {
      result.current.showEnableNotificationsNudge();
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
    expect(mockOpenSystemSettings).not.toHaveBeenCalled();
  });

  it('closes toast even when called from runAfterNotificationsEnabled flow', async () => {
    mockSelectors({ notificationsEnabled: false });
    const action = jest.fn();
    const { result } = renderNudgeHook();

    await act(async () => {
      await result.current.runAfterNotificationsEnabled(action);
    });

    const linkButtonOptions = mockEnableNotificationsNudge.mock.calls[0][0] as {
      onPress: () => Promise<void>;
    };
    await act(async () => {
      await linkButtonOptions.onPress();
    });

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
  });

  it('closeEnableNotificationsNudge clears pending action and closes the toast', async () => {
    let notificationsEnabled = false;
    mockSelectors({ notificationsEnabled });
    const action = jest.fn();
    const { result, rerender } = renderNudgeHook();

    await act(async () => {
      await result.current.runAfterNotificationsEnabled(action);
    });

    act(() => {
      result.current.closeEnableNotificationsNudge();
    });

    notificationsEnabled = true;
    mockSelectors({ notificationsEnabled });
    rerender();

    expect(mockCloseToast).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
  });
});
