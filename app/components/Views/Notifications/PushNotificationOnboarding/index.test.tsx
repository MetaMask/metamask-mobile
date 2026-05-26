import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import PushNotificationOnboarding from '.';
import type { PushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';

const mockMarkPrePromptShown = jest.fn().mockResolvedValue(undefined);
const mockDismissPrePrompt = jest.fn();
const mockRequestPushPermission = jest.fn();
const mockEnableNotificationsInBackground = jest.fn();
const mockEnableMarketingConsent = jest.fn();
const mockShowToast = jest.fn();
const mockTrackPrePromptViewed = jest.fn();
const mockTrackPrePromptDismissed = jest.fn();
const mockTrackPrePromptButtonClicked = jest.fn();
const mockTrackOsPromptShown = jest.fn();
const mockTrackOsPromptResponse = jest.fn();
const mockIdentifyMarketingConsent = jest.fn();
const mockIdentifyPushNotificationsEnabled = jest.fn();
const mockOnComplete = jest.fn();

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

jest.mock('./NewUserSheet', () => ({
  __esModule: true,
  default: (props: {
    isVisible: boolean;
    onClose: (hasPendingAction?: boolean) => void;
    onYes: () => void;
    onNotNow: () => void;
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
            onPress: props.onYes,
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-push-permission-not-now',
            onPress: props.onNotNow,
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
            onPress: props.onConfirm,
          }),
          MockReact.createElement(MockPressable, {
            testID: 'mock-marketing-consent-not-now',
            onPress: props.onNotNow,
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
    <ToastContext.Provider
      value={{
        toastRef: {
          current: {
            showToast: mockShowToast,
            closeToast: jest.fn(),
          },
        },
      }}
    >
      <PushNotificationOnboarding
        dismissPrePrompt={mockDismissPrePrompt}
        isVisible={isVisible}
        markPrePromptShown={mockMarkPrePromptShown}
        nativeOsPermissionEnabled={nativeOsPermissionEnabled}
        onComplete={mockOnComplete}
        prePromptVariant={prePromptVariant}
      />
    </ToastContext.Provider>,
    {
      state: {
        security: {
          dataCollectionForMarketing: false,
        },
      },
    },
  );

const expectNotificationsOnToast = () => {
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Notifications are on', isBold: true }],
      descriptionOptions: {
        description: "We'll send you transactions, price alerts, and updates.",
      },
      startAccessory: expect.any(Object),
      customBottomOffset: expect.any(Number),
      hasNoTimeout: false,
    }),
  );
};

const expectNotificationsOffToast = () => {
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Notifications are off', isBold: true }],
      descriptionOptions: {
        description: 'Turn them on anytime in Settings → Notifications.',
      },
      startAccessory: expect.any(Object),
      customBottomOffset: expect.any(Number),
      hasNoTimeout: false,
    }),
  );
};

const expectPersonalizedAlertsOnToast = () => {
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Personalized alerts is on', isBold: true }],
      descriptionOptions: {
        description: 'Manage this anytime in Settings.',
      },
      startAccessory: expect.any(Object),
      customBottomOffset: expect.any(Number),
      hasNoTimeout: false,
    }),
  );
};

const expectPersonalizedAlertsOffToast = () => {
  expect(mockShowToast).toHaveBeenCalledWith(
    expect.objectContaining({
      variant: ToastVariants.Plain,
      labelOptions: [{ label: 'Personalized alerts is off', isBold: true }],
      descriptionOptions: {
        description: 'Turn it on anytime in Settings.',
      },
      startAccessory: expect.any(Object),
      customBottomOffset: expect.any(Number),
      hasNoTimeout: false,
    }),
  );
};

describe('PushNotificationOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnableMarketingConsent.mockResolvedValue(undefined);
    mockRequestPushPermission.mockResolvedValue(false);
    mockIdentifyMarketingConsent.mockResolvedValue(undefined);
    mockIdentifyPushNotificationsEnabled.mockResolvedValue(undefined);
  });

  it('marks the prompt as shown when the push permission sheet renders', async () => {
    renderPushNotificationOnboarding();

    await waitFor(() => {
      expect(mockMarkPrePromptShown).toHaveBeenCalledTimes(1);
    });
    expect(mockTrackPrePromptViewed).toHaveBeenCalledWith('push_permission');
  });

  it('does not render or mark shown when not visible', () => {
    const { queryByTestId } = renderPushNotificationOnboarding({
      isVisible: false,
    });

    expect(queryByTestId('mock-push-permission-sheet')).toBeNull();
    expect(mockMarkPrePromptShown).not.toHaveBeenCalled();
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
      prePromptVariant: 'marketing_consent',
    });

    fireEvent.press(getByTestId('mock-marketing-consent-confirm'));

    expect(mockOnComplete).toHaveBeenCalledWith('engage');
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).not.toHaveBeenCalled();
    expect(mockEnableMarketingConsent).toHaveBeenCalledTimes(1);
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'marketing_consent',
      'confirm',
    );
    expectPersonalizedAlertsOnToast();
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
