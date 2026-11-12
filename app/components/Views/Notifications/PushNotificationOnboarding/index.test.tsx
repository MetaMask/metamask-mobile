import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import {
  IconAlert,
  IconAlertSeverity,
  IconSize,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import PushNotificationOnboarding from '.';
import type { PushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

const mockToast = jest.mocked(toast);

const mockDismissPrePrompt = jest.fn();
const mockRequestPushPermission = jest.fn();
const mockEnableNotificationsInBackground = jest.fn();
const mockEnableMarketingConsent = jest.fn();
const mockTrackPrePromptViewed = jest.fn();
const mockTrackPrePromptDismissed = jest.fn();
const mockTrackPrePromptButtonClicked = jest.fn();
const mockTrackOsPromptShown = jest.fn();
const mockTrackOsPromptResponse = jest.fn();
const mockIdentifyMarketingConsent = jest.fn();
const mockIdentifyPushNotificationsEnabled = jest.fn();
const mockOnComplete = jest.fn();
const mockOnUserAnswered = jest.fn();

jest.mock(
  '../../../../util/notifications/hooks/usePushPermissionNotificationSetup',
  () => ({
    usePushPermissionNotificationSetup: () => ({
      enableNotificationsInBackground: mockEnableNotificationsInBackground,
      requestPushPermission: mockRequestPushPermission,
    }),
  }),
);

jest.mock(
  '../../../../util/notifications/hooks/useEnableMarketingConsent',
  () => ({
    useEnableMarketingConsent: () => ({
      enableMarketingConsent: mockEnableMarketingConsent,
    }),
  }),
);

jest.mock(
  '../../../../util/notifications/hooks/usePushPrePromptAnalytics',
  () => ({
    usePushPrePromptAnalytics: () => ({
      trackPrePromptViewed: mockTrackPrePromptViewed,
      trackPrePromptDismissed: mockTrackPrePromptDismissed,
      trackPrePromptButtonClicked: mockTrackPrePromptButtonClicked,
      trackOsPromptShown: mockTrackOsPromptShown,
      trackOsPromptResponse: mockTrackOsPromptResponse,
      identifyMarketingConsent: mockIdentifyMarketingConsent,
      identifyPushNotificationsEnabled: mockIdentifyPushNotificationsEnabled,
    }),
  }),
);

jest.mock(
  '../../../../util/notifications/services/NotificationService',
  () => ({
    __esModule: true,
    default: {
      requestPushNotificationsPermission: jest.fn(),
    },
    canOsPromptForPushPermission: jest.fn(),
    isPushPermissionPromptable: jest.fn(),
  }),
);
const mockNotificationService = jest.requireMock(
  '../../../../util/notifications/services/NotificationService',
);
const mockIsPushPermissionPromptable =
  mockNotificationService.isPushPermissionPromptable as jest.Mock;
const mockCanOsPromptForPushPermission =
  mockNotificationService.canOsPromptForPushPermission as jest.Mock;
const mockRequestPushNotificationsPermission = mockNotificationService.default
  .requestPushNotificationsPermission as jest.Mock;

jest.mock('./NewUserSheet', () => ({
  __esModule: true,
  default: (props: {
    isVisible: boolean;
    onClose: (hasPendingAction?: boolean) => void;
    onYes: () => void;
    onNotNow: () => void;
    onUserAnswered: () => void;
  }) => {
    const MockReact = jest.requireActual('react');
    const { Pressable: MockPressable, View: MockView } =
      jest.requireActual('react-native');

    return props.isVisible
      ? MockReact.createElement(
          MockView,
          { testID: 'mock-push-permission-sheet' },
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-dismiss',
            onPress: props.onClose,
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-action-close',
            onPress: () => props.onClose(true),
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-yes',
            onPress: () => {
              props.onUserAnswered();
              props.onYes();
            },
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-not-now',
            onPress: () => {
              props.onUserAnswered();
              props.onNotNow();
            },
          }),
        )
      : null;
  },
}));

jest.mock('./ExistingUserSheet', () => ({
  __esModule: true,
  default: (props: {
    isVisible: boolean;
    onConfirm: () => void;
    onNotNow: () => void;
    onUserAnswered: () => void;
  }) => {
    const MockReact = jest.requireActual('react');
    const { Pressable: MockPressable, View: MockView } =
      jest.requireActual('react-native');

    return props.isVisible
      ? MockReact.createElement(
          MockView,
          { testID: 'mock-marketing-consent-sheet' },
          MockReact.createElement(MockPressable, {
            testID: 'mock-marketing-consent-confirm',
            onPress: () => {
              props.onUserAnswered();
              props.onConfirm();
            },
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-marketing-consent-not-now',
            onPress: () => {
              props.onUserAnswered();
              props.onNotNow();
            },
          }),
        )
      : null;
  },
}));

