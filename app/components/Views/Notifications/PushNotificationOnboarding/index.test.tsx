import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { ToastContext } from '../../../../component-library/components/Toast';
import PushNotificationOnboarding from '.';
import type { PushPrePromptVariant } from '../../../../util/notifications/hooks/usePushPrePromptVariant';

const mockMarkPrePromptShown = jest.fn().mockResolvedValue(undefined);
const mockDismissPrePrompt = jest.fn();
const mockRequestPushPermission = jest.fn();
const mockEnableNotificationsInBackground = jest.fn();
const mockShowToast = jest.fn();
const mockTrackPrePromptViewed = jest.fn();
const mockTrackPrePromptDismissed = jest.fn();
const mockTrackPrePromptButtonClicked = jest.fn();
const mockTrackOsPromptShown = jest.fn();
const mockTrackOsPromptResponse = jest.fn();
const mockIdentifyPushNotificationsEnabled = jest.fn();
const mockIdentifyMarketingConsent = jest.fn();
const mockOnComplete = jest.fn();
const mockOnPendingActionStart = jest.fn();

jest.mock(
  '../../../../util/notifications/hooks/useEnableNotificationsFromPushPrePrompt',
  () => ({
    useEnableNotificationsFromPushPrePrompt: () => ({
      enableNotificationsInBackground: mockEnableNotificationsInBackground,
      requestPushPermission: mockRequestPushPermission,
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
      identifyPushNotificationsEnabled: mockIdentifyPushNotificationsEnabled,
      identifyMarketingConsent: mockIdentifyMarketingConsent,
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
  prePromptVariant = 'push_permission',
}: {
  isVisible?: boolean;
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
        onComplete={mockOnComplete}
        onPendingActionStart={mockOnPendingActionStart}
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

describe('PushNotificationOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestPushPermission.mockResolvedValue(false);
    mockIdentifyPushNotificationsEnabled.mockResolvedValue(undefined);
    mockIdentifyMarketingConsent.mockResolvedValue(undefined);
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
    const { getByTestId, store } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(true);
    expect(mockDismissPrePrompt).toHaveBeenCalledTimes(1);
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'push_permission',
      'yes',
    );
    expect(mockTrackOsPromptShown).toHaveBeenCalledWith('push_permission');
    expect(mockTrackOsPromptResponse).toHaveBeenCalledWith(
      'push_permission',
      'allowed',
    );
    expect(mockIdentifyMarketingConsent).toHaveBeenCalledWith(true);
    expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(true);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Notifications enabled' }],
      }),
    );
    expect(mockOnComplete.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnableNotificationsInBackground.mock.invocationCallOrder[0],
    );
  });

  it('starts background setup without push when OS permission is denied', async () => {
    const { getByTestId, store } = renderPushNotificationOnboarding();

    fireEvent.press(getByTestId('mock-push-permission-yes'));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith('engage');
    });
    expect(mockRequestPushPermission).toHaveBeenCalledTimes(1);
    expect(mockEnableNotificationsInBackground).toHaveBeenCalledWith(false);
    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    expect(mockTrackOsPromptResponse).toHaveBeenCalledWith(
      'push_permission',
      'denied',
    );
    expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label:
              'You can enable notifications any time in Settings > Notifications',
          },
        ],
      }),
    );
  });

  it('keeps the startup surface unresolved until the OS prompt result resolves', async () => {
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
    expect(mockOnPendingActionStart).toHaveBeenCalledWith('push_permission');
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
    expect(mockIdentifyPushNotificationsEnabled).toHaveBeenCalledWith(false);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label:
              'You can enable notifications any time in Settings > Notifications',
          },
        ],
      }),
    );
  });

  it('sets marketing consent when the marketing prompt is confirmed', () => {
    const { getByTestId, store } = renderPushNotificationOnboarding({
      prePromptVariant: 'marketing_consent',
    });

    fireEvent.press(getByTestId('mock-marketing-consent-confirm'));

    expect(store.getState().security.dataCollectionForMarketing).toBe(true);
    expect(mockOnComplete).toHaveBeenCalledWith('engage');
    expect(mockRequestPushPermission).not.toHaveBeenCalled();
    expect(mockEnableNotificationsInBackground).not.toHaveBeenCalled();
    expect(mockTrackPrePromptButtonClicked).toHaveBeenCalledWith(
      'marketing_consent',
      'confirm',
    );
    expect(mockIdentifyMarketingConsent).toHaveBeenCalledWith(true);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Personalized updates enabled' }],
      }),
    );
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
