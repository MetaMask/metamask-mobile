import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
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
let mockEnableNotificationsLoading = false;

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useRewardsToast', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    showToast: mockShowToast,
    RewardsToastOptions: {
      enableNotificationsNudge: mockEnableNotificationsNudge,
    },
  })),
}));

jest.mock('../../../../util/notifications/hooks/useNotifications', () => ({
  useEnableNotifications: jest.fn(() => ({
    enableNotifications: mockEnableNotifications,
    loading: mockEnableNotificationsLoading,
  })),
}));

jest.mock('../../../../util/notifications/constants', () => ({
  isNotificationsFeatureEnabled: jest.fn(() => true),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.notifications_nudge.turn_on_button': 'Turn on',
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

function renderNudgeHook(options?: { enabled?: boolean }) {
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
    mockEnableNotificationsLoading = false;
    mockSelectors({ notificationsEnabled: true });
    (isNotificationsFeatureEnabled as jest.Mock).mockReturnValue(true);
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
  });

  it('does not enable notifications when the hook is loading', async () => {
    mockSelectors({ notificationsEnabled: false });
    mockEnableNotificationsLoading = true;
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

    expect(mockEnableNotifications).not.toHaveBeenCalled();
    expect(mockCloseToast).not.toHaveBeenCalled();
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