const renderPushNotificationOnboarding = ({
  isVisible = true,
  nativeOsPermissionEnabled = false,
  prePromptVariant = 'push_permission',
}: {
  isVisible?: boolean;
  nativeOsPermissionEnabled?: boolean | null;
  prePromptVariant?: PushPrePromptVariant;
} = {}) =>
  renderWithProvider(
    <PushNotificationOnboarding
      dismissPrePrompt={mockDismissPrePrompt}
      isVisible={isVisible}
      nativeOsPermissionEnabled={nativeOsPermissionEnabled}
      onComplete={mockOnComplete}
      onUserAnswered={mockOnUserAnswered}
      prePromptVariant={prePromptVariant}
    />,
    {
      state: {
        security: {
          dataCollectionForMarketing: false,
        },
      },
    },
  );

const expectNotificationsOnToast = () => {
  expect(mockToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Notifications are on',
      description: "We'll send you transactions, price alerts, and updates.",
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    }),
  );
};

const expectInfoIcon = (startAccessory: React.ReactElement | undefined) => {
  expect(startAccessory?.type).toBe(IconAlert);
  expect(startAccessory?.props).toMatchObject({
    severity: IconAlertSeverity.Info,
    size: IconSize.Lg,
  });
};

const expectNotificationsOffToast = () => {
  expect(mockToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Notifications are off',
      description: 'Turn them on anytime in Settings → Notifications.',
      severity: ToastSeverity.Default,
      hasNoTimeout: false,
      showCloseButton: false,
    }),
  );
  const call = mockToast.mock.calls.find(
    ([options]) => options.title === 'Notifications are off',
  );
  expectInfoIcon(call?.[0].startAccessory as React.ReactElement | undefined);
};

const expectPersonalizedAlertsOnToast = () => {
  expect(mockToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Personalized alerts is on',
      description: 'Manage this anytime in Settings.',
      severity: ToastSeverity.Success,
      hasNoTimeout: false,
      showCloseButton: false,
    }),
  );
};

const expectPersonalizedAlertsOffToast = () => {
  expect(mockToast).toHaveBeenCalledWith(
    expect.objectContaining({
      title: 'Personalized alerts is off',
      description: 'Turn it on anytime in Settings.',
      severity: ToastSeverity.Default,
      hasNoTimeout: false,
      showCloseButton: false,
    }),
  );
  const call = mockToast.mock.calls.find(
    ([options]) => options.title === 'Personalized alerts is off',
  );
  expectInfoIcon(call?.[0].startAccessory as React.ReactElement | undefined);
};

describe('PushNotificationOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    mockEnableMarketingConsent.mockResolvedValue(undefined);
    mockOnUserAnswered.mockResolvedValue(undefined);
    mockRequestPushPermission.mockResolvedValue(false);
    mockIsPushPermissionPromptable.mockResolvedValue(true);
    mockCanOsPromptForPushPermission.mockReturnValue(true);
    mockRequestPushNotificationsPermission.mockResolvedValue(undefined);
    mockIdentifyMarketingConsent.mockResolvedValue(undefined);
    mockIdentifyPushNotificationsEnabled.mockResolvedValue(undefined);
  });

  it('records an impression without consuming the prompt', async () => {
    renderPushNotificationOnboarding();

    await waitFor(() => {
      expect(mockTrackPrePromptViewed).toHaveBeenCalledWith('push_permission');
    });
    expect(mockTrackPrePromptViewed).toHaveBeenCalledWith('push_permission');
    expect(mockOnUserAnswered).not.toHaveBeenCalled();
  });

  it('does not render or mark shown when not visible', () => {
    const { queryByTestId } = renderPushNotificationOnboarding({
      isVisible: false,
    });

    expect(queryByTestId('mock-push-permission-sheet')).toBeNull();
    expect(mockOnUserAnswered).not.toHaveBeenCalled();
  });

  it('records another impression when an unanswered presentation resumes', () => {
    const session = (isVisible: boolean) => (
      <PushNotificationOnboarding
        dismissPrePrompt={mockDismissPrePrompt}
        isVisible={isVisible}
        nativeOsPermissionEnabled={false}
        onComplete={mockOnComplete}
        onUserAnswered={mockOnUserAnswered}
        prePromptVariant="push_permission"
      />
    );
    const view = renderWithProvider(session(true));

    view.rerender(session(false));
    view.rerender(session(true));

    expect(mockTrackPrePromptViewed).toHaveBeenCalledTimes(2);
    expect(mockOnUserAnswered).not.toHaveBeenCalled();
    expect(mockOnComplete).not.toHaveBeenCalled();
  });

  it('requests OS permission, grants marketing consent, and starts background setup with push when Yes is pressed', async () => {
    mockRequestPushPermission.mockResolvedValue(true);
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'push_permission',
      'yes',
    );
    expect(mockTrackOsPromptShown).toHaveBeenCalledWith('push_permission');
    expect(mockTrackOsPromptResponse).toHaveBeenCalledWith(
      'push_permission',
      'allowed',
    );
    expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(true);
    expectNotificationsOnToast();
    expect(mockOnComplete.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnableNotificationsInBackground.mock.invocationCallOrder[0],
    );
    expect(mockOnUserAnswered.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnableMarketingConsent.mock.invocationCallOrder[0],
    );
  });

  it('starts background setup without push when OS permission is denied', async () => {
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(false);
    expect(mockTrackOsPromptResponse).toHaveBeenCalledWith(
      'push_permission',
      'denied',
    );
    expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(false);
    expectNotificationsOffToast();
  });

  it.each(['ios', 'android'] as const)(
    'skips the OS prompt and treats permission as denied on %s when native permission was previously denied',
    async (platform) => {
      Platform.OS = platform;
      mockIsPushPermissionPromptable.mockResolvedValue(false);
      const { getByTestId } = renderPushNotificationOnboarding();

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
      expect(mockRequestPushPermission).not.toHaveBeenCalled();
      expect(mockTrackOsPromptShown).not.toHaveBeenCalled();
      expect(mockTrackOsPromptResponse).not.toHaveBeenCalled();
      expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(false);
      expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(false);
      expectNotificationsOffToast();
    },
  );

  describe('when the OS cannot show a push permission dialog', () => {
    beforeEach(() => {
      Platform.OS = 'android';
      mockIsPushPermissionPromptable.mockResolvedValue(true);
      mockCanOsPromptForPushPermission.mockReturnValue(false);
    });

    it('routes to system settings instead of requesting permission', async () => {
      const { getByTestId } = renderPushNotificationOnboarding();

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockRequestPushNotificationsPermission).toHaveBeenCalledTimes(1);
      expect(mockRequestPushPermission).not.toHaveBeenCalled();
    });

    it('does not record an OS prompt response the user never gave', async () => {
      const { getByTestId } = renderPushNotificationOnboarding();

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockTrackOsPromptShown).not.toHaveBeenCalled();
      expect(mockTrackOsPromptResponse).not.toHaveBeenCalled();
    });

    it('still grants marketing consent and initializes preferences without push', async () => {
      const { getByTestId } = renderPushNotificationOnboarding();

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
      expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(false);
      expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(false);
    });

    it('suppresses the notifications-off toast that would contradict the settings prompt', async () => {
      const { getByTestId } = renderPushNotificationOnboarding();

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('does not route to settings when the OS permission is already granted', async () => {
      const { getByTestId } = renderPushNotificationOnboarding({
        nativeOsPermissionEnabled: true,
      });

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockRequestPushNotificationsPermission).not.toHaveBeenCalled();
      expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
      expectNotificationsOnToast();
    });

    it('does not route to settings when the state is not promptable at all', async () => {
      mockIsPushPermissionPromptable.mockResolvedValue(false);
      const { getByTestId } = renderPushNotificationOnboarding();

      fireEvent.press(getByTestId('mock-push-permission-yes'));

      await waitFor(() => {
        expect(mockOnComplete).toHaveBeenCalledWith('engage');
      });
      expect(mockRequestPushNotificationsPermission).not.toHaveBeenCalled();
      expect(mockRequestPushPermission).not.toHaveBeenCalled();
      expectNotificationsOffToast();
    });
  });

  it('requests OS permission normally when the OS can show a dialog', async () => {
    Platform.OS = 'android';
    mockCanOsPromptForPushPermission.mockReturnValue(true);
    mockRequestPushPermission.mockResolvedValue(true);
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockRequestPushNotificationsPermission).not.toHaveBeenCalled();
    expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    expect(mockTrackOsPromptResponse).toHaveBeenCalledWith(
      'push_permission',
      'allowed',
    );
  });

  it('keeps the pre-prompt pending until the OS prompt result resolves', async () => {
    let resolveRequestPushPermission: (isEnabled: boolean) => void = jest.fn();
    mockRequestPushPermission.mockReturnValue(
      new Promise((resolve) => {
        resolveRequestPushPermission = resolve;
      }),
    );
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    });
    expect(mockOnComplete).not.toHaveBeenCalled();
    expect(mockDismissPrePrompt).not.toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).not.toHaveBeenCalled();

    resolveRequestPushPermission(true);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
  });

  it('does not reopen an answered sheet when home returns during the permission request', async () => {
    let finish: (enabled: boolean) => void = () => undefined;
    mockRequestPushPermission.mockReturnValue(
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
    );
    const view = renderPushNotificationOnboarding();
    fireEvent.press(view.getByTestId('mock-push-permission-yes'));
    fireEvent.press(view.getByTestId('mock-push-permission-action-close'));
    await waitFor(() =>
      expect(mockRequestPushPermission).toHaveBeenCalledTimes(1),
    );

    const session = (isVisible: boolean) => (
      <PushNotificationOnboarding
        dismissPrePrompt={mockDismissPrePrompt}
        isVisible={isVisible}
        nativeOsPermissionEnabled={false}
        onComplete={mockOnComplete}
        onUserAnswered={mockOnUserAnswered}
        prePromptVariant="push_permission"
      />
    );
    view.rerender(session(false));
    view.rerender(session(true));

    expect(
      view.queryByTestId('mock-push-permission-sheet'),
    ).not.toBeOnTheScreen();
    expect(mockOnUserAnswered).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).not.toHaveBeenCalled();
    finish(true);
    await waitFor(() => expect(mockOnComplete).toHaveBeenCalledWith('engage'));
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
  });

  it('skips the OS permission request when native push is already enabled', async () => {
    const { getByTestId } = renderPushNotificationOnboarding({
      nativeOsPermissionEnabled: true,
    });

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockTrackOsPromptShown).not.toHaveBeenCalled();
    expect(mockTrackOsPromptResponse).not.toHaveBeenCalled();
    expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
    expectNotificationsOnToast();
  });

  it('does not request notifications when Not now is pressed', () => {
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-not-now'));

    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).not.toHaveBeenCalled();
    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).toHaveBeenCalledWith('dismiss');
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'push_permission',
      'not_now',
    );
    expectNotificationsOffToast();
  });

  it('sets marketing consent when the marketing prompt is confirmed', () => {
    const { getByTestId } = renderPushNotificationOnboarding({
      nativeOsPermissionEnabled: true,
      prePromptVariant: 'marketing_consent',
    });

    fireEvent.press(getByTestId('mock-marketing-consent-confirm'));

    expect(mockOnComplete).toHaveBeenCalledWith('engage');
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'marketing_consent',
      'confirm',
    );
    expectPersonalizedAlertsOnToast();
  });

  it('initializes notification preferences when the marketing prompt is confirmed', () => {
    const { getByTestId } = renderPushNotificationOnboarding({
      nativeOsPermissionEnabled: true,
      prePromptVariant: 'marketing_consent',
    });

    fireEvent.press(getByTestId('mock-marketing-consent-confirm'));

    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
  });

  it('does not register push when confirming the marketing prompt without OS permission', () => {
    const { getByTestId } = renderPushNotificationOnboarding({
      nativeOsPermissionEnabled: null,
      prePromptVariant: 'marketing_consent',
    });

    fireEvent.press(getByTestId('mock-marketing-consent-confirm'));

    // Preferences are still initialized, only push registration is skipped.
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(false);
  });

  it('does not enable marketing notifications when the marketing prompt is skipped', () => {
    const { getByTestId } = renderPushNotificationOnboarding({
      prePromptVariant: 'marketing_consent',
    });

    fireEvent.press(getByTestId('mock-marketing-consent-not-now'));

    expect(mockOnComplete).toHaveBeenCalledWith('dismiss');
    expect(mockEnableMarketingConsent).not.toHaveBeenCalled();
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'marketing_consent',
      'not_now',
    );
    expect(mockIdentifyMarketingConsent).toHaveBeenCalledWith(false);
    expectPersonalizedAlertsOffToast();
  });

  it('does not dismiss when the sheet closes for a pending button action', () => {
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-action-close'));

    expect(mockDismissPrePrompt).not.toHaveBeenCalled();
    expect(mockTrackPrePromptDismissed).not.toHaveBeenCalled();
  });

  it('dismisses when the sheet is closed directly', () => {
    const { getByTestId } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-dismiss'));

    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(mockOnComplete).toHaveBeenCalledWith('dismiss');
    expect(mockTrackPrePromptDismissed).toHaveBeenCalledWith('push_permission');
  });
});
